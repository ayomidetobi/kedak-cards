import type { CardFinish } from '../types/card'

export interface CollectionProduct {
  finish: CardFinish
  description: string
}

/**
 * Marketing copy per finish. Which finishes exist, their prices and stock come from the API
 * (GET /finishes); this file only holds presentation text.
 */
export const finishDescriptions: Record<CardFinish, string> = {
  Silver: 'Quiet confidence. Brushed precision.',
  Black: 'Understated. Unmistakable.',
  Gold: 'A warmer take on everyday luxury.',
  Signature: 'A distinctive finish. Your personal mark.',
}

export function collectionProduct(finish: CardFinish): CollectionProduct {
  return { finish, description: finishDescriptions[finish] }
}
