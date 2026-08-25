import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')

describe('settings hub contract', () => {
  it('separates the page into understandable account and preference sections', () => {
    for (const heading of [
      'Sua conta',
      'Leitura e conforto',
      'Lembretes',
      'Privacidade e dados',
      'Ajuda e sobre',
    ]) {
      expect(settings).toContain(heading)
    }
  })

  it('keeps save actions next to the setting they affect instead of using one generic save button', () => {
    expect(settings).toContain('Salvar nome')
    expect(settings).toContain('Salvar horário')
    expect(settings).not.toContain('Salvar ajustes')
  })

  it('shows email confirmation state and a clear password recovery entry point', () => {
    expect(settings).toContain('E-mail confirmado')
    expect(settings).toContain('Confirmação de e-mail pendente')
    expect(settings).toContain('Senha e acesso')
    expect(settings).toContain('requestPasswordReset')
  })

  it('allows the learner to replay the introductory journey', () => {
    expect(settings).toContain("navigate('/comecar?replay=1')")
    expect(settings).toContain('Refazer a introdução')
  })

  it('keeps sign-out visually and semantically separate from preference controls', () => {
    expect(settings).toContain('aria-labelledby="session-heading"')
    expect(settings).toContain('Sair da conta')
  })
})
