import { ArrowRight, BookOpen, BookPlus, Bookmark, Check, Compass } from 'lucide-react'
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
      <header className="ves-container pb-7 pt-10">
        <p className="ves-eyebrow">Obras fundamentais</p>
        <h1 className="ves-heading mt-2 text-[2.45rem]">Sua biblioteca</h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
          Encontre seu próximo passo, retome uma leitura ou consulte uma passagem que você guardou.
        </p>
      </header>

      <div className="ves-container space-y-10 pb-10">
        <aside className="ves-warm-panel rounded-vesLg border border-line/80 p-5 shadow-sm sm:p-6 dark:border-night-line">
          <p className="ves-eyebrow">Uma rota para se orientar</p>
          <h2 className="mt-2 font-display text-[1.45rem] font-semibold leading-tight text-ink dark:text-night-ink">
            Uma sequência sugerida, não uma obrigação
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base dark:text-night-muted">
            Os números mostram uma ordem de estudo que pode ajudar quem está começando. Você continua livre para entrar por qualquer obra quando quiser.
          </p>

          <div className="mt-5 flex items-center" aria-label="Sequência sugerida das obras">
            {books.map((book, index) => {
              const sequence = getBookSequence(book)

              return (
                <div
                  key={book.id}
                  className={`flex items-center ${index < books.length - 1 ? 'flex-1' : ''}`}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sage-300 bg-surface/85 font-display text-sm font-semibold text-sage-800 shadow-sm dark:border-sage-800 dark:bg-night-surface dark:text-sage-300"
                    aria-label={`Obra ${sequence}: ${book.title}`}
                  >
                    {sequence}
                  </span>
                  {index < books.length - 1 && (
                    <span
                      className="mx-1 h-px flex-1 bg-gradient-to-r from-sage-300 via-gold-400 to-clay-300 dark:from-sage-700 dark:via-gold-600 dark:to-clay-700"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </aside>

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

        <section className="grid gap-3 sm:grid-cols-2" aria-label="Sua biblioteca e comunidade">
          <button
            type="button"
            onClick={() => navigate('/salvos')}
            className="ves-warm-panel group flex min-h-28 w-full items-center gap-4 rounded-vesLg border border-line/80 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-editorial dark:border-night-line"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface/85 text-clay-700 shadow-sm dark:bg-night-surface dark:text-clay-300">
              <Bookmark size={21} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">Trechos salvos</p>
              <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                {savedCount
                  ? `${savedCount} ${savedCount === 1 ? 'passagem guardada' : 'passagens guardadas'} para consultar depois.`
                  : 'Guarde passagens importantes para voltar a elas depois.'}
              </p>
            </div>
            <ArrowRight size={19} className="shrink-0 text-sage-700 transition-transform group-hover:translate-x-1 dark:text-sage-300" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/sugerir-obra')}
            className="group flex min-h-28 w-full items-center gap-4 rounded-vesLg border border-sage-200 bg-sage-50/75 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sage-400 hover:shadow-editorial dark:border-sage-900 dark:bg-sage-950/25"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface/85 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
              <BookPlus size={21} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">Sugerir uma obra</p>
              <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                Peça um novo livro ou vote em sugestões que outras pessoas já fizeram.
              </p>
            </div>
            <ArrowRight size={19} className="shrink-0 text-sage-700 transition-transform group-hover:translate-x-1 dark:text-sage-300" aria-hidden="true" />
          </button>
        </section>

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
            {started.length ? 'Outros caminhos' : 'Siga a sequência ou escolha livremente'}
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
