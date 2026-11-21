import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { artworkCategories, artworkLibrary } from './artwork'

// Tests run from the project root (jsdom's import.meta.url isn't a file: URL).
const artworkRoot = join(process.cwd(), 'src', 'assets', 'artwork')
const FORBIDDEN_ELEMENTS = [
  'script',
  'image',
  'style',
  'foreignObject',
  'linearGradient',
  'radialGradient',
  'filter',
  'pattern',
  'use',
]
const ALLOWED_PAINT = new Set(['#111111', 'none'])
// Shapes that enclose an area (a <line> can't be filled, so it's excluded).
const SHAPES = ['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline']

const svgFiles = artworkCategories.flatMap((category) => {
  const folder = category.toLowerCase()
  return readdirSync(join(artworkRoot, folder))
    .filter((file) => file.endsWith('.svg'))
    .map((file) => ({
      category,
      label: `${folder}/${file}`,
      path: join(artworkRoot, folder, file),
    }))
})

describe('artwork library', () => {
  it('has 10 numbered, named designs in each of the five categories', () => {
    expect(Object.keys(artworkLibrary)).toEqual([...artworkCategories])
    for (const category of artworkCategories) {
      const designs = artworkLibrary[category]
      expect(designs, category).toHaveLength(10)
      expect(designs.map((design) => design.number)).toEqual(
        Array.from({ length: 10 }, (_, index) => String(index + 1).padStart(2, '0')),
      )
      for (const design of designs) {
        expect(design.id).toBe(`${category.toLowerCase()}-${design.number}`)
        expect(design.name.length).toBeGreaterThan(2)
        expect(design.artworkUrl).toBeTruthy()
      }
    }
  })

  it.each(svgFiles)('$label is a valid transparent monochrome 120×120 SVG', ({ path }) => {
    const source = readFileSync(path, 'utf8')
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
    expect(doc.getElementsByTagName('parsererror'), 'well-formed XML').toHaveLength(0)

    const root = doc.documentElement
    expect(root.tagName).toBe('svg')
    expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(root.getAttribute('viewBox')).toBe('0 0 120 120')

    const elements = [root, ...Array.from(root.getElementsByTagName('*'))]
    for (const element of elements) {
      expect(FORBIDDEN_ELEMENTS, `<${element.tagName}> not allowed`).not.toContain(element.tagName)
      for (const attribute of ['class', 'style', 'opacity', 'fill-opacity', 'stroke-opacity']) {
        expect(element.hasAttribute(attribute), `${attribute} on <${element.tagName}>`).toBe(false)
      }
      for (const paint of ['fill', 'stroke']) {
        const value = element.getAttribute(paint)
        if (value !== null) {
          expect(ALLOWED_PAINT.has(value.toLowerCase()), `${paint}="${value}"`).toBe(true)
        }
      }
      // SVG fills shapes solid black by default, so every shape must set its fill explicitly
      // (on itself or an ancestor <g>); otherwise an outline silently becomes a black blob.
      if (SHAPES.includes(element.tagName)) {
        let node: Element | null = element
        while (node && !node.hasAttribute('fill')) node = node.parentElement
        expect(node, `<${element.tagName}> has no explicit fill`).not.toBeNull()
      }
      // No full-canvas background shapes: the artwork must stay transparent.
      if (element.tagName === 'rect') {
        const width = Number(element.getAttribute('width') ?? 0)
        const height = Number(element.getAttribute('height') ?? 0)
        expect(width >= 110 && height >= 110, 'background rect').toBe(false)
      }
    }
  })
})
