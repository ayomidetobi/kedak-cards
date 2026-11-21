import { CANCELLABLE_STATUSES, CANCEL_REASONS, REFUND_WINDOW_DAYS } from '../utils/orderPolicy'
import { orderStatusMeta } from '../utils/orderStatus'
import { legal } from './legal'

/**
 * Policy page content. The refund policy is built from the same values the order flows enforce
 * (src/utils/orderPolicy.ts), so the published policy and the app's behaviour can't drift apart.
 */
export interface PolicySection {
  id: string
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface Policy {
  slug: 'refunds' | 'privacy'
  title: string
  eyebrow: string
  summary: string
  sections: PolicySection[]
}

const weeks = Math.round(REFUND_WINDOW_DAYS / 7)
const cancellableStages = CANCELLABLE_STATUSES.map((status) =>
  orderStatusMeta[status].label.toLowerCase(),
).join(', ')

export const refundPolicy: Policy = {
  slug: 'refunds',
  title: 'Refund & cancellation policy',
  eyebrow: 'POLICIES / REFUNDS',
  summary: `Cancel for a full refund until we start converting your card. After confirmed delivery, you have ${REFUND_WINDOW_DAYS} days (${weeks} weeks) to request a refund. We can’t refund after that.`,
  sections: [
    {
      id: 'cancelling',
      heading: 'Cancelling an order',
      paragraphs: [
        `You can cancel your order for a full refund at any point before conversion starts — while your order is at one of these stages: ${cancellableStages}.`,
        'Once conversion has started, your original card is being physically modified, so the order can no longer be cancelled.',
      ],
      bullets: [
        'If we already hold your original card, we return it to you with tracked delivery at no cost.',
        'If your card is in the post when you cancel, we return it when it arrives.',
        'Your saved design is discarded; you can place a new order at any time.',
      ],
    },
    {
      id: 'refunds',
      heading: `Refunds after delivery (within ${weeks} weeks)`,
      paragraphs: [
        `You can request a refund within ${REFUND_WINDOW_DAYS} days (${weeks} weeks) of confirmed delivery — the date our courier confirms your card was delivered.`,
        `We can’t accept refund requests more than ${REFUND_WINDOW_DAYS} days after confirmed delivery.`,
        'Common reasons for a refund include:',
      ],
      bullets: [
        'The card doesn’t work for payments.',
        'There’s a problem with the engraving.',
        'The card arrived damaged.',
        'It isn’t what you expected.',
      ],
    },
    {
      id: 'how-refunds-work',
      heading: 'How a refund works',
      bullets: [
        'Request a refund from your order page (signed in, or using your order reference and email).',
        'We email return instructions and a prepaid label for the metal card.',
        'We inspect the returned card. Refunds are up to the full order amount, depending on the outcome of the inspection.',
        'Approved refunds are paid to your original payment method.',
      ],
    },
    {
      id: 'how-to-cancel',
      heading: 'How to cancel or request a refund',
      paragraphs: [
        'Open your order — from your account, or with “Find your order” using your order reference and checkout email — and choose Cancel order or Request refund. We’ll ask for a reason so we can help, for example:',
      ],
      bullets: CANCEL_REASONS.slice(0, 3).map((reason) => `“${reason}”`),
    },
    {
      id: 'your-rights',
      heading: 'Your statutory rights',
      paragraphs: [
        'This policy doesn’t affect your statutory rights. Because each card is personalised and made from your own card, some cancellation rights that apply to standard goods may not apply once conversion has started.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [
        `Questions about a cancellation or refund? Email ${legal.contactEmail} and quote your order reference. We will never ask for your PIN, CVV or full card number.`,
      ],
    },
  ],
}

export const privacyPolicy: Policy = {
  slug: 'privacy',
  title: 'Privacy policy',
  eyebrow: 'POLICIES / PRIVACY',
  summary:
    'We collect only what we need to make, deliver and support your card. We never ask for — or store — your PIN, CVV or full card number.',
  sections: [
    {
      id: 'who-we-are',
      heading: 'Who we are',
      paragraphs: [
        `${legal.companyName} (company number ${legal.companyNumber}), ${legal.registeredAddress}, is responsible for the personal information described here.`,
      ],
    },
    {
      id: 'what-we-collect',
      heading: 'What we collect',
      bullets: [
        'Contact details: your name, email address and phone number.',
        'Delivery details: the return address for your finished card.',
        'Your design: the cardholder name to engrave, your chosen artwork, and any images you upload.',
        'Compatibility answers: your card’s country of issue, network and type — never card numbers.',
        'Account details, if you create one: your name, email and how you sign in (email or Google).',
        'Order history: what you ordered, its progress, and any cancellation or refund requests.',
      ],
    },
    {
      id: 'what-we-never-collect',
      heading: 'What we never collect',
      paragraphs: [
        'We never ask for your PIN, CVV/security code, full card number or online banking login. Card payments are handled by our payment provider; we don’t see or store your payment card details.',
      ],
    },
    {
      id: 'how-we-use-it',
      heading: 'How we use your information',
      bullets: [
        'To make, convert, quality-check and return your card.',
        'To send order updates, send-in guides and delivery tracking.',
        'To handle cancellations, refunds and support requests.',
        'To keep our service secure and prevent fraud.',
      ],
    },
    {
      id: 'sharing',
      heading: 'Who we share it with',
      paragraphs: [
        'Only the providers who help us run the service — such as our payment provider, delivery couriers and hosting — and only what they need. We don’t sell your personal information.',
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      paragraphs: [
        'We keep order records for as long as needed to provide the service, handle refunds and meet legal and accounting obligations. Uploaded artwork is used only for your order.',
      ],
    },
    {
      id: 'on-your-device',
      heading: 'Information stored on your device',
      paragraphs: [
        'Our site stores a few things in your browser so it works properly: your light or dark theme choice, your sign-in session, and orders you can access. You can clear these at any time in your browser settings.',
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your rights',
      bullets: [
        'Ask for a copy of the personal information we hold about you.',
        'Ask us to correct or delete your information.',
        'Object to or restrict how we use it.',
        'Complain to your data protection regulator.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`For privacy questions or requests, email ${legal.privacyEmail}.`],
    },
  ],
}

export const policies = { refunds: refundPolicy, privacy: privacyPolicy } as const
