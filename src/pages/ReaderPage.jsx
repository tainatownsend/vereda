import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlignJustify,
  AlignLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Type,
  X,
} from 'lucide-react'

import { useAuthStore, useReadingStore, useUIStore } from '@/store'
import {
  useBooks,
  useMinutesReadToday,
  useReadingTime,
  useReadingTimer,
  useScrollProgress,
} from '@/hooks'
import { Button, PageLoader } from '@/components/ui'
import { supabase } from '@/lib/supabase'

const FONT_SIZES = [
  { id: 'sm', label: 'Pequena', className: 'text-[17px]' },
  { id: 'md', label: 'Média', className: 'text-[20px]' },
  { id: 'lg', label: 'Grande', className: 'text-[24px]' },
  { id: 'xl', label: 'Extra', className: 'text-[28px]' },
]

const SECTION_COLUMNS =
  'id, sec_position, title, content, word_count, kind, part_title, chapter_label, chapter_title, section_title'

const formatSection = (section) => ({
  section_id: section.id,
  sec_position: section.sec_position,
  title: section.title,
  content: section.content,
  word_count: section.word_count,
  kind: section.kind || 'content',
  part_title: section.part_title,
  chapter_label: section.chapter_label,
  chapter_title: section.chapter_title,
  section_title: section.section_title,
})

export default function ReaderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const books = useBooks()
  const { user } = useAuthStore()
  const { markSectionRead, getTodaySections, progress } = useReadingStore()
  const { fontSize, setFontSize } = useUIStore()

  const [sections, setSections] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [textAlign, setTextAlign] = useState('left')
  const [goalReached, setGoalReached] = useState(false)
  const [chapterSections, setChapterSections] = useState([])
  const [showGoalNotice, setShowGoalNotice] = useState(false)
  const [goalAcknowledged, setGoalAcknowledged] = useState(false)
  const settingsRef = useRef(null)

  const scrollPct = useScrollProgress()
  const timer = useReadingTimer()
  const { minutes: minutesReadToday } = useMinutesReadToday()
  const book = books.find((item) => item.id === Number(id))
  const currentSection = sections[currentIdx]
  const readingTime = useReadingTime(currentSection?.word_count)
  const isChapterIntro = currentSection?.kind === 'chapter_intro'
  const isPartIntro = currentSection?.kind === 'part_intro'

  useEffect(() => {
    if (!user || !book) return undefined

    let active = true

    const load = async () => {
      setLoading(true)
      const todaySections = await getTodaySections(user.id, book.id)

      if (!active) return

      if (todaySections?.length) {
        setSections(todaySections)
      } else {
        const nextPosition =
          useReadingStore.getState().progress[book.id]?.current_section || 1

        const { data } = await supabase
          .from('sections')
          .select(SECTION_COLUMNS)
          .eq('book_id', book.id)
          .gte('sec_position', nextPosition)
          .order('sec_position')
          .limit(10)

        if (!active) return

        setSections((data || []).map(formatSection))
      }

      setCurrentIdx(0)
      setLoading(false)
      timer.reset()
      timer.start()
    }

    load()

    return () => {
      active = false
      timer.stop()
    }
  }, [user, book, getTodaySections, timer.reset, timer.start, timer.stop])

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

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [showSettings])

  const dailyMinutesGoal =
    Number(progress[book?.id]?.pace_minutes) || 0

  const elapsedTodaySeconds =
    Number(minutesReadToday || 0) * 60 + timer.seconds

  useEffect(() => {
    if (
      dailyMinutesGoal <= 0 ||
      goalReached ||
      goalAcknowledged ||
      elapsedTodaySeconds < dailyMinutesGoal * 60
    ) {
      return
    }

    setGoalReached(true)
    setShowGoalNotice(true)
  }, [
    dailyMinutesGoal,
    elapsedTodaySeconds,
    goalAcknowledged,
    goalReached,
  ])

  useEffect(() => {
    if (!showGoalNotice) return undefined

    const timeout = window.setTimeout(() => {
      setShowGoalNotice(false)
    }, 7000)

    return () => window.clearTimeout(timeout)
  }, [showGoalNotice])

  useEffect(() => {
    if (!user || !book || loading || sections.length === 0) return undefined
    if (sections.length - currentIdx > 2) return undefined

    let active = true

    const loadMore = async () => {
      const lastSection = sections[sections.length - 1]
      const { data } = await supabase
        .from('sections')
        .select(SECTION_COLUMNS)
        .eq('book_id', book.id)
        .gt('sec_position', lastSection.sec_position)
        .order('sec_position')
        .limit(10)

      if (active && data?.length) {
        setSections((previous) => [...previous, ...data.map(formatSection)])
      }
    }

    loadMore()
    return () => { active = false }
  }, [book, currentIdx, loading, sections, user])

  useEffect(() => {
    const chapterLabel = currentSection?.chapter_label
    if (!chapterLabel || !book) {
      setChapterSections([])
      return undefined
    }

    let active = true
    let query = supabase
      .from('sections')
      .select('sec_position, section_title')
      .eq('book_id', book.id)
      .eq('chapter_label', chapterLabel)
      .eq('kind', 'content')

    query = currentSection.part_title
      ? query.eq('part_title', currentSection.part_title)
      : query.is('part_title', null)

    query.order('sec_position').then(({ data }) => {
      if (active) setChapterSections(data || [])
    })

    return () => { active = false }
  }, [book, currentSection?.chapter_label, currentSection?.part_title])

  const bookProgressPct = book?.total_sections && currentSection
    ? Math.max(0, Math.min(100, Math.round(((currentSection.sec_position - 1) / book.total_sections) * 100)))
    : 0

  const markRead = useCallback(async () => {
    if (!user || !book || !currentSection || saving) return
    setSaving(true)

    try {
      const secondsSpent = timer.stop()
      await markSectionRead(
        user.id,
        book.id,
        currentSection.section_id,
        currentSection.sec_position + 1,
        secondsSpent,
      )

      if (goalReached && !goalAcknowledged) {
        setShowGoalNotice(false)
        setDone(true)
        return
      }

      if (currentIdx < sections.length - 1) {
        setCurrentIdx((index) => index + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        timer.reset()
        timer.start()
      } else {
        setDone(true)
      }
    } finally {
      setSaving(false)
    }
  }, [book, currentIdx, currentSection, goalAcknowledged, goalReached, markSectionRead, saving, sections, timer.reset, timer.start, timer.stop, user])

  const goToPrevious = useCallback(async () => {
    if (!book) return

    if (currentIdx > 0) {
      setCurrentIdx((index) => index - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      timer.reset()
      timer.start()
      return
    }

    const firstLoadedPosition = sections[0]?.sec_position
    if (!firstLoadedPosition || firstLoadedPosition <= 1) return

    const { data } = await supabase
      .from('sections')
      .select(SECTION_COLUMNS)
      .eq('book_id', book.id)
      .lt('sec_position', firstLoadedPosition)
      .order('sec_position', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setSections((previous) => [formatSection(data), ...previous])
      window.scrollTo({ top: 0, behavior: 'smooth' })
      timer.reset()
      timer.start()
    }
  }, [book, currentIdx, sections, timer.reset, timer.start])

  const fontClass = FONT_SIZES.find((option) => option.id === fontSize)?.className || 'text-[20px]'

  if (loading) return <PageLoader label="Preparando sua leitura" />

  if (!sections.length) {
    return (
      <ReaderMessage
        eyebrow="Momento concluído"
        title="Muito bom. Você avançou mais um pouco."
        description="Seu progresso está salvo. Você pode encerrar por aqui ou continuar lendo."
        actionLabel="Voltar ao início"
        onAction={() => navigate('/home')}
        secondaryLabel="Continuar lendo"
        onSecondary={async () => {
          const nextPosition =
            progress[book.id]?.current_section || 1

          const { data } = await supabase
            .from('sections')
            .select(SECTION_COLUMNS)
            .eq('book_id', book.id)
            .gte('sec_position', nextPosition)
            .order('sec_position')
            .limit(10)

          if (data?.length) {
            setSections(data.map(formatSection))
            setCurrentIdx(0)
            setDone(false)
            setGoalReached(false)
            setGoalAcknowledged(true)
            setShowGoalNotice(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            timer.reset()
            timer.start()
          }
        }}
      />
    )
  }

  if (done) {
    const sectionsRead = sections.filter((section) => section.kind === 'content').length
    return (
      <ReaderMessage
        eyebrow="Momento concluído"
        title="Muito bom. Você avançou mais um pouco."
        description={`${sectionsRead || 1} ${sectionsRead === 1 ? 'seção concluída' : 'seções concluídas'} em ${book?.title}. Continue no seu ritmo.`}
        actionLabel="Voltar ao início"
        onAction={() => navigate('/home')}
        secondaryLabel="Continuar lendo"
        onSecondary={async () => {
          const lastPosition =
            sections[sections.length - 1]?.sec_position ||
            progress[book.id]?.current_section ||
            1

          const { data } = await supabase
            .from('sections')
            .select(SECTION_COLUMNS)
            .eq('book_id', book.id)
            .gt('sec_position', lastPosition)
            .order('sec_position')
            .limit(10)

          if (data?.length) {
            setSections(data.map(formatSection))
            setCurrentIdx(0)
            setDone(false)
            setGoalReached(false)
            setGoalAcknowledged(true)
            setShowGoalNotice(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            timer.reset()
            timer.start()
          } else {
            navigate('/home')
          }
        }}
      />
    )
  }

  const paragraphs = isChapterIntro || isPartIntro
    ? []
    : (currentSection.content || '').split(/\n\n/).map((paragraph) => paragraph.trim()).filter(Boolean)

  const breadcrumb = [currentSection.chapter_label, currentSection.chapter_title]
    .filter(Boolean)
    .join(' — ')

  return (
    <div className="min-h-screen bg-canvas text-ink dark:bg-night dark:text-night-ink">
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-sage-100 dark:bg-sage-950" aria-hidden="true">
        <div className="h-full bg-sage-700 transition-[width] duration-100 dark:bg-sage-300" style={{ width: `${scrollPct}%` }} />
      </div>

      <header className="sticky top-1 z-40 border-b border-line bg-canvas/95 backdrop-blur-md dark:border-night-line dark:bg-night/95">
        <div className="mx-auto flex min-h-[4.75rem] max-w-[72ch] items-center justify-between gap-3 px-4">
          <button type="button" onClick={() => navigate('/home')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-vesSm border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950" aria-label="Sair da leitura e voltar ao início">
            <Home size={21} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs text-muted dark:text-night-muted">{book?.title}</p>
            <p className="mt-1 text-xs font-semibold text-sage-800 dark:text-sage-300">{bookProgressPct}% da obra · {readingTime}</p>
          </div>

          <div ref={settingsRef} className="relative">
            <button type="button" onClick={() => setShowSettings((visible) => !visible)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-vesSm border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950" aria-label="Configurações de leitura" aria-expanded={showSettings}>
              {showSettings ? <X size={21} aria-hidden="true" /> : <Type size={21} aria-hidden="true" />}
            </button>
            {showSettings && (
              <ReaderSettings fontSize={fontSize} setFontSize={setFontSize} textAlign={textAlign} setTextAlign={setTextAlign} />
            )}
          </div>
        </div>
      </header>

      {showGoalNotice && goalReached && (
        <div className="mx-auto max-w-[72ch] px-5 pt-5">
          <div className="flex items-start gap-3 rounded-vesMd border border-sage-200 bg-sage-50 px-4 py-4 dark:border-sage-900 dark:bg-sage-950/40">
            <Check size={19} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted dark:text-night-muted">Seu momento de estudo de hoje está completo. Você pode encerrar aqui ou continuar, sem pressa.</p>
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
            <SectionHeading breadcrumb={breadcrumb} currentSection={currentSection} chapterSections={chapterSections} />
            <article className={`font-display leading-[1.9] text-ink dark:text-night-ink ${fontClass}`}>
              {paragraphs.map((paragraph, index) => (
                <Paragraph key={`${currentSection.section_id}-${index}`} text={paragraph} align={textAlign} />
              ))}
            </article>
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-4 pb-safe pt-3 backdrop-blur-md dark:border-night-line dark:bg-night/95">
        <div className="mx-auto flex max-w-[72ch] gap-3 pb-3">
          {(currentSection?.sec_position || 1) > 1 && (
            <button type="button" onClick={goToPrevious} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-vesMd border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950" aria-label="Voltar para a seção anterior">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          )}
          <Button onClick={markRead} loading={saving} className="flex-1">
            {isChapterIntro ? 'Começar capítulo' : currentIdx < sections.length - 1 ? 'Próxima seção' : 'Concluir leitura'}
            {!saving && (currentIdx < sections.length - 1 ? <ChevronRight size={20} aria-hidden="true" /> : <Check size={20} aria-hidden="true" />)}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function Paragraph({ text, align }) {
  if (text.startsWith('[Nota:')) {
    return <p className="mb-7 border-l-2 border-sage-300 pl-4 text-[0.82em] italic leading-relaxed text-muted last:mb-0 dark:border-sage-800 dark:text-night-muted">{text.replace(/^\[Nota:\s*/, 'Nota: ').replace(/\]$/, '')}</p>
  }
  const numberedItem = text.match(/^(\d+\.)\s*([\s\S]*)$/)
  if (numberedItem) {
    return <p className="mb-7 mt-12 first:mt-0 last:mb-0" style={{ textAlign: align }}><strong>{numberedItem[1]}</strong> {numberedItem[2]}</p>
  }
  return <p className="mb-7 last:mb-0" style={{ textAlign: align }}>{text}</p>
}

function SectionHeading({ breadcrumb, currentSection, chapterSections }) {
  return (
    <div className="mb-8 border-b border-line pb-5 dark:border-night-line">
      {breadcrumb && <p className="text-xs leading-relaxed text-muted dark:text-night-muted">{breadcrumb}</p>}
      {(currentSection.section_title || (!breadcrumb && currentSection.title)) && (
        <h1 className="mt-2 font-display text-[1.55rem] font-medium leading-tight text-ink dark:text-night-ink">{currentSection.section_title || currentSection.title}</h1>
      )}
      <ChapterProgress stations={chapterSections} currentPosition={currentSection.sec_position} />
    </div>
  )
}

function ChapterProgress({ stations, currentPosition }) {
  if (!stations || stations.length < 2) return null
  const index = stations.findIndex((station) => station.sec_position === currentPosition)
  if (index === -1) return null
  const percentage = stations.length > 1 ? Math.round((index / (stations.length - 1)) * 100) : 0
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-4 text-xs text-muted dark:text-night-muted"><span>Progresso neste capítulo</span><span>{index + 1} de {stations.length}</span></div>
      <div role="progressbar" aria-label="Progresso neste capítulo" aria-valuemin={1} aria-valuemax={stations.length} aria-valuenow={index + 1} className="h-1.5 overflow-hidden rounded-full bg-sage-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-sage-700 dark:bg-sage-300" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function ChapterIntro({ section }) {
  const topics = (section.content || '').split('\n').map((topic) => topic.replace(/^•\s*/, '').trim()).filter(Boolean)
  const overline = [section.part_title?.split('—')[0]?.trim(), section.chapter_label].filter(Boolean).join(' · ')
  return (
    <section className="py-6 sm:py-12">
      {overline && <p className="ves-eyebrow">{overline}</p>}
      <h1 className="ves-heading mt-3 text-[2.45rem] leading-[1.08]">{section.chapter_title || section.title}</h1>
      {topics.length > 0 && (
        <div className="mt-10">
          <p className="text-sm font-semibold text-muted dark:text-night-muted">Neste capítulo</p>
          <ol className="mt-5 space-y-4">
            {topics.map((topic, index) => (
              <li key={`${topic}-${index}`} className="flex gap-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-800 dark:bg-sage-950 dark:text-sage-300">{index + 1}</span><p className="pt-0.5 text-base leading-relaxed text-muted dark:text-night-muted">{topic}</p></li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

function PartIntro({ section }) {
  const [label, title] = (section.title || '').split('—').map((value) => value?.trim())
  return <section className="flex min-h-[55vh] flex-col items-center justify-center py-14 text-center"><p className="ves-eyebrow">{label}</p><h1 className="ves-heading mt-4 max-w-xl text-[2.8rem] leading-[1.08]">{title || label}</h1></section>
}

function ReaderSettings({ fontSize, setFontSize, textAlign, setTextAlign }) {
  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-[19rem] rounded-vesMd border border-line bg-surface p-5 shadow-editorial dark:border-night-line dark:bg-night-surface">
      <p className="text-sm font-semibold text-ink dark:text-night-ink">Tamanho do texto</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {FONT_SIZES.map((option) => (
          <button key={option.id} type="button" onClick={() => setFontSize(option.id)} aria-pressed={fontSize === option.id} className={`min-h-12 rounded-vesSm border font-display transition-colors ${fontSize === option.id ? 'border-sage-800 bg-sage-800 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950' : 'border-line text-ink hover:border-sage-400 dark:border-night-line dark:text-night-ink'}`} aria-label={`Tamanho ${option.label}`}>A</button>
        ))}
      </div>
      <div className="mt-5 border-t border-line pt-5 dark:border-night-line">
        <p className="text-sm font-semibold text-ink dark:text-night-ink">Alinhamento</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <AlignmentButton selected={textAlign === 'left'} onClick={() => setTextAlign('left')} icon={AlignLeft} label="Esquerda" />
          <AlignmentButton selected={textAlign === 'justify'} onClick={() => setTextAlign('justify')} icon={AlignJustify} label="Justificado" />
        </div>
      </div>
    </div>
  )
}

function AlignmentButton({ selected, onClick, icon: Icon, label }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`flex min-h-12 items-center justify-center gap-2 rounded-vesSm border px-3 text-sm font-semibold ${selected ? 'border-sage-800 bg-sage-800 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950' : 'border-line text-ink hover:border-sage-400 dark:border-night-line dark:text-night-ink'}`}><Icon size={18} aria-hidden="true" />{label}</button>
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
