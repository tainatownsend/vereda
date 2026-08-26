import { ArrowRight, BookOpen, Bookmark, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { useAuthStore, useReadingStore } from '@/store'
import { Badge, Card, PageLoader } from '@/components/ui'
import { getSavedPassageIds } from '@/features/savedPassages/savedPassages'

const BOOK_ACCENT_COLORS = {
  1: '#5E7664',
  2: '#AB6D50',
  3: '#B9A46E',
  4: '#8FA68F',
  5: '#C98C6B',
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { user } = useAuthStore()
  const { progress } = useReadingStore()
  const savedCount = getSavedPassageIds(user).length

  if (!books.length) return <PageLoader label="Carregando obras" />

  const started = books.filter((book) => progress[book.id])
  const notStarted = books.filter((book) => !progress[book.id])

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container pb-6 pt-10">
        <p className="ves-eyebrow">Obras fundamentais</p>
        <h1 className="ves-heading mt-2 text-[2.45rem]">Sua biblioteca</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
          Os números indicam uma sequência sugerida de estudo. Você pode começar por qualquer obra.
        </p>

        <div className="mt-5 flex max-w-xl items-center gap-2" aria-label="Ordem sugerida das cinco obras">
          <span className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-sage-700 dark:text-sage-300">
            Ordem sugerida
          </span>
          <div className="flex min-w-0 flex-1 items-center" aria-hidden="true">
            {books.map((book, index) => {
              const sequence = getBookSequence(book)

              return (
                <div
                  key={book.id}
                  className={`flex items-center ${index < books.length - 1 ? 'flex-1' : ''}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sage-300 bg-surface/80 font-display text-xs font-semibold text-sage-800 dark:border-sage-800 dark:bg-night-surface dark:text-sage-300">
                    {sequence}
                  </span>
                  {index < books.length - 1 && (
                    <span className="mx-1 h-px flex-1 bg-line dark:bg-night-line" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </header>

      <div className="ves-container space-y-8 pb-10">
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2 border-y border-line/70 py-3 text-sm dark:border-night-line"
          aria-label="Atalhos da biblioteca"
        >
          <button
            type="button"
            onClick={() => navigate('/comecar')}
            className="inline-flex min-h-10 items-center gap-2 font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
          >
            <BookOpen size={17} aria-hidden="true" />
            Preciso de ajuda para escolher
          </button>

          <button
            type="button"
            onClick={() => navigate('/salvos')}
            className="inline-flex min-h-10 items-center gap-2 font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
          >
            <Bookmark size={17} aria-hidden="true" />
            Trechos salvos{savedCount ? ` (${savedCount})` : ''}
          </button>
        </nav>

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
          <p className="ves-eyebrow">{started.length ? 'Continue explorando' : 'As cinco obras'}</p>
          <h2 id="all-books-heading" className="ves-heading mt-1 text-[1.75rem]">
            {started.length ? 'Outras obras' : 'Escolha sua primeira obra'}
          </h2>
          {!started.length && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted dark:text-night-muted">
              Toque em uma obra para conhecer sua proposta antes de começar a leitura.
            </p>
          )}

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
      </div>
    </main>
  )
}

function BookCard({ book, progress, navigate }) {
  const completed = Boolean(progress?.completed_at)
  const sequence = getBookSequence(book)
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
      aria-label={`${progress ? `Retomar ${book.title}` : `Conhecer ${book.title}`}. Obra ${sequence} da sequência sugerida.`}
    >
      <div className="flex min-h-40">
        <div
          className="w-2.5 shrink-0 opacity-80"
          style={{ backgroundColor: BOOK_ACCENT_COLORS[sequence] || '#5E7664' }}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sage-200 bg-sage-50 font-display text-sm font-semibold text-sage-800 dark:border-sage-800 dark:bg-sage-950/60 dark:text-sage-300"
                  aria-hidden="true"
                >
                  {sequence}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[1.5rem] font-semibold leading-tight text-ink dark:text-night-ink">
                    {book.title}
                  </p>
                  <p className="mt-1 text-sm text-muted dark:text-night-muted">
                    {book.author}
                    {book.year ? ` · ${book.year}` : ''}
                  </p>
                </div>
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

function getBookSequence(book) {
  const displayOrder = Number(book.display_order)
  if (Number.isFinite(displayOrder) && displayOrder > 0) return displayOrder

  const bookId = Number(book.id)
  return Number.isFinite(bookId) && bookId > 0 ? bookId : '•'
}
