import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = readFileSync('supabase/config.toml', 'utf8')
const confirmation = readFileSync('supabase/templates/confirmation.html', 'utf8')
const recovery = readFileSync('supabase/templates/recovery.html', 'utf8')
const confirmationText = readFileSync('supabase/templates/confirmation.txt', 'utf8')
const recoveryText = readFileSync('supabase/templates/recovery.txt', 'utf8')

describe('Vereda auth email identity', () => {
  it('requires email confirmation and points local auth at versioned templates', () => {
    expect(config).toContain('enable_confirmations = true')
    expect(config).toContain('[auth.email.template.confirmation]')
    expect(config).toContain('./supabase/templates/confirmation.html')
    expect(config).toContain('[auth.email.template.recovery]')
    expect(config).toContain('./supabase/templates/recovery.html')
  })

  it('keeps confirmation and recovery actionable without relying on images', () => {
    for (const template of [confirmation, recovery]) {
      expect(template).toContain('{{ .ConfirmationURL }}')
      expect(template).toContain('VEREDA')
      expect(template).toContain('#f6f0e6')
      expect(template).toContain('#3f5f4f')
      expect(template).not.toContain('<img')
    }
  })

  it('versions plain-text equivalents for hosted email configuration and review', () => {
    expect(confirmationText).toContain('{{ .ConfirmationURL }}')
    expect(recoveryText).toContain('{{ .ConfirmationURL }}')
    expect(confirmationText).toContain('Confirme seu e-mail')
    expect(recoveryText).toContain('Crie uma nova senha')
  })
})
