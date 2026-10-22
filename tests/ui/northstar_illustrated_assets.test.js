import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/index.css', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const image = readFileSync('public/art/northstar-illustrated-landscape.svg', 'utf8')
const logo = readFileSync('public/art/northstar-vereda-mark.svg', 'utf8')
const jasmine = readFileSync('public/art/northstar-jasmine-corner.svg', 'utf8')

describe('North Star original illustration assets', () => {
  it('uses the independent scenic SVG on Home and Reflections instead of a blurry crop', () => {
    const scenic = css.slice(css.lastIndexOf('.northstar-page .northstar-scenery {'))
    expect(scenic).toContain("url('/art/northstar-illustrated-landscape.svg')")
    expect(scenic).not.toContain("url('/art/vereda-valley-northstar.webp')")
    expect(image).toContain('viewBox="0 0 1600 820"')
    expect(image).toContain('Amanhecer botânico Vereda')
  })

  it('keeps artwork standalone and self-contained with no remote content or scripts', () => {
    for (const asset of [image, logo, jasmine]) {
      expect(asset).toContain('<svg')
      expect(asset).toContain('</svg>')
      expect(asset).not.toMatch(/<script|<foreignObject|<iframe|<image[^>]+href=/i)
      expect(asset).not.toMatch(/(?:href|src)=["']https?:\/\//i)
    }
  })

  it('includes distinct botanical marks and foreground floral content', () => {
    expect((image.match(/<ellipse/g) || []).length).toBeGreaterThan(90)
    expect((image.match(/<circle/g) || []).length).toBeGreaterThan(25)
    expect(image.length).toBeLessThan(250000)
    expect(logo).toContain('Sol dourado') // descriptive icon, not unlabeled decoration
    expect(jasmine).toContain('Ramos floridos Vereda')
    expect(home).toContain('/art/northstar-vereda-mark.svg')
    expect(css).toContain('/art/northstar-jasmine-corner.svg')
  })
})
