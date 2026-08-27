import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks, useProgress } from '@/hooks'
import { useReadingStore } from '@/store'
import { PageLoader } from '@/components/ui'
import {
  BookCover,
  EditorialCard,
  ProgressLine,
} from '@/components/northstar/NorthStarUI'

export default function LibraryPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { progress } = useReadingStore()
  const [tab, setTab] = useState('basicas')

  if (!books.length) return <PageLoader label="Carregando obras" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header className="flex items-center justify-between gap-4">
          <h1 className="font-display text-[2rem] font-medium text-[#233326] dark:text-night-ink">Biblioteca</h1>
          <button type="button" className="northstar-icon-button" aria-label="Mais opções">
            <MoreHorizontal size={21} />
          </button>
        </header>

        <div className="mt-6 grid grid-cols-2 border-b border-[#e4ded4] dark:border-night-line" role="tablist" aria-label="Tipos de obra">
          <TabButton active={tab === 'basicas'} onClick={() => setTab('basicas')}>Básicas</TabButton>
          <TabButton active={tab === 'complementares'} onClick={() => setTab('complementares')}>Complementares</TabButton>
        </div>

        {tab === 'basicas' ? (
          <div className="mt-4 space-y-2">
            {books.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                progress={progress[book.id]}
                onOpen={() => navigate(progress[book.id] ? `/ler/${book.id}` : `/livro/${book.id}`)}
              />
            ))}
          </div>
        ) : (
          <EditorialCard className="mt-5 p-6 text-center">
            <p className="font-display text-xl text-[#283328] dark:text-night-ink">Biblioteca complementar</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#72796f] dark:text-night-muted">
              Esta área já está preparada visualmente. As obras complementares entram depois da consolidação das obras básicas.
            </p>
          </EditorialCard>
        )}
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
      className={`relative min-h-12 px-3 text-sm font-medium ${active ? 'text-[#405239] dark:text-sage-300' : 'text-[#73786f] dark:text-night-muted'}`}
    >
      {children}
      {active && <span className="absolute inset-x-5 bottom-[-1px] h-[2px] bg-[#657852]" />}
    </button>
  )
}

function BookRow({ book, progress, onOpen }) {
  const percentage = useProgress(book.id, book.total_sections)

  return (
    <EditorialCard as="button" type="button" onClick={onOpen} className="w-full p-3.5 text-left">
      <div className="flex items-center gap-4">
        <BookCover book={book} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.05rem] font-medium leading-tight text-[#243327] dark:text-night-ink">{book.title}</p>
          <p className="mt-1 text-xs text-[#747a70] dark:text-night-muted">{book.author || 'Allan Kardec'}</p>
          <div className="mt-4 flex items-center gap-3">
            <ProgressLine value={percentage} className="flex-1" />
            <span className="min-w-9 text-right text-[11px] font-semibold text-[#4f5f43] dark:text-sage-300">{percentage}%</span>
          </div>
        </div>
      </div>
    </EditorialCard>
  )
}
