import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync('src/App.jsx', 'utf8')
const landing = readFileSync('src/pages/LandingPage.jsx', 'utf8')
const auth = readFileSync('src/pages/AuthPage.jsx', 'utf8')
const html = readFileSync('index.html', 'utf8')

describe('public landing page contract', () => {
  it('separates public presentation from authentication', () => {
    expect(app).toContain('<Route path="/" element={<LandingPage />} />')
    expect(app).toContain('path="/entrar"')
    expect(app).toContain('path="/criar-conta"')
    expect(app).toContain('<AuthPage initialMode="signup" />')
    expect(auth).toContain("export default function AuthPage({ initialMode = 'login' })")
  })

  it('does not block the public landing behind auth initialization', () => {
    const appStart = app.indexOf('export default function App()')
    const appReturn = app.indexOf('return (', appStart)
    const appBeforeRender = app.slice(appStart, appReturn)

    expect(appBeforeRender).not.toContain('if (loading)')
    expect(app).toContain('function PublicAuthRoute({ loading, user, children })')
    expect(app).toContain('if (loading) return <PageLoader />')
  })

  it('explains the product before signup with clear public sections', () => {
    for (const copy of [
      'Como funciona',
      'Biblioteca atual',
      'Por que o Vereda',
      'Uma biblioteca que pode crescer',
      'Perguntas frequentes',
    ]) {
      expect(landing).toContain(copy)
    }
  })

  it('provides direct create-account and sign-in calls to action', () => {
    expect(landing).toContain("const primaryHref = user ? '/home' : '/criar-conta'")
    expect(landing).toContain("to=\"/entrar\"")
    expect(landing).toContain("const primaryLabel = user ? 'Abrir o Vereda' : 'Criar conta'")
    expect(landing).not.toContain('Criar minha conta')
    expect(landing).toContain('Já tenho uma conta')
  })

  it('keeps the public page mobile-safe and independent of book fetching', () => {
    expect(landing).toContain('overflow-x-hidden')
    expect(landing).not.toContain('useBooks')
    expect(landing).not.toContain('supabase')
  })

  it('ships description and social metadata', () => {
    expect(html).toContain('name="description"')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('property="og:description"')
    expect(html).toContain('<title>Vereda — Estudo das obras fundamentais do Espiritismo</title>')
  })
})
