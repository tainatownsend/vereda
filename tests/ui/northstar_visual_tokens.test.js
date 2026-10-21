import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/index.css', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')

describe('approved North Star visual system (phase 1)', () => {
  it('retains the five explicit approved palette values', () => {
    const expected = ['#3E5B3F', '#7A8F6B', '#D4A85A', '#F8F4EA', '#E9E1D4']
    expected.forEach(color => expect(css).toContain(color))
  })
  it('ships Playfair headings, Lora reading, and Inter interface typography', () => {
    expect(css).toContain('family=Playfair+Display')
    expect(css).toContain('family=Lora:')
    expect(css).toContain('family=Inter:')
    expect(css).toContain("font-family: 'Playfair Display', Georgia, serif;")
    expect(css).toContain("font-family: 'Lora', Georgia, serif;")
  })
  it('scopes the redesign to canonical app screens rather than login/landing', () => {
    expect(css).toContain('.northstar-page [class~="font-display"]')
    expect(css).toContain('.northstar-reader-page [class~="font-display"]')
    expect(css).toContain('.northstar-reader-page article[class~="font-display"]')
    expect(reader).toContain('className="northstar-reader-page min-h-screen')
  })
})
