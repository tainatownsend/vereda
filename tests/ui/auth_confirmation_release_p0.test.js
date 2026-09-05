import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const auth = readFileSync('src/pages/AuthPage.jsx', 'utf8')

describe('auth confirmation release P0', () => {
  it('does not claim that an account was created when confirmation is ambiguous', () => {
    expect(auth).not.toContain('Conta criada. Falta apenas confirmar seu e-mail para continuar.')
    expect(auth).toContain('Se este endereço ainda precisar de confirmação')
  })

  it('keeps existing-account recovery immediately available', () => {
    expect(auth).toContain('Já usou este e-mail no Vereda?')
    expect(auth).toContain('Entrar com este e-mail')
    expect(auth).toContain('Esqueci minha senha')
    expect(auth).toContain('Usar outro e-mail')
  })

  it('handles explicit already-registered responses without leaving the user on confirmation', () => {
    expect(auth).toContain("EXISTING_ACCOUNT_ERRORS.has(caughtError?.message)")
    expect(auth).toContain('Este e-mail já possui uma conta. Entre com sua senha para continuar.')
    expect(auth).toContain("setMode('login')")
  })

  it('keeps confirmation recovery without the repetitive verification card', () => {
    expect(auth).toContain('Reenviar e-mail de confirmação')
    expect(auth).not.toContain('O link confirma que')
    expect(auth).not.toContain('<p className="font-semibold text-ink dark:text-night-ink">Verifique sua caixa de entrada</p>')
  })
})
