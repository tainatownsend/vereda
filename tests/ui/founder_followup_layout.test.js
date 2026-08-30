import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landing = readFileSync('src/pages/LandingPage.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')

describe('founder follow-up mobile layout', () => {
  it('keeps authentication actions in the hero instead of duplicating them in the header', () => {
    const header = landing.slice(landing.indexOf('<header'), landing.indexOf('</header>'))

    expect(header).not.toContain('/entrar')
    expect(header).not.toContain('primaryHref')
    expect(landing).toContain('Já tenho uma conta')
    expect(landing).toContain("const primaryLabel = user ? 'Abrir o Vereda' : 'Criar conta'")
  })

  it('centers mobile benefit chips and removes the artificial hero-panel gap', () => {
    expect(landing).toContain('flex flex-wrap justify-center gap-2 text-center')
    expect(landing).toContain('relative z-10 flex flex-col gap-6')
    expect(landing).not.toContain('min-h-[390px]')
    expect(landing).not.toContain('mt-20 max-w-md')
  })

  it('places quick actions between the daily quote and reading continuation', () => {
    const quoteIndex = home.indexOf('A maior caridade que podemos fazer')
    const actionsIndex = home.indexOf('<QuickActions navigate={navigate} />')
    const continuationIndex = home.indexOf("{primaryBook ? (")

    expect(quoteIndex).toBeGreaterThan(-1)
    expect(actionsIndex).toBeGreaterThan(quoteIndex)
    expect(continuationIndex).toBeGreaterThan(actionsIndex)
  })

  it('uses corner arrows for previous and next reading navigation', () => {
    expect(reader).toContain('grid-cols-[2.75rem_1fr_2.75rem]')
    expect(reader).toContain('justify-self-start disabled:opacity-25')
    expect(reader).toContain('justify-self-end disabled:opacity-35')
    expect(reader).not.toContain('> Anterior')
    expect(reader).not.toContain('{primaryAction.label}')
  })
})
