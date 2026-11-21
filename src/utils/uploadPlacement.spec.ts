import { describe, expect, it } from 'vitest'
import { uploadPlacement } from './uploadPlacement'

describe('uploadPlacement', () => {
  it.each([
    ['landscape', 'default', 'slot'],
    ['portrait', 'default', 'slot-rotated'],
    ['landscape', 'cover', 'cover'],
    ['portrait', 'cover', 'cover-rotated'],
  ] as const)('%s + %s → %s', (orientation, display, expected) => {
    expect(uploadPlacement(orientation, display)).toBe(expected)
  })
})
