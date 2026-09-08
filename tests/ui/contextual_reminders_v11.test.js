import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pushFunction = readFileSync('supabase/functions/send-push-notifications/index.ts', 'utf8')
const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')

describe('Vereda 1.1 contextual reminders', () => {
  it('uses the user reading point as context when available', () => {
    expect(pushFunction).toContain(".from('user_progress')")
    expect(pushFunction).toContain(".from('books')")
    expect(pushFunction).toContain('seu próximo trecho em')
    expect(pushFunction).toContain("url: '/home'")
  })

  it('keeps reminder language gentle and non-coercive', () => {
    expect(pushFunction).toContain('continua aqui quando você quiser retomar')
    expect(pushFunction).toContain('seu caminho de estudo continua disponível quando você quiser voltar')
    expect(pushFunction).not.toContain('sua leitura de hoje está esperando')
    expect(pushFunction).not.toContain('Que tal 10 minutos agora?')
    expect(settings).toContain('Um toque gentil, somente se você quiser')
    expect(settings).toContain('não para cobrar frequência')
  })

  it('does not send another reminder after a study session on the same day', () => {
    expect(pushFunction).toContain(".from('reading_sessions')")
    expect(pushFunction).toContain(".eq('read_at', today)")
    expect(pushFunction).toContain('if (sessionError || sessions?.length) continue')
  })

  it('cleans up expired push subscriptions', () => {
    expect(pushFunction).toContain('statusCode === 404 || statusCode === 410')
    expect(pushFunction).toContain(".from('push_subscriptions')")
    expect(pushFunction).toContain(".delete()")
  })
})
