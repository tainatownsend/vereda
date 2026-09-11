import { ArrowLeft, ArrowRight, Check, Clock3 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { EditorialCard, ProgressLine } from '@/components/northstar/NorthStarUI'
import { useBooks } from '@/hooks'
import { useAuthStore } from '@/store'
import { getGuidedPath, matchGuidedPath } from '@/features/guidedStudy/catalog'
import { getCompletedGuidedSessions, guidedPathProgress } from '@/features/guidedStudy/progress'

export default function GuidedStudyPathPage() {
  const { pathKey } = useParams()
  const navigate = useNavigate()
  const books = useBooks()
  const { user } = useAuthStore()
  const path = getGuidedPath(pathKey)

  if (!path) {
    return (
      <main className="northstar-page flex min-h-[70vh] items-center px-5 py-12">
        <div className="mx-auto w-full max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Estudo guiado</p>
          <h1 className="mt-3 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Esta jornada não foi encontrada.</h1>
          <button type="button" onClick={() => navigate('/estudo-guiado')} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-vesMd bg-sage-700 px-5 text-sm font-semibold text-white">
            <ArrowLeft size={18} aria-hidden="true" /> Voltar aos estudos guiados
          </button>
        </div>
      </main>
    )
  }

  const book = books.find((item) => matchGuidedPath(item)?.key === path.key) || null
  const completed = new Set(getCompletedGuidedSessions(user, path.key))
  const progress = guidedPathProgress(user, path)

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-7 sm:pt-10">
        <button
          type="button"
          onClick={() => navigate('/estudo-guiado')}
          className="inline-flex min-h-11 items-center gap-2 rounded-vesSm px-1 text-sm font-semibold text-sage-800 dark:text-sage-300"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Estudo guiado
        </button>

        <header className="mt-5 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Jornada pela obra</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-tight text-ink dark:text-night-ink sm:text-[2.65rem]">{path.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">{path.subtitle}</p>
        </header>

        <EditorialCard className="mt-7 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Seu caminho nesta obra</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink dark:text-night-ink">
                {progress.finished ? 'Jornada concluída' : `${progress.complete} de ${progress.total} encontros`}
              </p>
            </div>
            <span className="text-sm font-semibold text-sage-800 dark:text-sage-300">{progress.percent}%</span>
          </div>
          <ProgressLine value={progress.percent} className="mt-4" />
          <p className="mt-4 text-sm leading-relaxed text-muted dark:text-night-muted">
            Os encontros são uma orientação, não pré-requisitos. Você pode abrir qualquer etapa e voltar quando quiser.
          </p>
        </EditorialCard>

        {!book && books.length > 0 && (
          <p role="alert" className="mt-5 rounded-vesMd border border-clay-200 bg-clay-50 p-4 text-sm leading-relaxed text-clay-800 dark:border-clay-900 dark:bg-clay-950/20 dark:text-clay-200">
            Não conseguimos relacionar esta jornada ao texto da obra no catálogo atual. O Vereda não mostrará uma fonte aproximada: tente novamente depois para manter o estudo fiel ao texto original.
          </p>
        )}

        <section className="mt-8" aria-labelledby="guided-sessions-title">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Percurso</p>
          <h2 id="guided-sessions-title" className="mt-1 font-display text-[1.7rem] font-semibold text-ink dark:text-night-ink">8 encontros</h2>

          <div className="mt-4 space-y-3">
            {path.sessions.map((session, index) => {
              const isComplete = completed.has(session.id)
              const isNext = progress.nextSession?.id === session.id
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigate(`/estudo-guiado/${path.key}/${session.id}`)}
                  className="block w-full text-left"
                >
                  <EditorialCard className={`p-5 transition hover:-translate-y-0.5 hover:shadow-md ${isNext ? 'border-sage-300 ring-1 ring-sage-200 dark:border-sage-800 dark:ring-sage-900' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isComplete ? 'bg-sage-700 text-white' : 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300'}`}>
                        {isComplete ? <Check size={18} aria-label="Concluído" /> : index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">
                              Encontro {index + 1}{isNext ? ' · Próximo' : isComplete ? ' · Concluído' : ''}
                            </p>
                            <p className="mt-1 font-display text-lg font-semibold leading-snug text-ink dark:text-night-ink">{session.title}</p>
                          </div>
                          <ArrowRight size={18} className="mt-1 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted dark:text-night-muted">
                          <Clock3 size={14} aria-hidden="true" /> cerca de {session.minutes} min
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {session.concepts.slice(0, 3).map((concept) => (
                            <span key={concept} className="rounded-full bg-surface-soft px-2.5 py-1 text-xs text-muted dark:bg-night dark:text-night-muted">{concept}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </EditorialCard>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
