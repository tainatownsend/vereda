import { useNavigate } from 'react-router-dom'
import {
  Bookmark,
  ChevronRight,
  Compass,
  Leaf,
  NotebookPen,
  Settings,
  Sparkles,
} from 'lucide-react'

import { EditorialCard } from '@/components/northstar/NorthStarUI'

const groups = [
  {
    title: 'Minha jornada',
    items: [
      { path: '/evolucao', label: 'Minha jornada', description: 'Acompanhe seu caminho pelas obras.', Icon: Leaf },
      { path: '/notas', label: 'Notas de estudo', description: 'Reveja ideias e dúvidas que você guardou.', Icon: NotebookPen },
      { path: '/salvos', label: 'Trechos salvos', description: 'Volte aos trechos que quer revisitar.', Icon: Bookmark },
    ],
  },
  {
    title: 'Meu jeito de estudar',
    items: [
      { path: '/estudo-guiado', label: 'Estudo guiado', description: 'Siga encontros curtos, no seu ritmo.', Icon: Compass },
      { path: '/plano-de-estudo', label: 'Plano de estudo', description: 'Escolha uma frequência que caiba na sua rotina.', Icon: Sparkles },
      { path: '/configuracoes', label: 'Perfil e preferências', description: 'Ajuste leitura, lembretes e sua conta.', Icon: Settings },
    ],
  },
]

export default function MorePage() {
  const navigate = useNavigate()

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Seu espaço</p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Mais</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted dark:text-night-muted">
            Tudo o que apoia sua jornada, sem tirar o foco do estudo.
          </p>
        </header>

        <div className="mt-7 space-y-7">
          {groups.map((group) => (
            <section key={group.title} aria-labelledby={`more-${group.title.replace(/\s+/g, '-').toLowerCase()}`}>
              <h2
                id={`more-${group.title.replace(/\s+/g, '-').toLowerCase()}`}
                className="mb-3 font-display text-lg font-semibold text-ink dark:text-night-ink"
              >
                {group.title}
              </h2>
              <EditorialCard className="divide-y divide-line/80 overflow-hidden p-0 dark:divide-night-line">
                {group.items.map(({ path, label, description, Icon }) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => navigate(path)}
                    className="flex min-h-[5.2rem] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-soft/70 dark:hover:bg-night/35"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEE4D4] text-sage-800 dark:bg-night dark:text-sage-300">
                      <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink dark:text-night-ink">{label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted dark:text-night-muted">{description}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
                  </button>
                ))}
              </EditorialCard>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
