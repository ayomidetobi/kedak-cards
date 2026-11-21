export type CardCategory = 'Sport' | 'Cars' | 'Anime' | 'Love' | 'Nature'
export type CardFinish = 'Silver' | 'Black' | 'Gold' | 'Signature'
export type EngravingStyle = 'name' | 'monogram'
export type ArtworkAssignment = 'shared' | 'per-card'
export type CustomizationMode = 'preset' | 'custom'
/** How an uploaded image is turned on the (landscape) card: as uploaded, or sideways. */
export type UploadOrientation = 'landscape' | 'portrait'
/** Where an uploaded image sits: the artwork spot ('default') or the whole card ('cover'). */
export type UploadDisplay = 'default' | 'cover'

export interface CardDesign {
  id: string
  name: string
  category: CardCategory
  number: string
  /** Monochrome SVG artwork (see src/data/artwork.ts). Absent for placeholder designs. */
  artworkUrl?: string
}

export interface UploadedArtwork {
  name: string
  size: number
  type: 'image/png' | 'image/jpeg' | 'image/webp'
  url: string
}

export interface CardCustomization {
  category: CardCategory
  designId: string
  customizationMode: CustomizationMode
  finish: CardFinish
  engravingStyle: EngravingStyle
  holderName: string
  uploadedArtwork: UploadedArtwork | null
  uploadedArtworks: UploadedArtwork[]
  artworkAssignment: ArtworkAssignment
  uploadOrientation: UploadOrientation
  uploadDisplay: UploadDisplay
  price: number
}

export interface CardCartItem {
  id: string
  finish: CardFinish
  quantity: number
  customization: CardCustomization | null
}

export interface CompatibilityAnswers {
  country: string
  network: string
  cardType: string
  hasChip: boolean
  acknowledged: boolean
}
