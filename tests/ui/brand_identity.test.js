import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/index.css', 'utf8')
const logo = readFileSync('public/vereda-logo-mark.svg', 'utf8')
const viteConfig = readFileSync('vite.config.js', 'utf8')

describe('Caminho de Luz identity contract', () => {
  it('keeps the approved core colors and typography', () => {
    expect(css).toContain('--ves-canvas: #F8F4EE')
    expect(css).toContain('--ves-focus: #6D8B74')
    expect(css).toContain('--ves-accent: #C98C6B')
    expect(css).toContain("family=Inter")
    expect(css).toContain("family=Lora")
  })

  it('keeps the approved horizon, path and branch logo', () => {
    expect(logo).toContain('Um caminho entre colinas iluminadas pelo nascer do sol')
    expect(logo).toContain('stroke="#4F6757"')
    expect(logo).toContain('fill="#E7B977"')
  })

  it('keeps PWA theme colors aligned with the brand', () => {
    expect(viteConfig).toContain("background_color: '#F8F4EE'")
    expect(viteConfig).toContain("theme_color: '#4F6757'")
  })
})
