import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Bookmark, ChartNoAxesCombined, NotebookPen, Settings, UserRound } from 'lucide-react'

const entries = [
  { to: '/biblioteca', title: 'Biblioteca', detail: 'Encontre e explore as obras disponíveis.', Icon: BookOpen },
  { to: '/evolucao', title: 'Minha jornada', detail: 'Consulte seu progresso nos estudos.', Icon: ChartNoAxesCombined },
  { to: '/notas', title: 'Minhas notas', detail: 'Volte às suas anotações sem perder o contexto.', Icon: NotebookPen },
  { to: '/salvos', title: 'Trechos salvos', detail: 'Releia as passagens que você guardou.', Icon: Bookmark },
  { to: '/configuracoes', title: 'Leitura e preferências', detail: 'Ajuste a leitura, o tema e os dados da conta.', Icon: Settings },
  { to: '/sugerir-obra', title: 'Sugerir uma obra', detail: 'Envie sua sugestão para a biblioteca.', Icon: UserRound },
]

export default function MorePage() {
  const navigate = useNavigate()
  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-8 sm:pt-12">
        <header className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/home')} aria-label="Voltar para Início"
            className="northstar-icon-button -ml-2 shrink-0" title="Voltar para Início">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-700 dark:text-sage-300">Sua biblioteca e preferências</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight text-ink dark:text-night-ink">Mais</h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
            Encontre suas notas, seus trechos salvos e as opções de leitura.
          </p>
        </div>
        </header>
        <nav aria-label="Recursos e preferências" className="mt-7 grid gap-3">
          {entries.map(({ to, title, detail, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-20 items-center gap-4 rounded-vesMd border border-line bg-surface p-4 text-left shadow-sm transition hover:border-sage-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-700 dark:border-night-line dark:bg-night-surface dark:focus-visible:outline-sage-300"
            >
              <Icon size={23} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-base font-semibold text-ink dark:text-night-ink">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">{detail}</span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
