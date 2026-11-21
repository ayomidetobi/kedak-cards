import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { artworkCategories } from '../data/artwork'
import { finishes } from '../stores/cardCustomization'
import { CANCEL_REASONS, REFUND_REASONS, REFUND_WINDOW_DAYS } from '../utils/orderPolicy'
import { orderStatusMeta } from '../utils/orderStatus'

/**
 * Keeps public/api-docs/openapi.json valid and in step with the frontend: every $ref resolves,
 * operations are documented, and shared enums/rules match the app's own types and policy.
 */
const spec = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'api-docs', 'openapi.json'), 'utf8'),
) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const schemas = spec.components.schemas
const METHODS = ['get', 'post', 'put', 'patch', 'delete']

function collectRefs(node: unknown, refs: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((child) => collectRefs(child, refs))
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') refs.push(value)
      else collectRefs(value, refs)
    }
  }
  return refs
}

function resolve(ref: string) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], spec)
}

const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
  Object.entries(item as Record<string, any>) // eslint-disable-line @typescript-eslint/no-explicit-any
    .filter(([method]) => METHODS.includes(method))
    .map(([method, operation]) => ({ path, method, operation })),
)

describe('OpenAPI document', () => {
  it('is OpenAPI 3.1 with resolvable $refs', () => {
    expect(spec.openapi).toBe('3.1.0')
    const unresolved = collectRefs(spec).filter((ref) => resolve(ref) === undefined)
    expect(unresolved).toEqual([])
  })

  it('documents every operation with a unique operationId, a tag and responses', () => {
    const ids = operations.map(({ operation }) => operation.operationId)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
    for (const { path, method, operation } of operations) {
      expect(operation.tags?.length, `${method} ${path} tags`).toBeGreaterThan(0)
      expect(Object.keys(operation.responses ?? {}).length, `${method} ${path}`).toBeGreaterThan(0)
    }
    // Every {param} in a path is declared.
    for (const { path, operation } of operations) {
      const declared = (operation.parameters ?? []).map(
        (param: { $ref?: string; name?: string }) =>
          param.$ref ? (resolve(param.$ref) as { name: string }).name : param.name,
      )
      for (const [, name] of path.matchAll(/\{(\w+)\}/g)) {
        expect(declared, `${path} declares ${name}`).toContain(name)
      }
    }
  })

  it('uses the same enums as the frontend', () => {
    expect(schemas.CardCategory.enum).toEqual([...artworkCategories])
    expect(schemas.CardFinish.enum).toEqual(finishes.map((finish) => finish.name))
    expect(schemas.OrderStatus.enum).toEqual(Object.keys(orderStatusMeta))
    expect(schemas.CancelReason.enum).toEqual([...CANCEL_REASONS])
    expect(schemas.RefundReason.enum).toEqual([...REFUND_REASONS])
    expect(schemas.UploadOrientation.enum).toEqual(['landscape', 'portrait'])
    expect(schemas.UploadDisplay.enum).toEqual(['default', 'cover'])
  })

  it('states the same refund window and cancellation rule as the app', () => {
    const text = JSON.stringify(spec)
    expect(REFUND_WINDOW_DAYS).toBe(21)
    expect(text).toContain('within 21 days (3 weeks) of confirmed delivery')
    expect(spec.paths['/orders/{orderId}/cancellation'].post.description).toContain(
      '`awaiting-card`, `card-received` or `assessed`',
    )
  })
})
