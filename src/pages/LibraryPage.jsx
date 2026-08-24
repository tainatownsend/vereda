import { ArrowRight, BookOpen, Check, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { useReadingStore } from '@/store'
import { Badge, Card, PageLoader } from '@/components/ui'

export default function LibraryPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { progress } = useReadingStore()

  if (!books.length) return <PageLoader label="Carregando obras" />

  const started = books.filter((book) => progress[book.id])
  const notStarted = books.filter((book) => !progress[book.id])

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container pb-7 pt-10">
        <p className="ves-eyebrow">Obras fundamentais</p>
        <h1 className="ves-heading mt-2 text-[2.45rem]">Sua biblioteca</h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
          Continue o que já começou ou conheça outra obra. Você não precisa seguir uma ordem obrigatória.
        </p>
      </header>

      <div className="ves-container space-y-10 pb-10">
        {started.length > 0 && (
          <section aria-labelledby="started-heading">
            <p className="ves-eyebrow">Continue estudando</p>
            <h2 id="started-heading" className="ves-heading mt-1 text-[1.75rem]">
              De onde você parou
            </h2>

            <div className="mt-5 space-y-4">
              {started.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  progress={progress[book.id]}
                  navigate={navigate}
                />
              ))}
            </div>
          </section>
        )}

        <section
          className={started.length ? 'border-t border-line/70 pt-8 dark:border-night-line' : ''}
          aria-labelledby="all-books-heading"
        >
          <p className="ves-eyebrow">Conheça as obras</p>
          <h2 id="all-books-heading" className="ves-heading mt-1 text-[1.75rem]">
            {started.length ? 'Outros caminhos' : 'Escolha com tranquilidade'}
          </h2>

          <div className="mt-5 space-y-4">
            {(started.length ? notStarted : books).map((book) => (
              <BookCard
                key={book.id}
                book={book}
                progress={progress[book.id]}
                navigate={navigate}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2" aria-label="Ajuda para escolher">
          <button
            type="button"
            onClick={() => navigate('/comecar')}
            className="min-h-36 rounded-vesLg border border-clay-100 bg-clay-50/80 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-clay-300 hover:shadow-editorial dark:border-clay-900/60 dark:bg-clay-950/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/85 text-clay-700 shadow-sm dark:bg-night-surface dark:text-clay-300">
              <BookOpen size={21} aria-hidden="true" />
            </div>
            <span className="mt-4 block font-display text-lg font-semibold text-ink dark:text-night-ink">Não sei por onde começar</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">
              Responda duas perguntas rápidas e receba uma primeira direção.
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/descobrir')}
            className="min-h-36 rounded-vesLg border border-sage-200 bg-sage-50/80 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sage-400 hover:shadow-editorial dark:border-sage-900 dark:bg-sage-950/30"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/85 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
              <Compass size={21} aria-hidden="true" />
            </div>
            <span className="mt-4 block font-display text-lg font-semibold text-ink dark:text-night-ink">Quero explorar um tema</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">
              Procure por oração, reencarnação, vida após a morte e outros assuntos.
            </span>
          </button>
        </section>

        <aside className="ves-warm-panel rounded-vesLg border border-line/80 p-6 shadow-sm dark:border-night-line">
          <h2 className="font-display text-lg font-semibold text-ink dark:text-night-ink">Uma referência, não uma obrigação</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
            O Vereda pode sugerir uma direção para iniciantes, mas as obras continuam disponíveis para você escolher livremente.
          </p>
        </aside>
      </div>
    </main>
  )
}

function BookCard({ book, progress, navigate }) {
  const completed = Boolean(progress?.completed_at)
  const destination = completed
    ? `/ler/${book.id}?revisit=1`
    : progress
      ? `/ler/${book.id}`
      : `/livro/${book.id}`

  return (
    <Card
      as="button"
      type="button"
      onClick={() => navigate(destination)}
      className="group w-full overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-editorial"
      aria-label={progress ? `Retomar ${book.title}` : `Conhecer ${book.title}`}
    >
      <div className="flex min-h-40">
        <div
          className="w-2.5 shrink-0"
          style={{ backgroundColor: book.cover_color || '#5E7664' }}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="font-display text-[1.5rem] font-semibold leading-tight text-ink dark:text-night-ink">
                  {book.title}
                </p>
                <p className="mt-1 text-sm text-muted dark:text-night-muted">
                  {book.author}
                  {book.year ? ` · ${book.year}` : ''}
                </p>
              </div>

              {completed && (
                <Badge color="success" className="shrink-0">
                  <Check size={13} aria-hidden="true" />
                  Percorrida
                </Badge>
              )}
            </div>

            {!progress && book.description && (
              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                {book.description}
              </p>
            )}
          </div>

          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">
            {completed
              ? 'Revisitar esta obra'
              : progress
                ? `Retomar no trecho ${progress.current_section || 1}`
                : 'Conhecer esta obra'}
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
