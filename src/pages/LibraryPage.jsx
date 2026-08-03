import { ArrowRight, BookOpen, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks, useProgress } from '@/hooks'
import { useReadingStore } from '@/store'
import { Badge, Card, PageLoader, ProgressBar } from '@/components/ui'

export default function LibraryPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { progress } = useReadingStore()

  if (!books.length) return <PageLoader label="Carregando obras" />

  const started = books.filter((book) => progress[book.id])
  const notStarted = books.filter((book) => !progress[book.id])

  return (
    <main className="ves-page pb-28">
      <header className="ves-container pb-7 pt-11">
        <p className="ves-eyebrow">Biblioteca essencial</p>
        <h1 className="ves-heading mt-2 text-[2.35rem]">Obras</h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
          Conheça as cinco obras fundamentais e escolha seu próximo passo com
          tranquilidade.
        </p>
      </header>

      <div className="ves-container space-y-11 pb-10">
        {started.length > 0 && (
          <section aria-labelledby="started-heading">
            <div className="mb-4">
              <p className="ves-eyebrow">Sua jornada</p>
              <h2 id="started-heading" className="ves-heading mt-1 text-[1.75rem]">
                Em andamento
              </h2>
            </div>

            <div className="space-y-4">
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

        <section aria-labelledby="all-books-heading">
          <div className="mb-4">
            <p className="ves-eyebrow">
              {started.length ? 'Continue descobrindo' : 'Por onde começar'}
            </p>
            <h2 id="all-books-heading" className="ves-heading mt-1 text-[1.75rem]">
              {started.length ? 'Outras obras' : 'Escolha sua primeira obra'}
            </h2>
          </div>

          <div className="space-y-4">
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

        <aside className="rounded-vesLg border border-sage-200 bg-sage-50 p-6 dark:border-sage-900 dark:bg-sage-950/35">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-white text-sage-800 dark:bg-white/10 dark:text-sage-300">
              <BookOpen size={21} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-ink dark:text-night-ink">
                Um caminho, não uma obrigação
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                A ordem apresentada oferece uma referência para iniciantes.
                Você pode escolher a obra que fizer mais sentido para seu
                momento.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

function BookCard({ book, progress, navigate }) {
  const percentage = useProgress(book.id, book.total_sections)
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
      className="group w-full overflow-hidden text-left transition-shadow hover:shadow-editorial"
      aria-label={
        progress
          ? `Continuar ${book.title}, ${percentage}% concluído`
          : `Conhecer ${book.title}`
      }
    >
      <div className="flex min-h-44">
        <div
          className="w-2 shrink-0"
          style={{ backgroundColor: book.cover_color || '#58745D' }}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-[1.45rem] font-medium leading-tight text-ink dark:text-night-ink">
                  {book.title}
                </p>
                <p className="mt-1 text-sm text-muted dark:text-night-muted">
                  {book.author}
                  {book.year ? ` · ${book.year}` : ''}
                </p>
              </div>

              {completed && (
                <Badge color="success">
                  <Check size={13} aria-hidden="true" />
                  Concluída
                </Badge>
              )}
            </div>

            {!progress && book.description && (
              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                {book.description}
              </p>
            )}
          </div>

          {progress && !completed ? (
            <div className="mt-5">
              <ProgressBar
                value={percentage}
                label={`Progresso em ${book.title}`}
              />
              <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                <span className="text-muted dark:text-night-muted">
                  Seção {progress.current_section} de {book.total_sections || '?'}
                </span>
                <strong className="text-sage-800 dark:text-sage-300">
                  {percentage}%
                </strong>
              </div>
            </div>
          ) : (
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">
              {completed ? 'Revisitar obra' : 'Conhecer esta obra'}
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
