import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const push = readFileSync('src/hooks/usePushNotifications.js', 'utf8')

describe('founder mobile P0 safeguards', () => {
  it('keeps the Home bell as a real action instead of a dead affordance', () => {
    expect(home).toContain('aria-label="Abrir lembretes e notificações"')
    expect(home).toContain("onClick={() => navigate('/configuracoes')}")
  })

  it('does not read Notification.permission unless notifications are supported', () => {
    expect(push).toContain("'Notification' in window")
    expect(push).toContain("'serviceWorker' in navigator")
    expect(push).toContain("'PushManager' in window")
    expect(push).toContain('useState(getInitialPermission)')
    expect(push).not.toContain('useState(Notification.permission)')
  })

  it('fails closed when push prerequisites are unavailable', () => {
    expect(push).toContain("return notificationsSupported() ? window.Notification.permission : 'denied'")
    expect(push).toContain('!notificationsSupported() || !VAPID_PUBLIC_KEY')
  })
})
