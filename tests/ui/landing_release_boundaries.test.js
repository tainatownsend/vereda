import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const main = readFileSync('src/main.jsx', 'utf8')
const focus = readFileSync('src/focus.css', 'utf8')
const mobile = readFileSync('src/landing-mobile.css', 'utf8')

describe('public landing release boundaries', () => {
  it('loads accessibility and narrow-mobile safeguards after Tailwind app styles', () => {
    const indexPosition = main.indexOf("import './index.css'")
    const focusPosition = main.indexOf("import './focus.css'")
    const mobilePosition = main.indexOf("import './landing-mobile.css'")

    expect(indexPosition).toBeGreaterThan(-1)
    expect(focusPosition).toBeGreaterThan(indexPosition)
    expect(mobilePosition).toBeGreaterThan(focusPosition)
  })

  it('keeps a production-visible focus ring outside Tailwind layers', () => {
    expect(focus).toContain(':focus-visible')
    expect(focus).toContain('outline: 3px solid var(--ves-focus)')
    expect(focus).toContain('outline-offset: 3px')
    expect(focus).not.toContain('@layer')
  })

  it('compacts the public header before common narrow-phone widths overflow', () => {
    expect(mobile).toContain('@media (max-width: 419px)')
    expect(mobile).toContain('white-space: nowrap')
    expect(mobile).toContain('font-size: 0.75rem')
    expect(mobile).toContain('@media (max-width: 389px)')
    expect(mobile).toContain('> header .ves-container > a > div')
  })
})
