import { Component } from 'react'

/**
 * Isolates unexpected rendering failures so the application never becomes
 * an unhelpful blank screen. Data/auth failures should still use their
 * existing explicit page-level states and never be treated as success.
 */
export default class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, details) {
    // Never log reading content, notes, session tokens or personal data.
    if (import.meta.env.DEV) {
      console.error('Vereda: falha ao renderizar a interface.', error?.name, details?.componentStack)
    }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main
        role="alert"
        aria-labelledby="vereda-recovery-title"
        style={{
          minHeight: '100dvh', display: 'grid', placeItems: 'center',
          padding: 'max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))',
          background: '#F8F7F2', color: '#273C34',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <section style={{
          width: 'min(100%, 440px)', padding: '28px 22px',
          border: '1px solid #D8E0D7', borderRadius: 18,
          background: '#FFFFFF', boxShadow: '0 12px 35px #283D3414',
        }}>
          <p style={{ letterSpacing: '0.15em', fontSize: 13, fontWeight: 700 }}>VEREDA</p>
          <h1 id="vereda-recovery-title" style={{fontSize: 'clamp(25px,6vw,32px)',lineHeight: 1.15,margin: '18px 0 12px'}}>
            Não foi possível abrir esta tela.
          </h1>
          <p style={{fontSize: 17,lineHeight: 1.6}}>
            Você pode tentar novamente. Seu progresso de leitura não foi alterado por esta mensagem.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: 48, width: '100%', border: 0, borderRadius: 12,
              padding: 12, background: '#436A56', color: 'white',
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
            }}
          >Tentar novamente</button>
          <a href="/" style={{display: 'block',marginTop: 20,color: '#345A48',fontSize: 16,textDecoration: 'underline'}}>
            Voltar ao início
          </a>
        </section>
      </main>
    )
  }
}
