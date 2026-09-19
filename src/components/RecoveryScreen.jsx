import { Component } from 'react'

export function RecoveryScreen() {
  return (
    <main className="min-h-screen bg-[#F5EFE4] px-6 py-20 text-[#344237]" role="alert">
      <div className="mx-auto max-w-md">
        <p className="font-display text-2xl">Vereda</p>
        <h1 className="mt-6 font-display text-3xl">Não foi possível abrir esta página.</h1>
        <p className="mt-4 leading-relaxed">Verifique sua conexão e tente novamente. Você não precisa apagar seus dados para tentar de novo.</p>
        <button type="button" className="mt-6 min-h-12 rounded-full bg-[#465B49] px-6 text-white" onClick={() => window.location.reload()}>Tentar novamente</button>
        <a className="ml-4 inline-flex min-h-12 items-center underline" href="/">Voltar ao início</a>
      </div>
    </main>
  )
}

export class AppErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <RecoveryScreen /> : this.props.children }
}
