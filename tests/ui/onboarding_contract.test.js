import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/pages/GettingStartedPage.jsx', 'utf8')

describe('guided first-step contract', () => {
  it('asks the useful first question immediately instead of making people pass through explanatory steps', () => {
    expect(source).toContain('O que você quer fazer primeiro?')
    expect(source).toContain('Escolha o que parece mais útil agora.')
    expect(source).not.toContain('TOTAL_STEPS')
    expect(source).not.toContain('FAMILIARITY')
    expect(source).not.toContain('Você já estudou Espiritismo antes?')
    expect(source).not.toContain('Fonte primeiro')
    expect(source).not.toContain('Sempre orientado')
  })

  it('offers three concrete destinations without gating content', () => {
    expect(source).toContain('Quero começar pelos fundamentos')
    expect(source).toContain('Tenho uma dúvida específica')
    expect(source).toContain('Quero escolher uma obra')
    expect(source).toContain("route: '/descobrir'")
    expect(source).toContain("route: '/biblioteca'")
    expect(source).toContain('Você pode mudar de ideia e explorar outro caminho a qualquer momento.')
  })

  it('makes the foundation recommendation useful and clearly optional', () => {
    expect(source).toContain('Nossa sugestão para começar')
    expect(source).toContain('É a porta de entrada mais direta para os fundamentos.')
    expect(source).toContain('nenhuma outra obra fica bloqueada')
    expect(source).toContain('ele não responde no lugar das obras')
  })

  it('uses normal page flow instead of a trapped inner-scroll onboarding container', () => {
    expect(source).toContain('min-h-screen')
    expect(source).not.toContain('overflow-y-auto')
    expect(source).not.toContain('max-h-screen')
  })
})
