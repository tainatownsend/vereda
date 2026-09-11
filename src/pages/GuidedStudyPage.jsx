import { ArrowRight, BookOpen, CheckCircle2, Compass, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { EditorialCard, ProgressLine } from '@/components/northstar/NorthStarUI'
import { useBooks } from '@/hooks'
import { useAuthStore } from '@/store'
import { GUIDED_STUDY_PATHS, matchGuidedPath } from '@/features/guidedStudy/catalog'
import { guidedPathProgress } from '@/features/guidedStudy/progress'

export default function GuidedStudyPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { user } = useAuthStore()

  const items = GUIDED_STUDY_PATHS.map((path) => ({
    path,
    book: books.find((book) => matchGuidedPath(book)?.key === path.key) || null,
    progress: guidedPathProgress(user, path),
  }))

  const next = items.find((item) => item.progress.nextSession) || items[0]

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9 sm:pt-12">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Estudo guiado</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-tight text-ink dark:text-night-ink sm:text-[2.65rem]">
            Estude com orientação, sempre a partir da fonte.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
            Cada encontro começa no texto da obra. O Vereda ajuda você a observar o contexto, fazer conexões e guardar sua própria reflexão — sem substituir a leitura original.
          </p>
        </header>

        <EditorialCard className="mt-7 overflow-hidden border-sage-200 bg-sage-50/80 p-5 dark:border-sage-900 dark:bg-sage-950/30 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-white text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
              <Compass size={21} aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">Como funciona</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted dark:text-night-muted">
                Antes de ler → texto da obra → orientação de estudo → conexão entre obras → reflexão → próximo encontro. Você pode abrir qualquer encontro e avançar no seu ritmo.
              </p>
            </div>
          </div>
        </EditorialCard>

        {next?.progress?.nextSession && (
          <section className="mt-8" aria-labelledby="guided-next-title">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={17} className="text-gold-600" aria-hidden="true" />
              <h2 id="guided-next-title" className="text-sm font-semibold text-ink dark:text-night-ink">Seu próximo encontro</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/estudo-guiado/${next.path.key}/${next.progress.nextSession.id}`)}
              className="w-full text-left"
            >
              <EditorialCard className="p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">{next.path.title}</p>
                    <p className="mt-2 font-display text-xl font-semibold text-ink dark:text-night-ink">{next.progress.nextSession.title}</p>
                    <p className="mt-2 text-sm text-muted dark:text-night-muted">Cerca de {next.progress.nextSession.minutes} min · fonte + orientação + reflexão</p>
                  </div>
                  <ArrowRight className="mt-1 shrink-0 text-sage-700 dark:text-sage-300" size={21} aria-hidden="true" />
                </div>
              </EditorialCard>
            </button>
          </section>
        )}

        <section className="mt-9" aria-labelledby="guided-works-title">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Cinco obras fundamentais</p>
            <h2 id="guided-works-title" className="mt-1 font-display text-[1.7rem] font-semibold text-ink dark:text-night-ink">Escolha uma jornada</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {items.map(({ path, book, progress }) => (
              <button
                key={path.key}
                type="button"
                onClick={() => navigate(`/estudo-guiado/${path.key}`)}
                className="h-full text-left"
              >
                <EditorialCard className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                      {progress.finished ? <CheckCircle2 size={21} aria-hidden="true" /> : <BookOpen size={21} aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-lg font-semibold leading-snug text-ink dark:text-night-ink">{path.title}</p>
                        <ArrowRight size={18} className="mt-1 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">{path.subtitle}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-muted dark:text-night-muted">
                      <span>{progress.complete} de {progress.total} encontros</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <ProgressLine value={progress.percent} />
                  </div>

                  {!book && (
                    <p className="mt-4 text-xs leading-relaxed text-clay-700 dark:text-clay-300">
                      A obra ainda não foi localizada no catálogo desta conta. A jornada continua disponível assim que o conteúdo carregar.
                    </p>
                  )}
                </EditorialCard>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
