import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landing = readFileSync('src/pages/LandingPage.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')

describe('founder follow-up responsive layout', () => {
  it('keeps the public header compact on mobile while adding useful desktop navigation', () => {
    const header = landing.slice(landing.indexOf('<header'), landing.indexOf('</header>'))

    expect(header).toContain('Navegação da apresentação')
    expect(header).toContain('lg:flex')
    expect(header).toContain('/entrar')
    expect(header).toContain('primaryHref')
    expect(landing).toContain('Já tenho uma conta')
    expect(landing).toContain("const primaryLabel = user ? 'Abrir o Vereda' : 'Criar conta'")
  })

  it('uses a bounded desktop hero without horizontal overflow', () => {
    expect(landing).toContain('overflow-x-hidden')
    expect(landing).toContain('max-w-[1180px]')
    expect(landing).toContain('lg:min-h-[650px]')
    expect(landing).toContain('lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]')
    expect(landing).not.toContain('mt-20 max-w-md')
  })

  it('makes the reading continuation the primary Home action before secondary paths', () => {
    const continuationIndex = home.indexOf("{primaryBook ? (")
    const actionsIndex = home.indexOf('<QuickActions navigate={navigate} />')
    const quoteIndex = home.indexOf('A maior caridade que podemos fazer')

    expect(continuationIndex).toBeGreaterThan(-1)
    expect(actionsIndex).toBeGreaterThan(continuationIndex)
    expect(quoteIndex).toBeGreaterThan(actionsIndex)
  })

  it('uses corner arrows for previous and next reading navigation', () => {
    expect(reader).toContain('grid-cols-[2.75rem_1fr_2.75rem]')
    expect(reader).toContain('justify-self-start disabled:opacity-25')
    expect(reader).toContain('justify-self-end disabled:opacity-35')
    expect(reader).not.toContain('> Anterior')
    expect(reader).not.toContain('{primaryAction.label}')
  })
})
