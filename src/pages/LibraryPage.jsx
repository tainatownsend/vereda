import { useState } from 'react'
import { BookOpen, BookPlus, Bookmark, Compass, MoreHorizontal } from 'lucide-react'
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
  const [showMenu, setShowMenu] = useState(false)
  const savedCount = getSavedPassageIds(user).length

  if (!books.length) return <PageLoader label="Carregando obras" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header className="relative flex items-center justify-between gap-4">
          <h1 className="font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Biblioteca</h1>
          <button
            type="button"
            className="northstar-icon-button"
            aria-label="Opções da biblioteca"
            aria-expanded={showMenu}
            onClick={() => setShowMenu((visible) => !visible)}
          >
            <MoreHorizontal size={21} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 z-30 w-[min(21rem,calc(100vw-3rem))] rounded-[16px] border border-line bg-surface p-3 shadow-editorial dark:border-night-line dark:bg-night-surface">
              <div className="space-y-1">
                <MenuAction icon={BookOpen} label="Não sei por onde começar" onClick={() => navigate('/comecar')} />
                <MenuAction icon={Compass} label="Quero explorar um tema" onClick={() => navigate('/descobrir')} />
                <MenuAction
                  icon={Bookmark}
                  label={savedCount ? `Trechos salvos · ${savedCount}` : 'Trechos salvos'}
                  onClick={() => navigate('/salvos')}
                />
                <MenuAction icon={BookPlus} label="Sugerir uma obra" onClick={() => navigate('/sugerir-obra')} />
              </div>
            </div>
          )}
        </header>

        <div className="mt-6 grid grid-cols-2 border-b border-line dark:border-night-line" role="tablist" aria-label="Tipos de obra">
          <TabButton active={tab === 'basicas'} onClick={() => setTab('basicas')}>Básicas</TabButton>
          <TabButton active={tab === 'complementares'} onClick={() => setTab('complementares')}>Complementares</TabButton>
        </div>

        {tab === 'basicas' ? (
          <section className="mt-4" aria-labelledby="all-books-heading">
            <h2 id="all-books-heading" className="sr-only">Obras básicas</h2>

            <div className="mb-4 rounded-vesMd border border-sage-200 bg-sage-50/70 p-4 dark:border-sage-900 dark:bg-sage-950/25">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">Ordem sugerida · opcional</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/80 dark:text-night-muted">
                Se quiser uma referência, siga os números mostrados em cada obra. Você pode começar por qualquer livro.
              </p>
            </div>

            <div className="space-y-2">
              {books.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  totalBooks={books.length}
                  onOpen={() => navigate(progress[book.id] ? `/ler/${book.id}` : `/livro/${book.id}`)}
                />
              ))}
            </div>
          </section>
        ) : (
          <EditorialCard className="mt-5 p-6 text-center">
            <p className="font-display text-xl font-semibold text-ink dark:text-night-ink">Biblioteca complementar</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted dark:text-night-muted">
              A estrutura está pronta para receber outras obras depois da consolidação do núcleo fundamental.
            </p>
          </EditorialCard>
        )}
      </div>
    </main>
  )
}

function MenuAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-[11px] px-2 text-left text-xs font-semibold text-ink hover:bg-surface-soft dark:text-night-ink dark:hover:bg-night"
    >
      <Icon size={17} className="shrink-0 text-sage-700 dark:text-sage-300" />
      <span>{label}</span>
    </button>
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

function BookRow({ book, totalBooks, onOpen }) {
  const percentage = useProgress(book.id, book.total_sections)
  const sequence = getBookSequence(book)

  return (
    <EditorialCard as="button" type="button" onClick={onOpen} className="w-full p-3.5 text-left">
      <div className="flex items-center gap-4">
        <BookCover book={book} size="sm" color={BOOK_ACCENT_COLORS[sequence] || '#5E7664'} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">
            Ordem sugerida · {sequence} de {totalBooks}
          </p>
          <p className="mt-1 font-display text-[1.03rem] font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</p>
          <p className="mt-1 text-xs text-muted dark:text-night-muted">{book.author || 'Allan Kardec'}</p>
          <div className="mt-4 flex items-center gap-3">
            <ProgressLine value={percentage} className="flex-1" />
            <span className="min-w-9 text-right text-[11px] font-semibold text-sage-700 dark:text-sage-300">{percentage}%</span>
          </div>
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
