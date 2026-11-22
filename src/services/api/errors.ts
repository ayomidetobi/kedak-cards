import { isAxiosError, isCancel } from 'axios'
import type { Problem } from '../../types/api'

export interface FieldError {
  /** JSON Pointer into the request body, e.g. `/contact/email`. */
  pointer: string
  code?: string
  message: string
}

/**
 * Every failed API call is normalised to an ApiError carrying the RFC 9457 problem fields the
 * Django API returns (`code`, `detail`, `errors[]`), so views can show the server's message.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail: string
  readonly fieldErrors: FieldError[]
  readonly retryAfterSeconds: number | null

  constructor(init: {
    status: number
    code: string
    message: string
    detail?: string
    fieldErrors?: FieldError[]
    retryAfterSeconds?: number | null
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.detail = init.detail ?? ''
    this.fieldErrors = init.fieldErrors ?? []
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
  }

  get isNetworkError() {
    return this.status === 0 && this.code === 'network_error'
  }

  get isCancelled() {
    return this.code === 'cancelled'
  }

  /** First server message for a pointer (exact match, or any pointer below it). */
  fieldError(pointer: string): string | undefined {
    return (
      this.fieldErrors.find((error) => error.pointer === pointer)?.message ??
      this.fieldErrors.find((error) => error.pointer.startsWith(`${pointer}/`))?.message
    )
  }
}

function isProblem(value: unknown): value is Problem {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Problem).status === 'number' &&
    typeof (value as Problem).code === 'string'
  )
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'That request wasn’t valid. Please check and try again.',
  401: 'Please sign in to continue.',
  403: 'You don’t have permission to do that.',
  404: 'We couldn’t find what you were looking for.',
  409: 'That can’t be done right now.',
  413: 'That file is too large.',
  415: 'That file type isn’t supported.',
  422: 'Some details need fixing.',
  429: 'Too many attempts. Please wait a moment and try again.',
}

function messageFor(status: number, problem?: Problem, fieldErrors: FieldError[] = []) {
  if (problem?.detail) return problem.detail
  if (status === 422 && fieldErrors.length === 1) return fieldErrors[0]!.message
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return STATUS_MESSAGES[status] ?? problem?.title ?? 'Something went wrong. Please try again.'
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isCancel(error)) {
    return new ApiError({ status: 0, code: 'cancelled', message: 'The request was cancelled.' })
  }
  if (isAxiosError(error)) {
    const response = error.response
    if (!response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return new ApiError({
        status: 0,
        code: timedOut ? 'timeout' : 'network_error',
        message: timedOut
          ? 'The server took too long to respond. Please try again.'
          : 'We couldn’t reach Kedak. Check your connection and try again.',
      })
    }
    const problem = isProblem(response.data) ? response.data : undefined
    const fieldErrors: FieldError[] = (problem?.errors ?? []).map((item) => ({
      pointer: item.pointer,
      code: item.code,
      message: item.message,
    }))
    const retryAfter = Number(response.headers?.['retry-after'])
    return new ApiError({
      status: response.status,
      code: problem?.code ?? `http_${response.status}`,
      message: messageFor(response.status, problem, fieldErrors),
      detail: problem?.detail,
      fieldErrors,
      retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null,
    })
  }
  return new ApiError({
    status: 0,
    code: 'unknown',
    message: error instanceof Error && error.message ? error.message : 'Something went wrong.',
  })
}

/** Customer-facing message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!error) return ''
  const apiError = toApiError(error)
  return apiError.message || fallback
}

/**
 * Maps server validation errors onto form field names, e.g.
 * `{ '/contact/email': 'email', '/deliveryAddress/city': 'city' }`.
 */
export function mapFieldErrors(error: unknown, pointers: Record<string, string>) {
  const mapped: Record<string, string> = {}
  if (!(error instanceof ApiError)) return mapped
  for (const fieldError of error.fieldErrors) {
    const field = pointers[fieldError.pointer]
    if (field && !mapped[field]) mapped[field] = fieldError.message
  }
  return mapped
}
