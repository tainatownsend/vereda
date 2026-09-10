import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/pages/GettingStartedPage.jsx', 'utf8')

describe('guided first-step contract', () => {
  it('welcomes a new account briefly before asking how the person wants to begin', () => {
    expect(source).toContain("isNewAccount && !isReplay ? 'welcome' : 'choice'")
    expect(source).toContain('Você não precisa saber tudo para começar.')
    expect(source).toContain('Escolher como quero começar')
    expect(source).toContain('Nada aqui é uma prova. Não há pressa, pontuação ou obrigação de seguir uma sequência.')
    expect(source).not.toContain('TOTAL_STEPS')
    expect(source).not.toContain('FAMILIARITY')
    expect(source).not.toContain('Você já estudou Espiritismo antes?')
  })

  it('offers four concrete paths, including the guided-study companion flow, without locking the user in', () => {
    expect(source).toContain('Quero estudar com companhia')
    expect(source).toContain('Quero começar pelos fundamentos')
    expect(source).toContain('Tenho uma dúvida específica')
    expect(source).toContain('Quero escolher uma obra')
    expect(source).toContain("route: '/estudo-guiado'")
    expect(source).toContain("route: '/descobrir'")
    expect(source).toContain("route: '/biblioteca'")
    expect(source).toContain('Nenhuma escolha prende você a um único jeito de estudar.')
  })

  it('makes the foundation recommendation useful, optional and safe while books are loading', () => {
    expect(source).toContain('Nossa sugestão para começar')
    expect(source).toContain('É uma porta de entrada para os fundamentos.')
    expect(source).toContain('nenhuma outra obra fica bloqueada')
    expect(source).toContain('ele não responde no lugar das obras')
    expect(source).toContain("const foundationWaiting = selectedIntent?.id === 'foundation' && !recommendation")
    expect(source).toContain('disabled={!selectedIntent || foundationWaiting}')
    expect(source).toContain('Preparando sugestão…')
  })

  it('uses normal page flow instead of a trapped inner-scroll onboarding container', () => {
    expect(source).toContain('min-h-screen')
    expect(source).not.toContain('overflow-y-auto')
    expect(source).not.toContain('max-h-screen')
  })
})
