import { Component } from 'react'

export function UnavailableScreen() {
  return <main className="northstar-page flex min-h-screen items-center px-6 py-12">
    <div className="mx-auto max-w-md text-center">
      <p className="font-display text-xl">Vereda</p>
      <h1 className="mt-6 font-display text-3xl">Não conseguimos abrir o Vereda agora.</h1>
      <p role="alert" className="mt-4 text-base leading-relaxed">Tente novamente em alguns instantes. Não é necessário apagar seus dados ou criar outra conta.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-14 rounded-xl bg-sage-700 px-6 py-3 text-base font-medium text-white">Tentar novamente</button>
    </div>
  </main>
}

export default class AppRecovery extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('Vereda: não foi possível renderizar a tela.', error) }
  render() { return this.state.failed ? <UnavailableScreen /> : this.props.children }
}
