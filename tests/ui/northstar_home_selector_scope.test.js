import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/index.css', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')

describe('Home North Star CSS scope', () => {
  it('targets the single Home root that owns both northstar-page and northstar-home', () => {
    expect(home).toContain('className="northstar-page northstar-home')
    expect(css).not.toMatch(/\.northstar-page\s+\.northstar-home\b/)
    expect(css).toContain('.northstar-page.northstar-home .home-welcome')
    expect(css).toContain('.northstar-page.northstar-home .home-greeting')
  })
  it('applies the original standalone flowers and mark to this actual root', () => {
    expect(home).toContain('/art/northstar-vereda-mark.svg')
    expect(css).toContain('.northstar-page.northstar-home .northstar-branch-art')
    expect(css).toContain("url('/art/northstar-jasmine-corner.svg')")
    expect(css).toContain('.northstar-page.northstar-home .home-reflection blockquote')
  })
})
