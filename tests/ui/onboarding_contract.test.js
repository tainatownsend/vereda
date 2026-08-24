import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/pages/GettingStartedPage.jsx', 'utf8')

describe('guided first-step contract', () => {
  it('keeps onboarding intentionally short and explicit', () => {
    expect(source).toContain('passo {step} de 2')
    expect(source).toContain('Duas escolhas rápidas')
    expect(source).toContain('Vamos encontrar um primeiro caminho.')
  })

  it('keeps exploration available instead of gating content', () => {
    expect(source).toContain("route: '/descobrir'")
    expect(source).toContain("route: '/biblioteca'")
    expect(source).toContain('Nada fica bloqueado')
  })

  it('keeps the recommendation framed as orientation, not doctrine', () => {
    expect(source).toContain('Esta indicação só organiza seu primeiro passo')
    expect(source).toContain('A leitura da obra continua sendo a fonte principal')
  })
})
