import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(path, 'utf8')

describe('Vereda V1 vector illustration contract', () => {
  const covers = [
    'O Livro dos Espíritos',
    'O Livro dos Médiuns',
    'O Evangelho Segundo o Espiritismo',
    'O Céu e o Inferno',
    'A Gênese',
  ]

  it('provides five different accessible vector cover illustrations', () => {
    const files = covers.map((title, index) => {
      const xml = read(`public/art/covers/kardec-${index + 1}.svg`)
      expect(xml).toContain('<svg')
      expect(xml).toContain('viewBox="0 0 230 350"')
      expect(xml).toContain(`<title id="t">${title}</title>`)
      expect(xml).toContain('role="img"')
      expect(xml).toContain('</svg>')
      return xml
    })
    expect(new Set(files).size).toBe(5)
  })

  it('uses the responsive vector assets in book cards and both scenic surfaces', () => {
    const ui = read('src/components/northstar/NorthStarUI.jsx')
    const css = read('src/index.css')
    const landscape = read('public/art/vereda-valley.svg')
    const branch = read('public/art/botanical-sprig.svg')
    expect(ui).toContain('/art/covers/kardec-')
    expect(css).toContain('/art/vereda-valley.svg')
    expect(css).toContain('/art/botanical-sprig.svg')
    expect(css).not.toContain("background-image:url('/northstar-atlas.webp')")
    expect(landscape).toContain('viewBox="0 0 1600 680"')
    expect(branch).toContain('viewBox="0 0 260 410"')
  })
})
