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

  it('uses the canonical Spiritist-study framing in the public header', () => {
    expect(landing).toContain('Seu caminho de estudo espírita')
    expect(landing).not.toContain('seu caminho de aprendizado')
  })

  it('uses compact numbered steps instead of redundant feature icons', () => {
    expect(landing).toContain('<FeatureCard number="1" title="Escolha um caminho">')
    expect(landing).toContain('<FeatureCard number="2" title="Leia em trechos">')
    expect(landing).toContain('<FeatureCard number="3" title="Volte quando quiser">')
    expect(landing).toContain('function FeatureCard({ number, title, children })')
    expect(landing).not.toContain('function FeatureCard({ icon: Icon')
  })

  it('uses the dedicated Landing infographic instead of the in-app connected progress path', () => {
    expect(landing).toContain('Uma jornada pelas obras básicas.')
    expect(landing).toContain('A ordem é apenas uma sugestão, não uma obrigação.')
    expect(landing).toContain('Sequência visual das cinco obras fundamentais')
    expect(landing).toContain('LandingJourneyCard')
    expect(landing).toContain("String(sequence).padStart(2, '0')")
    expect(landing).toContain('grid-cols-[4.5rem_minmax(0,1fr)_3.25rem]')
    expect(landing).not.toContain('bottom-[-0.9rem]')
    expect(landing).not.toContain('JourneyStep')
  })

  it('uses compact icon-left value cards for easier mobile scanning', () => {
    expect(landing).toContain('function ValueCard({ icon: Icon, title, children })')
    expect(landing).toContain('flex items-start gap-4 rounded-vesLg')
    expect(landing).toContain('Busca nas fontes')
    expect(landing).toContain('Sem cobrança')
    expect(landing).toContain('Conta com propósito')
    expect(landing).toContain('Liberdade para explorar')
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
