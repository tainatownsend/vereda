import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  ListTree,
  MoreHorizontal,
  RefreshCw,
  Type,
  X,
} from 'lucide-react'

import { useAuthStore, useUIStore } from '@/store'
import { useBooks } from '@/hooks'
import { getReaderPrimaryAction, READER_COPY } from '@/features/reader/readerCopy'
import { READER_PHASE } from '@/features/reader/readerMachine'
import {
  extractChapterOverview,
  extractChapterTopics,
} from '@/features/reader/readerStructure'
import BookIndexPanel from '@/features/reader/BookIndexPanel'
import { useReadingSession } from '@/features/reader/useReadingSession'
import { isPassageSaved } from '@/features/savedPassages/savedPassages'
import { Button, PageLoader } from '@/components/ui'

const FONT_SIZES = [
  { id: 'sm', label: 'Pequena', className: 'text-[17px]' },
  { id: 'md', label: 'Média', className: 'text-[20px]' },
  { id: 'lg', label: 'Grande', className: 'text-[24px]' },
  { id: 'xl', label: 'Extra', className: 'text-[28px]' },
]

export default function ReaderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const books = useBooks()
  const { user, savePassage, removeSavedPassage } = useAuthStore()
  const { fontSize, setFontSize } = useUIStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showIndex, setShowIndex] = useState(false)
  const [showTextSettings, setShowTextSettings] = useState(false)
  const [savingPassage, setSavingPassage] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const menuRef = useRef(null)
  const requestedPositionRef = useRef(null)

  const bookId = Number(id)
  const revisitMode = searchParams.get('revisit') === '1'
  const requestedPosition = Number(searchParams.get('section') || 0)
  const book = books.find((item) => item.id === bookId)

  const session = useReadingSession({
    userId: user?.id,
    bookId: book?.id,
    revisitMode,
  })

  const currentSection = session.currentSection
  const isChapterIntro = currentSection?.kind === 'chapter_intro'
  const isPartIntro = currentSection?.kind === 'part_intro'
  const isFinalReadingUnit =
    Boolean(currentSection?.sec_position) &&
    Number(currentSection.sec_position) === Number(session.lastPosition)
  const primaryAction = getReaderPrimaryAction({ isChapterIntro, isFinalReadingUnit })

  useEffect(() => {
    if (
      session.phase !== READER_PHASE.READING ||
      !requestedPosition ||
      requestedPosition < 1 ||
      requestedPositionRef.current === requestedPosition
    ) return

    requestedPositionRef.current = requestedPosition
    session.jumpToSection({ sec_position: requestedPosition })
  }, [requestedPosition, session])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
        setShowTextSettings(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowMenu(false)
        setShowTextSettings(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showMenu])

  useEffect(() => {
    if (!currentSection?.section_id) return undefined
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [currentSection?.section_id])

  useEffect(() => {
    setSaveStatus('')
  }, [currentSection?.section_id])

  if (!book || session.phase === READER_PHASE.LOADING) {
    return <PageLoader label="Preparando sua leitura" />
  }

  if (session.phase === READER_PHASE.ERROR) {
    return <ReaderError message={session.error?.message} onRetry={session.reload} onBack={() => navigate('/home')} />
  }

  if (session.phase === READER_PHASE.BOOK_COMPLETE) {
    return (
      <ReaderMessage
        eyebrow="Obra concluída"
        title="Você chegou ao fim desta obra."
        description={`Seu caminho em ${book.title} foi salvo. Você pode voltar a qualquer trecho quando quiser.`}
        actionLabel="Voltar ao início"
        onAction={() => navigate('/home')}
      />
    )
  }

  if (session.phase === READER_PHASE.DAILY_GOAL_COMPLETE) {
    return (
      <ReaderMessage
        eyebrow="Bom ponto para uma pausa"
        title="Você pode encerrar por aqui ou seguir lendo."
        description={`O lugar onde você parou em ${book.title} está salvo. Não há obrigação de continuar agora.`}
        actionLabel="Voltar ao início"
        onAction={() => navigate('/home')}
        secondaryLabel="Continuar lendo"
        onSecondary={session.continueAfterGoal}
      />
    )
  }

  if (!currentSection) {
    return <ReaderError message={READER_COPY.missingContinuation} onRetry={session.reload} onBack={() => navigate('/home')} />
  }

  const fontClass = FONT_SIZES.find((option) => option.id === fontSize)?.className || 'text-[20px]'
  const paragraphs = isChapterIntro || isPartIntro
    ? []
    : (currentSection.content || '')
        .split(/\n\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)

  const passageSaved = isPassageSaved(user, currentSection.section_id)

  const toggleSavedPassage = async () => {
    if (savingPassage || isChapterIntro || isPartIntro) return
    setSavingPassage(true)
    setSaveStatus('')
    try {
      if (passageSaved) {
        await removeSavedPassage(currentSection.section_id)
        setSaveStatus('Trecho removido dos salvos.')
      } else {
        await savePassage(currentSection.section_id)
        setSaveStatus('Trecho salvo para consultar depois.')
      }
    } catch {
      setSaveStatus('Não foi possível alterar este trecho salvo agora.')
    } finally {
      setSavingPassage(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink dark:bg-night dark:text-night-ink">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/96 backdrop-blur-xl dark:border-night-line dark:bg-night/96">
        <div className="mx-auto flex min-h-[4.6rem] max-w-[44rem] items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => navigate('/home')} className="northstar-icon-button -ml-2" aria-label="Voltar ao início">
            <ChevronLeft size={22} />
          </button>

          <p className="min-w-0 flex-1 truncate font-display text-[1rem] font-semibold text-ink dark:text-night-ink">
            {book.title}
          </p>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMenu((visible) => !visible)
                setShowTextSettings(false)
              }}
              className="northstar-icon-button -mr-2"
              aria-label="Opções de leitura"
              aria-expanded={showMenu}
            >
              {showMenu ? <X size={20} /> : <MoreHorizontal size={22} />}
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-[16px] border border-line bg-surface p-2 shadow-editorial dark:border-night-line dark:bg-night-surface">
                <MenuButton icon={ListTree} label="Índice da obra" onClick={() => {
                  setShowMenu(false)
                  setShowIndex(true)
                  session.loadBookIndex()
                }} />
                <MenuButton icon={Type} label="Preferências de texto" onClick={() => setShowTextSettings((visible) => !visible)} />
                <MenuButton icon={Home} label="Voltar ao início" onClick={() => navigate('/home')} />
                {showTextSettings && <ReaderSettings fontSize={fontSize} setFontSize={setFontSize} />}
              </div>
            )}
          </div>
        </div>
      </header>

      {session.goalNoticeVisible && (
        <div role="status" aria-live="polite" className="mx-auto max-w-[44rem] px-5 pt-5 sm:px-8">
          <div className="flex items-start gap-3 rounded-[15px] border border-sage-200 bg-sage-50 px-4 py-4 dark:border-sage-900 dark:bg-sage-950/40">
            <Check size={18} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" />
            <p className="text-sm leading-relaxed text-muted dark:text-night-muted">{READER_COPY.dailyGoalNotice}</p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[44rem] px-5 pb-32 pt-10 sm:px-8 sm:pt-14">
        {isPartIntro ? (
          <PartIntro section={currentSection} />
        ) : isChapterIntro ? (
          <ChapterIntro section={currentSection} />
        ) : (
          <>
            <SectionHeading currentSection={currentSection} />
            <article className={`font-display leading-[1.82] text-ink dark:text-night-ink ${fontClass}`}>
              {paragraphs.map((paragraph, index) => (
                <Paragraph key={`${currentSection.section_id}-${index}`} text={paragraph} />
              ))}
            </article>
          </>
        )}

        {saveStatus && (
          <p role="status" aria-live="polite" className="mt-8 text-sm text-muted dark:text-night-muted">
            {saveStatus}
          </p>
        )}
      </main>

      <BookIndexPanel
        open={showIndex}
        onClose={() => setShowIndex(false)}
        bookTitle={book.title}
        sections={session.bookIndexSections}
        loading={session.indexLoading}
        viewedPosition={currentSection.sec_position}
        persistedPosition={session.readerState?.current_section || 1}
        bookCompleted={Boolean(session.readerState?.book_completed)}
        onSelect={async (section) => {
          setShowIndex(false)
          await session.jumpToSection(section)
        }}
      />

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/96 pb-safe backdrop-blur-xl dark:border-night-line dark:bg-night/96">
        <div className="mx-auto grid h-[4.4rem] max-w-[44rem] grid-cols-[2.75rem_1fr_2.75rem] items-center px-4 sm:px-6">
          <button
            type="button"
            onClick={session.goToPrevious}
            disabled={currentSection.sec_position <= 1}
            className="northstar-reader-control justify-self-start disabled:opacity-25"
            aria-label={READER_COPY.actions.previous.ariaLabel}
          >
            <ChevronLeft size={23} />
          </button>

          <div className="flex items-center justify-center gap-8">
            <button type="button" onClick={() => stepFont(fontSize, setFontSize, -1)} className="northstar-reader-control" aria-label="Diminuir tamanho do texto">A−</button>
            <button type="button" onClick={() => stepFont(fontSize, setFontSize, 1)} className="northstar-reader-control" aria-label="Aumentar tamanho do texto">A+</button>
            <button
              type="button"
              onClick={toggleSavedPassage}
              disabled={savingPassage || isChapterIntro || isPartIntro}
              aria-pressed={passageSaved}
              className="northstar-reader-control disabled:opacity-35"
              aria-label={passageSaved ? 'Remover este trecho dos salvos' : 'Salvar este trecho'}
            >
              <Bookmark size={21} fill={passageSaved ? 'currentColor' : 'none'} />
            </button>
          </div>

          <button
            type="button"
            onClick={session.completeCurrentSection}
            disabled={session.saving}
            className="northstar-reader-control justify-self-end disabled:opacity-35"
            aria-label={primaryAction.ariaLabel}
          >
            {session.saving ? (
              <RefreshCw size={19} className="animate-spin" />
            ) : primaryAction.icon === 'complete' ? (
              <Check size={22} />
            ) : (
              <ChevronRight size={23} />
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}

function MenuButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-sm font-medium text-ink hover:bg-surface-soft dark:text-night-ink dark:hover:bg-night">
      <Icon size={18} className="text-sage-700 dark:text-sage-300" />
      {label}
    </button>
  )
}

function ReaderSettings({ fontSize, setFontSize }) {
  return (
    <div className="mt-2 border-t border-line px-2 pb-2 pt-3 dark:border-night-line">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">Tamanho</p>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {FONT_SIZES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFontSize(option.id)}
            aria-pressed={fontSize === option.id}
            className={`min-h-9 rounded-[10px] text-xs font-semibold ${fontSize === option.id ? 'bg-sage-700 text-white dark:bg-sage-300 dark:text-sage-950' : 'bg-surface-soft text-ink dark:bg-night dark:text-night-ink'}`}
          >
            {option.id.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

function stepFont(current, setter, direction) {
  const order = FONT_SIZES.map((item) => item.id)
  const currentIndex = Math.max(0, order.indexOf(current))
  const nextIndex = Math.max(0, Math.min(order.length - 1, currentIndex + direction))
  setter(order[nextIndex])
}

function Paragraph({ text }) {
  if (text.startsWith('[Nota:')) {
    return (
      <p className="mb-7 border-l-2 border-sage-300 pl-4 text-[0.82em] italic leading-relaxed text-muted last:mb-0 dark:border-sage-800 dark:text-night-muted">
        {text.replace(/^\[Nota:\s*/, 'Nota: ').replace(/\]$/, '')}
      </p>
    )
  }

  const numberedItem = text.match(/^(\d+\.)\s*([\s\S]*)$/)
  if (numberedItem) {
    return <p className="mb-7 mt-10 first:mt-0 last:mb-0"><strong>{numberedItem[1]}</strong> {numberedItem[2]}</p>
  }

  return <p className="mb-7 last:mb-0">{text}</p>
}

function SectionHeading({ currentSection }) {
  const hierarchy = [currentSection.part_title, currentSection.chapter_label].filter(Boolean).join(' · ')
  const heading = currentSection.section_title || currentSection.chapter_title || currentSection.title

  return (
    <div className="mb-9">
      {hierarchy && <p className="text-sm font-medium text-ink/80 dark:text-night-muted">{hierarchy}</p>}
      {heading && (
        <h1 className="mt-2 max-w-xl font-display text-[2.2rem] font-semibold leading-[1.12] tracking-[-0.025em] text-ink dark:text-night-ink">
          {heading}
        </h1>
      )}
    </div>
  )
}

function ChapterIntro({ section }) {
  const topics = extractChapterTopics(section.content)
  const overline = [section.part_title?.split('—')[0]?.trim(), section.chapter_label].filter(Boolean).join(' · ')

  return (
    <section className="py-3 sm:py-7">
      {overline && <p className="text-sm font-medium text-ink/80 dark:text-night-muted">{overline}</p>}
      <h1 className="mt-2 font-display text-[2.3rem] font-semibold leading-[1.12] text-ink dark:text-night-ink">{section.chapter_title || section.title}</h1>
      {topics.length > 0 && (
        <ol className="mt-7 space-y-3">
          {topics.map((topic, index) => (
            <li key={`${topic}-${index}`} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-800 dark:bg-sage-950 dark:text-sage-300">{index + 1}</span>
              <p className="pt-0.5 text-base leading-relaxed text-muted dark:text-night-muted">{topic}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function PartIntro({ section }) {
  const [label, title] = (section.title || section.part_title || '').split('—').map((value) => value?.trim())
  const chapterOverview = extractChapterOverview(section.content)

  return (
    <section className="py-4 sm:py-8">
      {label && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">{label}</p>}
      <h1 className="mt-3 max-w-xl font-display text-[2.45rem] font-semibold leading-[1.08] text-ink dark:text-night-ink">{title || label}</h1>
      {chapterOverview.length > 0 && (
        <div className="mt-8 border-t border-line pt-5 dark:border-night-line">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted dark:text-night-muted">Nesta parte</p>
          <ol className="mt-3 space-y-2.5">
            {chapterOverview.map((chapter) => (
              <li key={`${chapter.label}-${chapter.title}`} className="rounded-[13px] border border-line/80 bg-surface px-4 py-3 font-display text-base leading-snug text-ink dark:border-night-line dark:bg-night-surface dark:text-night-ink">
                <span className="font-semibold">{chapter.label}</span>
                <span className="ml-2">{chapter.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

function ReaderMessage({ eyebrow, title, description, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <main className="northstar-page flex min-h-screen items-center px-6 py-12">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300"><Check size={30} /></div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[2.35rem] font-semibold leading-[1.08] text-ink dark:text-night-ink">{title}</h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">{description}</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onAction}><Home size={19} />{actionLabel}</Button>
          {secondaryLabel && onSecondary && <Button variant="secondary" onClick={onSecondary}>{secondaryLabel}<ChevronRight size={19} /></Button>}
        </div>
      </div>
    </main>
  )
}

function ReaderError({ message, onRetry, onBack }) {
  return (
    <main className="northstar-page flex min-h-screen items-center px-6 py-12">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle size={30} /></div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Não foi possível continuar</p>
        <h1 className="mt-3 font-display text-[2.2rem] font-semibold leading-[1.08] text-ink dark:text-night-ink">O lugar onde você parou continua protegido.</h1>
        <p role="alert" className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">{message || 'Ocorreu um erro inesperado. Tente novamente.'}</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onRetry}><RefreshCw size={19} />Tentar novamente</Button>
          <Button variant="secondary" onClick={onBack}><Home size={19} />Voltar ao início</Button>
        </div>
      </div>
    </main>
  )
}
