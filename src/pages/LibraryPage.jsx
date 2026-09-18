import { useMemo, useState } from 'react'
import { ArrowRight, BookPlus, Compass, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks, useProgress } from '@/hooks'
import { useReadingStore } from '@/store'
import { PageLoader } from '@/components/ui'
import {
  BookCover,
  EditorialCard,
  ProgressLine,
} from '@/components/northstar/NorthStarUI'

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'concluidos', label: 'Concluídos' },
]

const BOOK_ACCENT_COLORS = {
  1: '#53664E',
  2: '#8B745E',
  3: '#A78E5F',
  4: '#70866E',
  5: '#8E6F58',
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { progress } = useReadingStore()
  const [filter, setFilter] = useState('todos')

  const visibleBooks = useMemo(() => {
    if (filter === 'todos') return books

    return books.filter((book) => {
      const status = getStudyStatus(progress[book.id])
      return filter === 'andamento' ? status === 'andamento' : status === 'concluido'
    })
  }, [books, filter, progress])

  if (!books.length) return <PageLoader label="Carregando estudos" />

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Estudos</h1>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted dark:text-night-muted">
              Escolha uma obra e siga no seu ritmo, sem pressa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/descobrir')}
            className="northstar-icon-button -mr-1"
            aria-label="Buscar nas obras"
          >
            <Search size={21} aria-hidden="true" />
          </button>
        </header>

        <div
          className="mt-5 grid grid-cols-3 gap-1 rounded-[14px] bg-[#EEE4D4] p-1 dark:bg-night-surface"
          role="tablist"
          aria-label="Filtrar estudos"
        >
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`min-h-10 rounded-[11px] px-2 text-xs font-semibold transition ${
                filter === item.id
                  ? 'bg-[#FBF8F1] text-[#53664E] shadow-sm dark:bg-night dark:text-sage-300'
                  : 'text-muted hover:text-ink dark:text-night-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="mt-5" aria-labelledby="foundational-studies-heading">
          <h2 id="foundational-studies-heading" className="sr-only">Obras fundamentais</h2>

          {visibleBooks.length ? (
            <div className="space-y-3">
              {visibleBooks.map((book) => (
                <StudyRow
                  key={book.id}
                  book={book}
                  progressRecord={progress[book.id]}
                  onOpen={() => navigate(progress[book.id] ? `/ler/${book.id}` : `/livro/${book.id}`)}
                />
              ))}
            </div>
          ) : (
            <EditorialCard className="p-5 text-center">
              <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">
                Nenhum estudo aqui ainda.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                Quando você avançar nas obras, elas aparecerão automaticamente nesta visão.
              </p>
            </EditorialCard>
          )}
        </section>

        <section className="mt-7" aria-labelledby="guided-study-heading">
          <EditorialCard className="overflow-hidden p-0">
            <button
              type="button"
              onClick={() => navigate('/estudo-guiado')}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEE4D4] text-[#53664E] dark:bg-night dark:text-sage-300">
                <Compass size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span id="guided-study-heading" className="block text-xs font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">
                  Estudo guiado
                </span>
                <span className="mt-1 block font-display text-base font-semibold text-ink dark:text-night-ink">
                  Prefere estudar com companhia?
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted dark:text-night-muted">
                  Encontros curtos para ler, compreender e refletir passo a passo.
                </span>
              </span>
              <ArrowRight size={18} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
            </button>
          </EditorialCard>
        </section>

        <section className="mt-5" aria-labelledby="complementary-heading">
          <button
            type="button"
            onClick={() => navigate('/sugerir-obra')}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-line/80 bg-transparent px-4 text-sm font-semibold text-sage-800 hover:bg-surface-soft dark:border-night-line dark:text-sage-300"
          >
            <BookPlus size={17} aria-hidden="true" />
            <span id="complementary-heading">Sugerir uma obra complementar</span>
          </button>
        </section>
      </div>
    </main>
  )
}

function StudyRow({ book, progressRecord, onOpen }) {
  const percentage = useProgress(book.id, book.total_sections)
  const sequence = getBookSequence(book)
  const accent = BOOK_ACCENT_COLORS[sequence] || '#53664E'
  const currentSection = Math.max(0, Number(progressRecord?.current_section) || 0)
  const totalSections = Number(book.total_sections) || null
  const status = getStudyStatus(progressRecord)

  return (
    <EditorialCard as="button" type="button" onClick={onOpen} className="w-full p-3.5 text-left">
      <div className="flex items-center gap-3.5">
        <BookCover book={book} size="sm" color={accent} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.03rem] font-semibold leading-tight text-ink dark:text-night-ink">
            {book.title}
          </p>
          <p className="mt-1 text-xs text-muted dark:text-night-muted">
            {book.author || 'Allan Kardec'}
          </p>
          <div className="mt-3">
            <ProgressLine value={percentage} />
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted dark:text-night-muted">
                {status === 'concluido'
                  ? 'Concluído'
                  : totalSections
                    ? `${currentSection || 0} de ${totalSections} trechos`
                    : `${percentage}% concluído`}
              </p>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              >
                <ArrowRight size={15} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </EditorialCard>
  )
}

function getStudyStatus(record) {
  if (record?.book_completed || record?.completed_at) return 'concluido'
  if ((Number(record?.current_section) || 0) > 0 || record?.last_read_at) return 'andamento'
  return 'nao-iniciado'
}

function getBookSequence(book) {
  const displayOrder = Number(book.display_order)
  if (Number.isFinite(displayOrder) && displayOrder > 0) return displayOrder

  const bookId = Number(book.id)
  return Number.isFinite(bookId) && bookId > 0 ? bookId : '•'
}
