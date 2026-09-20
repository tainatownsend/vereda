import { Component } from 'react'

/**
 * Isolated route-level fallback for synchronous rendering failures.
 * Does not replace existing reader loading/error states or alter persisted progress.
 */
export default class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Vereda render failure', error, info?.componentStack)
  }

  retry = () => this.setState({ hasError: false })

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="northstar-page min-h-screen px-5 py-16" role="alert" aria-live="assertive">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-6 shadow-sm dark:border-night-line dark:bg-night-surface">
          <p className="text-sm font-semibold uppercase tracking-wide text-sage-700 dark:text-sage-300">Vereda</p>
          <h1 className="mt-3 font-display text-3xl text-ink dark:text-night-ink">Não foi possível abrir esta tela.</h1>
          <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">
            Seu progresso não será apagado. Você pode tentar novamente ou voltar ao início.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={this.retry} className="min-h-12 rounded-xl bg-sage-700 px-5 text-base font-semibold text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sage-500">
              Tentar novamente
            </button>
            <a href="/home" className="inline-flex min-h-12 items-center rounded-xl border border-line px-5 text-base font-semibold text-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sage-500 dark:border-night-line dark:text-night-ink">
              Ir para o início
            </a>
          </div>
        </div>
      </main>
    )
  }
}
