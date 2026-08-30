import { ArrowRight, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { PageLoader } from '@/components/ui'
import { BookCover, EditorialCard } from '@/components/northstar/NorthStarUI'
import { getBookSummary } from '@/features/summaries/summaryContent'

const ACCENTS = {
  1: '#5E7664',
  2: '#AB6D50',
  3: '#B9A46E',
  4: '#8FA68F',
  5: '#C98C6B',
}

export default function SummariesPage() {
  const navigate = useNavigate()
  const books = useBooks()

  if (!books.length) return <PageLoader label="Carregando resumos" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="ves-eyebrow">Guia de estudo</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Resumos</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted dark:text-night-muted">
            Uma visão geral para organizar o estudo e encontrar os temas principais. Os resumos orientam, mas não substituem a leitura das obras.
          </p>
        </header>

        <section className="mt-7 space-y-3" aria-label="Resumos das obras básicas">
          {books.map((book) => {
            const summary = getBookSummary(book.id)
            if (!summary) return null

            return (
              <EditorialCard
                key={book.id}
                as="button"
                type="button"
                onClick={() => navigate(`/resumos/${book.id}`)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <BookCover book={book} size="sm" color={ACCENTS[book.id]} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-sage-700 dark:text-sage-300">
                      {summary.eyebrow}
                    </p>
                    <h2 className="mt-1 font-display text-[1.05rem] font-semibold leading-tight text-ink dark:text-night-ink">
                      {book.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted dark:text-night-muted">
                      {summary.overview}
                    </p>
                  </div>
                  <ArrowRight size={18} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                </div>
              </EditorialCard>
            )
          })}
        </section>

        <EditorialCard className="mt-6 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
              <FileText size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-night-ink">Como usar os resumos</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                Use-os antes de começar uma obra, para revisar o que já estudou ou para decidir qual tema deseja aprofundar na fonte.
              </p>
            </div>
          </div>
        </EditorialCard>
      </div>
    </main>
  )
}
