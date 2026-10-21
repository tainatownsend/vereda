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
    expect(css).toContain('--ves-accent: #A7B8A1')
    expect(css).toContain('family=Inter')
    expect(css).toContain('family=Literata')
  })

  it('uses the founder-approved sun and leaves mark consistently on screen and in the install icon', () => {
    expect(logo).toContain('viewBox="0 0 107 105"')
    expect(logo).toContain('fill="#59694e"')
    expect(logo).toContain('fill="#c5a25c"')
    expect(maskableLogo).toContain('Ícone instalável do Vereda')
    expect(maskableLogo).toContain('sol dourado sobre duas folhas verde-oliva')
    expect(maskableLogo).toContain('fill="#59694e"')
    expect(maskableLogo).toContain('fill="#c5a25c"')
    expect(maskableLogo).not.toContain('landscape-circle-maskable')
  })

  it('keeps PWA theme and install icons aligned with the brand', () => {
    expect(viteConfig).toContain("background_color: '#F5F0E7'")
    expect(viteConfig).toContain("theme_color: '#F5F0E7'")
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
