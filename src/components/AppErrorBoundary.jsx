import React from 'react'

/** Last-resort UI for render exceptions: never clears auth, progress or notes. */
export default class AppErrorBoundary extends React.Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Vereda rendering error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center',
        background: '#F6F7F4', color: '#1F2933', padding: '24px', fontFamily: 'system-ui' }}>
        <section style={{ maxWidth: 430, width: '100%', background: 'white',
          padding: '28px', border: '1px solid #DCDCC8', borderRadius: 24 }}>
          <p style={{ color: '#4F6757', fontWeight: 700, marginTop: 0 }}>VEREDA</p>
          <h1 style={{ fontSize: '1.6rem', lineHeight: 1.2 }}>Não foi possível mostrar esta tela.</h1>
          <p>Seu progresso e suas anotações não foram apagados. Tente carregar novamente.</p>
          <button type="button" onClick={() => window.location.reload()}
            style={{ width: '100%', minHeight: 48, background: '#4F6757', color: '#fff',
              border: 0, borderRadius: 12, font: 'inherit', fontWeight: 700 }}>
            Tentar novamente
          </button>
          <a href="/" style={{ display: 'block', marginTop: 20, color: '#365842' }}>
            Voltar ao início
          </a>
        </section>
      </main>
    )
  }
}
