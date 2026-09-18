import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/index.css', 'utf8')
const logo = readFileSync('public/vereda-logo-mark.svg', 'utf8')
const maskableLogo = readFileSync('public/vereda-logo-maskable.svg', 'utf8')
const viteConfig = readFileSync('vite.config.js', 'utf8')

describe('Vereda North Star identity contract', () => {
  it('keeps the approved core colors and typography', () => {
    expect(css).toContain('--ves-canvas: #F5F0E7')
    expect(css).toContain('--ves-focus: #53664E')
    expect(css).toContain('--ves-accent: #C5A15D')
    expect(css).toContain('family=Inter')
    expect(css).toContain('family=Literata')
  })

  it('keeps the approved leaf-and-sun brand mark', () => {
    expect(logo).toContain('Um sol dourado sobre duas folhas verdes.')
    expect(logo).toContain('stroke="#5E6D57"')
    expect(logo).toContain('radialGradient id="sun"')
    expect(maskableLogo).toContain('sol dourado e duas folhas verdes')
  })

  it('keeps PWA theme and install icons aligned with the brand', () => {
    expect(viteConfig).toContain("background_color: '#F5F0E7'")
    expect(viteConfig).toContain("theme_color: '#53664E'")
    expect(viteConfig).toContain("src: '/vereda-logo-mark.svg'")
    expect(viteConfig).toContain("src: '/vereda-logo-maskable.svg'")
    expect(viteConfig).not.toContain('vereda-icon-192x192.png')
    expect(viteConfig).not.toContain('vereda-icon-512x512.png')
  })

  it('does not keep obsolete pre-refresh install icons', () => {
    expect(existsSync('public/vereda-icon-192x192.png')).toBe(false)
    expect(existsSync('public/vereda-icon-512x512.png')).toBe(false)
    expect(existsSync('public/vereda-icon-maskable-512x512.png')).toBe(false)
  })
})
