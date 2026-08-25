import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/pages/GettingStartedPage.jsx', 'utf8')

describe('guided first-step contract', () => {
  it('introduces Vereda before asking the learner to choose a path', () => {
    expect(source).toContain('const TOTAL_STEPS = 4')
    expect(source).toContain('Bem-vindo ao Vereda.')
    expect(source).toContain('Um estudo que cresce por etapas.')
    expect(source).toContain('Fonte primeiro')
    expect(source).toContain('Seu ritmo')
    expect(source).toContain('Sempre orientado')
  })

  it('keeps exploration available instead of gating content', () => {
    expect(source).toContain("route: '/descobrir'")
    expect(source).toContain("route: '/biblioteca'")
    expect(source).toContain('Nada fica bloqueado depois')
  })

  it('keeps the recommendation framed as orientation, not doctrine', () => {
    expect(source).toContain('Esta indicação só organiza seu primeiro passo')
    expect(source).toContain('O Vereda ajuda a encontrar o texto; não substitui a fonte')
  })

  it('uses normal page flow instead of a trapped inner-scroll onboarding container', () => {
    expect(source).toContain('min-h-screen')
    expect(source).not.toContain('overflow-y-auto')
    expect(source).not.toContain('max-h-screen')
  })
})
