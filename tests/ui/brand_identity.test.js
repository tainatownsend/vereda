import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/index.css', 'utf8')
const logo = readFileSync('public/vereda-logo-mark.svg', 'utf8')
const maskableLogo = readFileSync('public/vereda-logo-maskable.svg', 'utf8')
const viteConfig = readFileSync('vite.config.js', 'utf8')

describe('Vereda North Star identity contract', () => {
  it('keeps the approved core colors and typography', () => {
    expect(css).toContain('--ves-canvas: #F6F7F4')
    expect(css).toContain('--ves-focus: #6F8F6F')
    expect(css).toContain('--ves-accent: #A7B8A1')
    expect(css).toContain('family=Inter')
    expect(css).toContain('family=Literata')
  })

  it('keeps the approved horizon, path and branch logo', () => {
    expect(logo).toContain('Um caminho entre colinas iluminadas pelo nascer do sol')
    expect(logo).toContain('stroke="#4F6757"')
    expect(logo).toContain('fill="#E7B977"')
    expect(maskableLogo).toContain('Ícone instalável do Vereda')
  })

  it('keeps PWA theme and install icons aligned with the brand', () => {
    expect(viteConfig).toContain("background_color: '#F6F7F4'")
    expect(viteConfig).toContain("theme_color: '#6F8F6F'")
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
