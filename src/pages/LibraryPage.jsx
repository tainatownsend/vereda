import { useState } from 'react'
import { BookPlus, Bookmark, Compass, MoreHorizontal } from 'lucide-react'
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
            <p className="font-display text-xl font-semibold text-ink dark:text-night-ink">Biblioteca complementar</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted dark:text-night-muted">
              A estrutura está pronta para receber outras obras depois da consolidação do núcleo fundamental.
            </p>
          </EditorialCard>
        )}

        <section className="mt-7" aria-labelledby="paths-heading">
          <h2 id="paths-heading" className="northstar-section-title">Outros caminhos</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <LibraryAction icon={Compass} title="Explorar um tema" onClick={() => navigate('/descobrir')} />
            <LibraryAction icon={Bookmark} title={savedCount ? `${savedCount} trechos salvos` : 'Trechos salvos'} onClick={() => navigate('/salvos')} />
            <LibraryAction icon={BookPlus} title="Sugerir uma obra" onClick={() => navigate('/sugerir-obra')} />
          </div>
        </section>
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

  return (
    <EditorialCard as="button" type="button" onClick={onOpen} className="w-full p-3.5 text-left">
      <div className="flex items-center gap-4">
        <BookCover book={book} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.03rem] font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</p>
          <p className="mt-1 text-xs text-muted dark:text-night-muted">{book.author || 'Allan Kardec'}</p>
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

function LibraryAction({ icon: Icon, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 items-center gap-3 rounded-[14px] border border-line bg-surface px-4 text-left text-sage-800 dark:border-night-line dark:bg-night-surface dark:text-sage-300"
    >
      <Icon size={19} className="shrink-0" />
      <span className="text-xs font-semibold text-ink dark:text-night-ink">{title}</span>
    </button>
  )
}
