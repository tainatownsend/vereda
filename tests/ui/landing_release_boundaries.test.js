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

  it('keeps a production-visible focus indicator outside Tailwind layers', () => {
    expect(focus).toContain(':focus-visible')
    expect(focus).toContain('outline-style: solid !important')
    expect(focus).toContain('outline-width: 3px !important')
    expect(focus).toContain('outline-color: var(--ves-focus) !important')
    expect(focus).toContain('outline-offset: 3px !important')
    expect(focus).toContain('box-shadow: 0 0 0 3px var(--ves-focus) !important')
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
