import { useEffect, useRef, useState } from 'react'
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
  const menuButtonRef = useRef(null)
  const menuRef = useRef(null)
  const savedCount = getSavedPassageIds(user).length

  useEffect(() => {
    if (!showMenu) return undefined

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || menuButtonRef.current?.contains(event.target)) return
      setShowMenu(false)
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setShowMenu(false)
      menuButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showMenu])

  if (!books.length) return <PageLoader label="Carregando obras" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header className="relative flex items-center justify-between gap-4">
          <h1 className="font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Biblioteca</h1>
          <button
            ref={menuButtonRef}
            type="button"
            className="northstar-icon-button"
            aria-label="Opções da biblioteca"
            aria-expanded={showMenu}
            aria-haspopup="menu"
            onClick={() => setShowMenu((visible) => !visible)}
          >
            <MoreHorizontal size={21} />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 top-12 z-30 w-[min(21rem,calc(100vw-3rem))] rounded-[16px] border border-line bg-surface p-3 shadow-editorial dark:border-night-line dark:bg-night-surface"
            >
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
          <section className="mt-5" aria-labelledby="all-books-heading">
            <div className="rounded-vesMd border border-sage-200 bg-sage-50/70 p-4 dark:border-night-line dark:bg-night-surface/85">
              <h2 id="all-books-heading" className="font-display text-xl font-semibold text-ink dark:text-night-ink">
                Uma jornada pelas obras básicas
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/75 dark:text-night-muted">
                A ordem abaixo é apenas uma sugestão, não uma obrigação. Comece por qualquer obra e retome sempre de onde parou.
              </p>
            </div>

            <ol className="mt-5 space-y-3" aria-label="Caminho sugerido pelas obras básicas">
              {books.map((book, index) => (
                <BookJourneyRow
                  key={book.id}
                  book={book}
                  isLast={index === books.length - 1}
                  onOpen={() => navigate(progress[book.id] ? `/ler/${book.id}` : `/livro/${book.id}`)}
                />
              ))}
            </ol>
          </section>
        ) : (
          <EditorialCard className="mt-5 p-6 text-center">
            <p className="font-display text-xl font-semibold text-ink dark:text-night-ink">Biblioteca complementar</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted dark:text-night-muted">
              Outras obras poderão ampliar esta biblioteca depois da consolidação do núcleo fundamental.
            </p>
            <button
              type="button"
              onClick={() => navigate('/sugerir-obra')}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-vesSm border border-sage-300 bg-surface px-4 text-sm font-semibold text-sage-800 shadow-sm hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-200"
            >
              <BookPlus size={18} />
              Sugerir uma obra complementar
            </button>
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
      role="menuitem"
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
      className={`relative min-h-12 px-3 text-sm font-medium ${active ? 'text-sage-800 dark:text-sage-200' : 'text-muted dark:text-night-muted'}`}
    >
      {children}
      {active && <span className="absolute inset-x-5 bottom-[-1px] h-[2px] bg-sage-600 dark:bg-sage-300" />}
    </button>
  )
}

function BookJourneyRow({ book, isLast, onOpen }) {
  const percentage = useProgress(book.id, book.total_sections)
  const sequence = getBookSequence(book)
  const accent = BOOK_ACCENT_COLORS[sequence] || '#5E7664'

  return (
    <li className="relative grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center" aria-hidden="true">
        {!isLast && (
          <span className="absolute left-1/2 top-11 bottom-[-0.9rem] w-[2px] -translate-x-1/2 rounded-full bg-line dark:bg-night-line" />
        )}
        <span
          className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 bg-canvas font-display text-base font-semibold shadow-sm dark:bg-night-surface"
          style={{ borderColor: accent, color: accent }}
        >
          {sequence}
        </span>
      </div>

      <EditorialCard as="button" type="button" onClick={onOpen} className="w-full p-3.5 text-left">
        <div className="flex items-center gap-3.5">
          <BookCover book={book} size="sm" color={accent} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.03rem] font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</p>
            <p className="mt-1 text-xs text-muted dark:text-night-muted">{book.author || 'Allan Kardec'}</p>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-medium text-muted dark:text-night-muted">
                <span>Seu progresso</span>
                <span className="font-semibold text-sage-700 dark:text-sage-300">{percentage}%</span>
              </div>
              <ProgressLine value={percentage} />
            </div>
          </div>
        </div>
      </EditorialCard>
    </li>
  )
}

function getBookSequence(book) {
  const displayOrder = Number(book.display_order)
  if (Number.isFinite(displayOrder) && displayOrder > 0) return displayOrder

  const bookId = Number(book.id)
  return Number.isFinite(bookId) && bookId > 0 ? bookId : '•'
}
