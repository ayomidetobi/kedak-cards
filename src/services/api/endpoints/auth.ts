import { api } from '../client'
import type { LoginRequest, Session, SignupRequest, User } from '../../../types/api'

/**
 * Auth endpoints (dj-rest-auth + django-allauth behind the contract).
 * Session JWTs arrive as HTTP-only cookies; the `accessToken` in the body is ignored on purpose
 * so it is never kept in JavaScript-accessible storage.
 */
export async function signUp(payload: SignupRequest): Promise<User> {
  const { data } = await api.post<Session>('/auth/signup', payload)
  return data.user
}

export async function logIn(payload: LoginRequest): Promise<User> {
  const { data } = await api.post<Session>('/auth/login', payload)
  return data.user
}

export async function signInWithGoogle(idToken: string): Promise<User> {
  const { data } = await api.post<Session>('/auth/google', { idToken })
  return data.user
}

export async function logOut(): Promise<void> {
  await api.post('/auth/logout')
}

export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const { data } = await api.get<User>('/auth/me', { signal })
  return data
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password/reset', { email })
}

export async function confirmPasswordReset(payload: {
  uid: string
  token: string
  newPassword: string
}): Promise<void> {
  await api.post('/auth/password/reset/confirm', {
    uid: payload.uid,
    token: payload.token,
    new_password1: payload.newPassword,
    new_password2: payload.newPassword,
  })
}

/** Documented addition: PATCH /auth/me changes the display name. */
export async function updateProfile(payload: { name: string }): Promise<User> {
  const { data } = await api.patch<User>('/auth/me', payload)
  return data
}

export async function changePassword(payload: {
  oldPassword: string
  newPassword: string
}): Promise<void> {
  await api.post('/auth/password/change', {
    old_password: payload.oldPassword,
    new_password1: payload.newPassword,
    new_password2: payload.newPassword,
  })
}

export async function verifyEmail(key: string): Promise<void> {
  await api.post('/auth/email/verify', { key })
}

export async function resendVerificationEmail(email: string): Promise<void> {
  await api.post('/auth/email/resend', { email })
}
