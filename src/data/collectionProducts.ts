import type { CardFinish } from '../types/card'

export interface CollectionProduct {
  finish: CardFinish
  description: string
}

export const collectionProducts: readonly CollectionProduct[] = [
  { finish: 'Silver', description: 'Quiet confidence. Brushed precision.' },
  { finish: 'Black', description: 'Understated. Unmistakable.' },
  { finish: 'Gold', description: 'A warmer take on everyday luxury.' },
  { finish: 'Signature', description: 'A distinctive finish. Your personal mark.' },
]
