import { ArrowLeft, BookOpen, Compass, FileText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { Button, PageLoader } from '@/components/ui'
import { BookCover, EditorialCard } from '@/components/northstar/NorthStarUI'
import { getBookSummary } from '@/features/summaries/summaryContent'

const ACCENTS = {
  1: '#5E7664',
  2: '#AB6D50',
  3: '#B9A46E',
  4: '#8FA68F',
  5: '#C98C6B',
}

export default function SummaryDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const books = useBooks()
  const bookId = Number(id)
  const book = books.find((item) => item.id === bookId)
  const summary = getBookSummary(bookId)

  if (!book || !summary) return <PageLoader label="Carregando resumo" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-7">
        <button
          type="button"
          onClick={() => navigate('/resumos')}
          className="flex min-h-11 items-center gap-2 rounded-vesSm px-1 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Resumos
        </button>

        <header className="mt-5 flex items-start gap-4">
          <BookCover book={book} size="sm" color={ACCENTS[book.id]} />
          <div className="min-w-0 flex-1 pt-1">
            <p className="ves-eyebrow">{summary.eyebrow}</p>
            <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-tight text-ink dark:text-night-ink">
              {book.title}
            </h1>
            <p className="mt-2 text-xs text-muted dark:text-night-muted">Resumo de estudo do Vereda</p>
          </div>
        </header>

        <EditorialCard className="mt-7 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
              <FileText size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-night-ink">Em poucas palavras</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">{summary.overview}</p>
            </div>
          </div>
        </EditorialCard>

        <section className="mt-7" aria-labelledby="themes-heading">
          <h2 id="themes-heading" className="northstar-section-title">Temas centrais</h2>
          <ol className="mt-3 space-y-2.5">
            {summary.themes.map((theme, index) => (
              <li key={theme} className="flex items-start gap-3 rounded-vesMd border border-line bg-surface p-4 dark:border-night-line dark:bg-night-surface">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-50 text-xs font-bold text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-ink/85 dark:text-night-ink/90">{theme}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-7" aria-labelledby="questions-heading">
          <h2 id="questions-heading" className="northstar-section-title">Perguntas para levar à obra</h2>
          <EditorialCard className="mt-3 divide-y divide-line p-0 dark:divide-night-line">
            {summary.questions.map((question) => (
              <div key={question} className="flex items-start gap-3 p-4">
                <Compass size={18} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-muted dark:text-night-muted">{question}</p>
              </div>
            ))}
          </EditorialCard>
        </section>

        <EditorialCard className="mt-7 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-700 dark:bg-clay-950/20 dark:text-clay-300">
              <BookOpen size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-night-ink">Para estudar melhor</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">{summary.note}</p>
            </div>
          </div>
        </EditorialCard>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => navigate(`/livro/${book.id}`)} className="w-full">
            <BookOpen size={18} aria-hidden="true" />
            Abrir a obra
          </Button>
          <Button variant="secondary" onClick={() => navigate('/descobrir')} className="w-full">
            <Compass size={18} aria-hidden="true" />
            Explorar um tema
          </Button>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted dark:text-night-muted">
          Este resumo organiza ideias gerais para estudo. Em caso de dúvida, prevalece sempre o texto integral da obra.
        </p>
      </div>
    </main>
  )
}
