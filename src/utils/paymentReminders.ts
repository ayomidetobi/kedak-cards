import type { OpsPaymentReminders } from '../services/api/endpoints/ops'
import { formatRelativeDate } from './people'
import { formatOrderDate } from './orderPolicy'

/** "1 sent, 2 days ago" for the ops order page; "None sent" before the first reminder. */
export function paymentRemindersLabel(reminders: OpsPaymentReminders | null | undefined) {
  if (!reminders || reminders.sent < 1) return 'None sent'
  const when = reminders.lastSentAt
    ? `, ${formatRelativeDate(reminders.lastSentAt, formatOrderDate)}`
    : ''
  return `${reminders.sent} sent${when}`
}
