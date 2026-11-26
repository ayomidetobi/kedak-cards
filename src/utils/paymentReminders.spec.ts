import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paymentRemindersLabel } from './paymentReminders'

describe('paymentRemindersLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-26T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('says none were sent before the first reminder', () => {
    expect(paymentRemindersLabel({ sent: 0, lastSentAt: null })).toBe('None sent')
    expect(paymentRemindersLabel(null)).toBe('None sent')
  })

  it('shows the count and how long ago the last one went', () => {
    expect(paymentRemindersLabel({ sent: 1, lastSentAt: '2026-11-24T12:00:00Z' })).toBe(
      '1 sent, 2 days ago',
    )
    expect(paymentRemindersLabel({ sent: 2, lastSentAt: '2026-11-26T09:00:00Z' })).toBe(
      '2 sent, 3 hours ago',
    )
  })
})
