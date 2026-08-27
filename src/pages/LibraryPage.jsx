import { useState } from 'react'
import { Bookmark, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks, useProgress } from '@/hooks'
import { useAuthStore, useReadingStore } from '@/store'
import { PageLoader } from '@/components/ui'
import { getSavedPassageIds } from '@/features/savedPassages/savedPassages'
import {
  BookCover,
  EditorialCard,
  ProgressLine,
} from '@/components/northstar/NorthStarUI'

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
  const [tab, setTab] = useState('basicas')
  const savedCount = getSavedPassageIds(user).length

  if (!books.length) return <PageLoader label="Carregando obras" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header className="flex items-center justify-between gap-4">
          <h1 className="font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Biblioteca</h1>
          <button type="button" className="northstar-icon-button" aria-label="Mais opções">
            <MoreHorizontal size={21} />
          </button>
        </header>

        <div className="mt-6 grid grid-cols-2 border-b border-line dark:border-night-line" role="tablist" aria-label="Tipos de obra">
          <TabButton active={tab === 'basicas'} onClick={() => setTab('basicas')}>Básicas</TabButton>
          <TabButton active={tab === 'complementares'} onClick={() => setTab('complementares')}>Complementares</TabButton>
        </div>

        {tab === 'basicas' ? (
          <>
            <aside className="mt-4 rounded-[15px] border border-line/80 bg-surface-soft/55 px-4 py-4 dark:border-night-line dark:bg-night-surface">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Sequência sugerida das obras</p>
              <h2 className="mt-1 font-display text-[1rem] font-semibold text-ink dark:text-night-ink">Uma sequência sugerida, não uma obrigação</h2>
              <div className="mt-3 flex items-center gap-1" aria-label="Sequência sugerida das obras">
                {books.map((book, index) => {
                  const sequence = getBookSequence(book)
                  return (
                    <div key={book.id} className={`flex items-center ${index < books.length - 1 ? 'flex-1' : ''}`}>
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-display text-[11px] font-semibold text-sage-800 dark:border-night-line dark:bg-night dark:text-sage-300"
                        aria-label={`Obra ${sequence}: ${book.title}`}
                      >
                        {sequence}
                      </span>
                      {index < books.length - 1 && <span className="mx-1 h-px flex-1 bg-line dark:bg-night-line" aria-hidden="true" />}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => navigate('/comecar')} className="min-h-10 rounded-[11px] border border-line bg-surface px-2 text-[10px] font-semibold text-ink dark:border-night-line dark:bg-night dark:text-night-ink">
                  Não sei por onde começar
                </button>
                <button type="button" onClick={() => navigate('/descobrir')} className="min-h-10 rounded-[11px] border border-line bg-surface px-2 text-[10px] font-semibold text-ink dark:border-night-line dark:bg-night dark:text-night-ink">
                  Quero explorar um tema
                </button>
              </div>
            </aside>

            <section className="mt-4" aria-labelledby="all-books-heading">
              <h2 id="all-books-heading" className="sr-only">Obras básicas</h2>
              <div className="space-y-2">
                {books.map((book) => (
                  <BookRow
                    key={book.id}
                    book={book}
                    progress={progress[book.id]}
                    onOpen={() => navigate(progress[book.id] ? `/ler/${book.id}` : `/livro/${book.id}`)}
                  />
                ))}
              </div>
            </section>
          </>
        ) : (
          <EditorialCard className="mt-5 p-6 text-center">
            <p className="font-display text-xl font-semibold text-ink dark:text-night-ink">Biblioteca complementar</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted dark:text-night-muted">
              A estrutura está pronta para receber outras obras depois da consolidação do núcleo fundamental.
            </p>
          </EditorialCard>
        )}

        <button
          type="button"
          onClick={() => navigate('/salvos')}
          className="mt-6 flex w-full items-center gap-3 rounded-[15px] border border-line bg-surface px-4 py-4 text-left dark:border-night-line dark:bg-night-surface"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
            <Bookmark size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink dark:text-night-ink">Trechos salvos</span>
            <span className="mt-0.5 block text-xs text-muted dark:text-night-muted">
              {savedCount ? `${savedCount} ${savedCount === 1 ? 'passagem guardada' : 'passagens guardadas'}` : 'Guarde passagens para revisitar depois.'}
            </span>
          </span>
        </button>
      </div>
    </main>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative min-h-12 px-3 text-sm font-medium ${active ? 'text-sage-800 dark:text-sage-300' : 'text-muted dark:text-night-muted'}`}
    >
      {children}
      {active && <span className="absolute inset-x-5 bottom-[-1px] h-[2px] bg-sage-600" />}
    </button>
  )
}

function BookRow({ book, progress, onOpen }) {
  const percentage = useProgress(book.id, book.total_sections)
  const sequence = getBookSequence(book)

  return (
    <EditorialCard as="button" type="button" onClick={onOpen} className="w-full p-3.5 text-left">
      <div className="flex items-center gap-4">
        <BookCover book={book} size="sm" color={BOOK_ACCENT_COLORS[sequence] || '#5E7664'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-50 text-[9px] font-semibold text-sage-800 dark:bg-sage-950 dark:text-sage-300">{sequence}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[1.03rem] font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</p>
              <p className="mt-1 text-xs text-muted dark:text-night-muted">{book.author || 'Allan Kardec'}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ProgressLine value={percentage} className="flex-1" />
            <span className="min-w-9 text-right text-[11px] font-semibold text-sage-700 dark:text-sage-300">{percentage}%</span>
          </div>
          {!progress && <p className="mt-2 text-[10px] text-muted dark:text-night-muted">Ainda não iniciada</p>}
        </div>
      </div>
    </EditorialCard>
  )
}

function getBookSequence(book) {
  const displayOrder = Number(book.display_order)
  if (Number.isFinite(displayOrder) && displayOrder > 0) return displayOrder

  const bookId = Number(book.id)
  return Number.isFinite(bookId) && bookId > 0 ? bookId : '•'
}
