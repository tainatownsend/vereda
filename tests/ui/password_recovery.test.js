import { describe, expect, it } from 'vitest'

import {
  getPasswordResetRedirect,
  PASSWORD_RESET_PATH,
  validateNewPassword,
} from '@/features/auth/passwordRecovery'

describe('password recovery contract', () => {
  it('builds a reset callback on the current app origin', () => {
    expect(getPasswordResetRedirect('https://vereda.example.com/')).toBe(
      `https://vereda.example.com${PASSWORD_RESET_PATH}`,
    )
  })

  it('requires at least six characters', () => {
    expect(validateNewPassword('12345', '12345')).toBe(
      'A senha precisa ter ao menos 6 caracteres.',
    )
  })

  it('requires matching confirmation', () => {
    expect(validateNewPassword('123456', '654321')).toBe(
      'As senhas não coincidem.',
    )
  })

  it('accepts a valid matching password', () => {
    expect(validateNewPassword('123456', '123456')).toBeNull()
  })
})
