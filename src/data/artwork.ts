import type { CardCategory, CardDesign } from '../types/card'

/**
 * Artwork library.
 *
 * Every SVG in `src/assets/artwork/<category>/NN-name-of-design.svg` becomes a selectable
 * design: `NN` is its order/number and the file name becomes its display name
 * ("03-championship-trophy.svg" → "Championship Trophy"). To add, replace or remove artwork,
 * just change the files — no code changes needed.
 *
 * Artwork rules (checked by artwork.spec.ts): 120×120 viewBox, transparent background, and
 * #111111 as the only colour. The same file is shown black-on-white in thumbnails and is used
 * as a mask on the card preview, so it renders in the card's engraving colour.
 */

/** Tab order in the customiser; the first category is the default selection. */
export const artworkCategories = [
  'Sport',
  'Cars',
  'Anime',
  'Love',
  'Nature',
] as const satisfies readonly CardCategory[]

export const defaultArtworkCategory: CardCategory = artworkCategories[0]

const artworkFiles = import.meta.glob<string>('../assets/artwork/*/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const FILE_PATTERN = /\/([a-z]+)\/(\d{2})-([a-z0-9-]+)\.svg$/

function titleCase(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function buildLibrary(): Record<CardCategory, CardDesign[]> {
  const library = Object.fromEntries(
    artworkCategories.map((category) => [category, [] as CardDesign[]]),
  ) as Record<CardCategory, CardDesign[]>

  for (const [path, url] of Object.entries(artworkFiles).sort(([a], [b]) => a.localeCompare(b))) {
    const match = FILE_PATTERN.exec(path)
    if (!match) continue
    const [, folder, number, slug] = match as unknown as [string, string, string, string]
    const category = artworkCategories.find((name) => name.toLowerCase() === folder)
    if (!category) continue
    library[category].push({
      id: `${folder}-${number}`,
      name: titleCase(slug),
      category,
      number,
      artworkUrl: url,
    })
  }

  return library
}

export const artworkLibrary = buildLibrary()
