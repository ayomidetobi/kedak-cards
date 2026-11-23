export type CardCategory = 'Sport' | 'Cars' | 'Anime' | 'Love' | 'Nature'
export type CardFinish = 'Silver' | 'Black' | 'Gold' | 'Signature'
export type EngravingStyle = 'name' | 'monogram'
export type ArtworkAssignment = 'shared' | 'per-card'
export type CustomizationMode = 'preset' | 'custom'
/** How an uploaded image is turned on the (landscape) card: as uploaded, or sideways. */
export type UploadOrientation = 'landscape' | 'portrait'
/** Where an uploaded image sits: the artwork spot ('default') or the whole card ('cover'). */
export type UploadDisplay = 'default' | 'cover'

/** Server limits for one cart line and for the whole cart (abuse protection). */
export const MAX_ITEM_QUANTITY = 20
export const MAX_CART_ITEMS = 20

export interface CardDesign {
  id: string
  name: string
  category: CardCategory
  number: string
  /** Monochrome SVG artwork served by the API. Absent only for decorative placeholders. */
  artworkUrl?: string
}

/** A customer image stored by POST /uploads/artwork. */
export interface UploadedArtwork {
  /** Server id, sent back as `uploadedArtworkIds` at checkout. */
  id: string
  name: string
  size: number
  type: 'image/png' | 'image/jpeg' | 'image/webp'
  /** Signed, short-lived URL from the API. */
  url: string
  /** Local object URL of the original file for instant previews (this tab only). */
  previewUrl?: string
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
  /** Contactless payment add-on (priced per card by the server). */
  contactless: boolean
  /** Optional extra instructions for the production team. */
  notes: string
}

/** Longest note the server accepts. */
export const MAX_NOTES_LENGTH = 500

export interface CardCartItem {
  id: string
  finish: CardFinish
  quantity: number
  customization: CardCustomization | null
}
