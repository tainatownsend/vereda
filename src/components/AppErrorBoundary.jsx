import React from 'react'
import { useAuthStore } from '@/store'

/**
 * Render errors should never leave a blank page. This boundary is deliberately
 * outside auth/router so it can recover from both a route render and app shell error.
 * It does not reset or mutate saved reading progress or authentication.
 */
export default class AppErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Diagnostics intentionally omit user notes, saved passages and auth tokens.
    console.error('Vereda: erro de exibição', error?.name || 'Error', info?.componentStack?.split('\n')[1] || '')
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="min-h-screen bg-canvas px-6 py-16 text-ink dark:bg-night dark:text-night-ink">
        <div role="alert" className="mx-auto max-w-lg rounded-[22px] border border-line bg-surface p-7 shadow-sm dark:border-night-line dark:bg-night-surface">
          <h1 className="font-display text-[1.8rem] font-semibold leading-tight">Não foi possível abrir esta tela.</h1>
          <p className="mt-4 text-base leading-relaxed">Sua leitura e suas anotações não foram apagadas. Tente carregar novamente; se o problema continuar, volte à página inicial.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="min-h-12 rounded-xl bg-sage-800 px-5 py-3 font-semibold text-white dark:bg-sage-300 dark:text-sage-950" onClick={() => window.location.reload()}>Tentar novamente</button>
            <a className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-5 py-3 font-semibold dark:border-night-line" href={useAuthStore.getState().user ? '/home' : '/'}>Ir para o início</a>
          </div>
        </div>
      </main>
    )
  }
}
