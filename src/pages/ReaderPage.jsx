import { useEffect, useRef, useState } from 'react'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  AlignJustify,
  AlignLeft,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  ListTree,
  RefreshCw,
  Type,
  X,
} from 'lucide-react'

import { useAuthStore, useUIStore } from '@/store'
import { useBooks, useReadingTime, useScrollProgress } from '@/hooks'
import { READER_PHASE } from '@/features/reader/readerMachine'
import BookIndexPanel from '@/features/reader/BookIndexPanel'
import { useReadingSession } from '@/features/reader/useReadingSession'
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
  const { user } = useAuthStore()
  const { fontSize, setFontSize } = useUIStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showIndex, setShowIndex] = useState(false)
  const [textAlign, setTextAlign] = useState('left')
  const settingsRef = useRef(null)

  const bookId = Number(id)
  const revisitMode = searchParams.get('revisit') === '1'
  const book = books.find((item) => item.id === bookId)
  const scrollPct = useScrollProgress()

  const session = useReadingSession({
    userId: user?.id,
    bookId: book?.id,
    revisitMode,
  })

  const currentSection = session.currentSection
  const readingTime = useReadingTime(currentSection?.word_count)
  const isChapterIntro = currentSection?.kind === 'chapter_intro'
  const isPartIntro = currentSection?.kind === 'part_intro'

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        showSettings &&
        settingsRef.current &&
        !settingsRef.current.contains(event.target)
      ) {
        setShowSettings(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowSettings(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSettings])

  useEffect(() => {
    if (!user?.id || !book?.id || !session.currentSection) return undefined

    const storageKey = [
      'vereda-reader-scroll',
      user.id,
      book.id,
      session.currentSection.section_id,
    ].join(':')

    const savedScroll = Number(
      window.sessionStorage.getItem(storageKey) || 0,
    )

    const restoreFrame = window.requestAnimationFrame(() => {
      if (savedScroll > 0) {
        window.scrollTo({ top: savedScroll, behavior: 'auto' })
      }
    })

    let ticking = false

    const saveScroll = () => {
      if (ticking) return
      ticking = true

      window.requestAnimationFrame(() => {
        window.sessionStorage.setItem(
          storageKey,
          String(Math.max(0, Math.round(window.scrollY))),
        )
        ticking = false
      })
    }

    window.addEventListener('scroll', saveScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(restoreFrame)
      window.removeEventListener('scroll', saveScroll)
      window.sessionStorage.setItem(
        storageKey,
        String(Math.max(0, Math.round(window.scrollY))),
      )
    }
  }, [book?.id, session.currentSection, user?.id])

  if (!book || session.phase === READER_PHASE.LOADING) {
    return <PageLoader label="Preparando sua leitura" />
  }

  if (session.phase === READER_PHASE.ERROR) {
    return (
      <ReaderError
        message={session.error?.message}
        onRetry={session.reload}
        onBack={() => navigate('/home')}
      />
    )
  }

  if (session.phase === READER_PHASE.BOOK_COMPLETE) {
    return (
      <ReaderMessage
        eyebrow="Obra concluída"
        title="Você chegou ao fim desta obra."
        description={`Seu percurso em ${book.title} foi salvo. Você pode retornar quando quiser para reler algum trecho.`}
        actionLabel="Voltar ao início"
        onAction={() => navigate('/home')}
      />
    )
  }

  if (session.phase === READER_PHASE.DAILY_GOAL_COMPLETE) {
    return (
      <ReaderMessage
        eyebrow="Momento concluído"
        title="Muito bom. Você avançou mais um pouco."
        description={`Seu progresso em ${book.title} está salvo. Você pode encerrar por aqui ou continuar lendo.`}
        actionLabel="Voltar ao início"
        onAction={() => navigate('/home')}
        secondaryLabel="Continuar lendo"
        onSecondary={session.continueAfterGoal}
      />
    )
  }

  if (!currentSection) {
    return (
      <ReaderError
        message="Não encontramos a próxima seção desta obra."
        onRetry={session.reload}
        onBack={() => navigate('/home')}
      />
    )
  }

  const bookProgressPct = session.lastPosition > 1
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((currentSection.sec_position - 1) /
              (session.lastPosition - 1)) *
              100,
          ),
        ),
      )
    : 0

  const fontClass =
    FONT_SIZES.find((option) => option.id === fontSize)?.className ||
    'text-[20px]'

  const paragraphs =
    isChapterIntro || isPartIntro
      ? []
      : (currentSection.content || '')
          .split(/\n\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)

  const breadcrumb = [
    currentSection.chapter_label,
    currentSection.chapter_title,
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <div className="min-h-screen bg-canvas text-ink dark:bg-night dark:text-night-ink">
      <div
        className="fixed inset-x-0 top-0 z-50 h-1 bg-sage-100 dark:bg-sage-950"
        aria-hidden="true"
      >
        <div
          className="h-full bg-sage-700 transition-[width] duration-100 dark:bg-sage-300"
          style={{ width: `${scrollPct}%` }}
        />
      </div>

      <header className="sticky top-1 z-40 border-b border-line bg-canvas/95 backdrop-blur-md dark:border-night-line dark:bg-night/95">
        <div className="mx-auto flex min-h-[4.75rem] max-w-[72ch] items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-vesSm border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950"
            aria-label="Sair da leitura e voltar ao início"
          >
            <Home size={21} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs text-muted dark:text-night-muted">
              {book.title}
            </p>
            <p className="mt-1 text-xs font-semibold text-sage-800 dark:text-sage-300">
              {bookProgressPct}% da obra · {readingTime}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSettings(false)
                setShowIndex(true)
                session.loadBookIndex()
              }}
              className="flex h-12 w-12 items-center justify-center rounded-vesSm border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950"
              aria-label="Abrir índice da obra"
            >
              <ListTree size={21} aria-hidden="true" />
            </button>

            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => setShowSettings((visible) => !visible)}
                className="flex h-12 w-12 items-center justify-center rounded-vesSm border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950"
                aria-label="Configurações de leitura"
                aria-expanded={showSettings}
              >
                {showSettings ? (
                  <X size={21} aria-hidden="true" />
                ) : (
                  <Type size={21} aria-hidden="true" />
                )}
              </button>

              {showSettings && (
                <ReaderSettings
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  textAlign={textAlign}
                  setTextAlign={setTextAlign}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {session.goalNoticeVisible && (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto max-w-[72ch] px-5 pt-5"
        >
          <div className="flex items-start gap-3 rounded-vesMd border border-sage-200 bg-sage-50 px-4 py-4 dark:border-sage-900 dark:bg-sage-950/40">
            <Check
              size={19}
              className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-muted dark:text-night-muted">
              Seu momento de estudo de hoje está completo. Você pode terminar
              esta seção e decidir se deseja continuar.
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[72ch] overflow-hidden px-5 pb-36 pt-9 sm:px-8 sm:pt-12">
        {isPartIntro ? (
          <PartIntro section={currentSection} />
        ) : isChapterIntro ? (
          <ChapterIntro section={currentSection} />
        ) : (
          <>
            <SectionHeading
              breadcrumb={breadcrumb}
              currentSection={currentSection}
              chapterSections={session.chapterSections}
            />

            <article
              className={`font-display leading-[1.9] text-ink dark:text-night-ink ${fontClass}`}
            >
              {paragraphs.map((paragraph, index) => (
                <Paragraph
                  key={`${currentSection.section_id}-${index}`}
                  text={paragraph}
                  align={textAlign}
                />
              ))}
            </article>
          </>
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

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-4 pb-safe pt-3 backdrop-blur-md dark:border-night-line dark:bg-night/95">
        <div className="mx-auto flex max-w-[72ch] gap-3 pb-3">
          {currentSection.sec_position > 1 && (
            <button
              type="button"
              onClick={session.goToPrevious}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-vesMd border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950"
              aria-label="Voltar para a seção anterior"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          )}

          <Button
            onClick={session.completeCurrentSection}
            loading={session.saving}
            className="flex-1"
          >
            {isChapterIntro ? 'Começar capítulo' : 'Próxima seção'}
            {!session.saving && (
              <ChevronRight size={20} aria-hidden="true" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function Paragraph({ text, align }) {
  if (text.startsWith('[Nota:')) {
    return (
      <p className="mb-7 border-l-2 border-sage-300 pl-4 text-[0.82em] italic leading-relaxed text-muted last:mb-0 dark:border-sage-800 dark:text-night-muted">
        {text.replace(/^\[Nota:\s*/, 'Nota: ').replace(/\]$/, '')}
      </p>
    )
  }

  const numberedItem = text.match(/^(\d+\.)\s*([\s\S]*)$/)

  if (numberedItem) {
    return (
      <p
        className="mb-7 mt-12 first:mt-0 last:mb-0"
        style={{ textAlign: align }}
      >
        <strong>{numberedItem[1]}</strong> {numberedItem[2]}
      </p>
    )
  }

  return (
    <p className="mb-7 last:mb-0" style={{ textAlign: align }}>
      {text}
    </p>
  )
}

function SectionHeading({
  breadcrumb,
  currentSection,
  chapterSections,
}) {
  return (
    <div className="mb-8 border-b border-line pb-5 dark:border-night-line">
      {breadcrumb && (
        <p className="text-xs leading-relaxed text-muted dark:text-night-muted">
          {breadcrumb}
        </p>
      )}

      {(currentSection.section_title ||
        (!breadcrumb && currentSection.title)) && (
        <h1 className="mt-2 font-display text-[1.55rem] font-medium leading-tight text-ink dark:text-night-ink">
          {currentSection.section_title || currentSection.title}
        </h1>
      )}

      <ChapterProgress
        stations={chapterSections}
        currentPosition={currentSection.sec_position}
      />
    </div>
  )
}

function ChapterProgress({ stations, currentPosition }) {
  if (!stations || stations.length < 2) return null

  const index = stations.findIndex(
    (station) => station.sec_position === currentPosition,
  )

  if (index === -1) return null

  const percentage =
    stations.length > 1
      ? Math.round((index / (stations.length - 1)) * 100)
      : 0

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-4 text-xs text-muted dark:text-night-muted">
        <span>Progresso neste capítulo</span>
        <span>
          {index + 1} de {stations.length}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso neste capítulo"
        aria-valuemin={1}
        aria-valuemax={stations.length}
        aria-valuenow={index + 1}
        className="h-1.5 overflow-hidden rounded-full bg-sage-100 dark:bg-white/10"
      >
        <div
          className="h-full rounded-full bg-sage-700 dark:bg-sage-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function ChapterIntro({ section }) {
  const topics = (section.content || '')
    .split('\n')
    .map((topic) => topic.replace(/^•\s*/, '').trim())
    .filter(Boolean)

  const overline = [
    section.part_title?.split('—')[0]?.trim(),
    section.chapter_label,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="py-6 sm:py-12">
      {overline && <p className="ves-eyebrow">{overline}</p>}

      <h1 className="ves-heading mt-3 text-[2.45rem] leading-[1.08]">
        {section.chapter_title || section.title}
      </h1>

      {topics.length > 0 && (
        <div className="mt-10">
          <p className="text-sm font-semibold text-muted dark:text-night-muted">
            Neste capítulo
          </p>

          <ol className="mt-5 space-y-4">
            {topics.map((topic, index) => (
              <li key={`${topic}-${index}`} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-base leading-relaxed text-muted dark:text-night-muted">
                  {topic}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

function PartIntro({ section }) {
  const [label, title] = (section.title || '')
    .split('—')
    .map((value) => value?.trim())

  return (
    <section className="flex min-h-[55vh] flex-col items-center justify-center py-14 text-center">
      <p className="ves-eyebrow">{label}</p>
      <h1 className="ves-heading mt-4 max-w-xl text-[2.8rem] leading-[1.08]">
        {title || label}
      </h1>
    </section>
  )
}

function ReaderSettings({
  fontSize,
  setFontSize,
  textAlign,
  setTextAlign,
}) {
  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-[19rem] rounded-vesMd border border-line bg-surface p-5 shadow-editorial dark:border-night-line dark:bg-night-surface">
      <p className="text-sm font-semibold text-ink dark:text-night-ink">
        Tamanho do texto
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {FONT_SIZES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFontSize(option.id)}
            aria-pressed={fontSize === option.id}
            className={`min-h-12 rounded-vesSm border font-display transition-colors ${
              fontSize === option.id
                ? 'border-sage-800 bg-sage-800 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950'
                : 'border-line text-ink hover:border-sage-400 dark:border-night-line dark:text-night-ink'
            }`}
            aria-label={`Tamanho ${option.label}`}
          >
            A
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-line pt-5 dark:border-night-line">
        <p className="text-sm font-semibold text-ink dark:text-night-ink">
          Alinhamento
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <AlignmentButton
            selected={textAlign === 'left'}
            onClick={() => setTextAlign('left')}
            icon={AlignLeft}
            label="Esquerda"
          />
          <AlignmentButton
            selected={textAlign === 'justify'}
            onClick={() => setTextAlign('justify')}
            icon={AlignJustify}
            label="Justificado"
          />
        </div>
      </div>
    </div>
  )
}

function AlignmentButton({
  selected,
  onClick,
  icon: Icon,
  label,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-vesSm border px-3 text-sm font-semibold ${
        selected
          ? 'border-sage-800 bg-sage-800 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950'
          : 'border-line text-ink hover:border-sage-400 dark:border-night-line dark:text-night-ink'
      }`}
    >
      <Icon size={18} aria-hidden="true" />
      {label}
    </button>
  )
}

function ReaderMessage({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}) {
  return (
    <main className="ves-page flex min-h-screen items-center px-6 py-12">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-vesLg bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
          <Check size={30} aria-hidden="true" />
        </div>

        <p className="ves-eyebrow mt-8">{eyebrow}</p>
        <h1 className="ves-heading mt-3 text-[2.45rem] leading-[1.08]">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted dark:text-night-muted">
          {description}
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onAction}>
            <Home size={19} aria-hidden="true" />
            {actionLabel}
          </Button>

          {secondaryLabel && onSecondary && (
            <Button variant="secondary" onClick={onSecondary}>
              {secondaryLabel}
              <ChevronRight size={19} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}

function ReaderError({ message, onRetry, onBack }) {
  return (
    <main className="ves-page flex min-h-screen items-center px-6 py-12">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-vesLg bg-amber-100 text-amber-700">
          <AlertTriangle size={30} aria-hidden="true" />
        </div>

        <p className="ves-eyebrow mt-8">Não foi possível continuar</p>
        <h1 className="ves-heading mt-3 text-[2.25rem] leading-[1.08]">
          Seu progresso continua protegido.
        </h1>
        <p role="alert" className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted dark:text-night-muted">
          {message || 'Ocorreu um erro inesperado. Tente novamente.'}
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onRetry}>
            <RefreshCw size={19} aria-hidden="true" />
            Tentar novamente
          </Button>
          <Button variant="secondary" onClick={onBack}>
            <Home size={19} aria-hidden="true" />
            Voltar ao início
          </Button>
        </div>
      </div>
    </main>
  )
}
