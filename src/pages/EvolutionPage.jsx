import { ArrowRight, BookOpen, Check, Compass, Map } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { useReadingStore } from '@/store'
import { Card, PageLoader } from '@/components/ui'

export default function EvolutionPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { progress } = useReadingStore()

  if (!books.length) return <PageLoader label="Preparando sua jornada" />

  const activeBooks = books.filter(
    (book) => progress[book.id] && !progress[book.id]?.completed_at,
  )
  const completedBooks = books.filter((book) => progress[book.id]?.completed_at)

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container pb-7 pt-11">
        <p className="ves-eyebrow">Sua jornada</p>
        <h1 className="ves-heading mt-2 text-[2.35rem]">Veja onde você está</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
          Aqui não há sequência para manter nem ritmo para provar. Este espaço serve apenas para orientar seu caminho.
        </p>
      </header>

      <div className="ves-container space-y-10 pb-10">
        {activeBooks.length > 0 ? (
          <section aria-labelledby="current-path-heading">
            <div className="flex items-center gap-3">
              <Map size={22} className="text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <div>
                <p className="ves-eyebrow">Você está aqui</p>
                <h2 id="current-path-heading" className="ves-heading mt-1 text-[1.75rem]">Caminhos em andamento</h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {activeBooks.map((book) => (
                <JourneyCard
                  key={book.id}
                  book={book}
                  state={progress[book.id]}
                  onOpen={() => navigate(`/ler/${book.id}`)}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="ves-horizon-panel rounded-vesLg border border-line p-6 shadow-sm dark:border-night-line">
            <div className="relative z-10 flex max-w-lg items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-surface/80 text-sage-700 shadow-sm dark:bg-night-surface dark:text-sage-300">
                <Compass size={22} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="ves-heading text-[1.7rem]">Seu caminho pode começar quando fizer sentido.</h2>
                <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">
                  Escolha uma obra ou peça uma primeira orientação. Não existe atraso.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/comecar')}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-vesSm px-2 font-semibold text-sage-800 hover:bg-white/40 dark:text-sage-300 dark:hover:bg-white/5"
                >
                  Ajude-me a começar
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        )}

        {completedBooks.length > 0 && (
          <section
            className="border-t border-line pt-8 dark:border-night-line"
            aria-labelledby="traveled-heading"
          >
            <p className="ves-eyebrow">Caminhos percorridos</p>
            <h2 id="traveled-heading" className="ves-heading mt-1 text-[1.75rem]">Obras que você já concluiu</h2>

            <div className="mt-5 space-y-3">
              {completedBooks.map((book) => (
                <Card key={book.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <Check size={20} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink dark:text-night-ink">{book.title}</p>
                      <p className="mt-1 text-sm text-muted dark:text-night-muted">Disponível para revisitar quando quiser.</p>
                      <button
                        type="button"
                        onClick={() => navigate(`/ler/${book.id}?revisit=1`)}
                        className="mt-3 inline-flex min-h-11 items-center rounded-vesSm px-2 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
                      >
                        Revisitar esta obra
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-line pt-8 dark:border-night-line" aria-labelledby="journey-principle-heading">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
              <BookOpen size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="journey-principle-heading" className="font-semibold text-ink dark:text-night-ink">Um passo de cada vez</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted dark:text-night-muted">
                O Vereda guarda o ponto onde você parou para que voltar seja simples. Uma pausa não apaga o caminho que você já percorreu.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function JourneyCard({ book, state, onOpen }) {
  return (
    <Card as="button" type="button" onClick={onOpen} className="group w-full p-5 text-left transition-shadow hover:shadow-editorial">
      <div className="flex items-start gap-4">
        <div
          className="mt-1 h-12 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: book.cover_color || '#58745D' }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.45rem] font-medium leading-tight text-ink dark:text-night-ink">{book.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
            Você está no trecho {state?.current_section || 1}.
            {state?.last_read_at ? ` Última vez aqui: ${formatDate(state.last_read_at)}.` : ''}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">
            Continuar daqui
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Card>
  )
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}
