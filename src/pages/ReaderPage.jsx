import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Home, ChevronRight, ChevronLeft, Type, Check } from 'lucide-react'
import { useAuthStore, useReadingStore, useUIStore } from '@/store'
import { useScrollProgress, useReadingTimer, useBooks, useReadingTime } from '@/hooks'
import { PageLoader, Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'

const FONT_SIZES = [
  { id: 'sm', cls: 'text-[17px]' },
  { id: 'md', cls: 'text-[20px]' },
  { id: 'lg', cls: 'text-[24px]' },
  { id: 'xl', cls: 'text-[28px]' },
]

const GOAL_SIZE = 6

const SECTION_COLUMNS =
  'id, sec_position, title, content, word_count, kind, part_title, chapter_label, chapter_title, section_title'

const formatSection = (s) => ({
  section_id:    s.id,
  sec_position:  s.sec_position,
  title:         s.title,
  content:       s.content,
  word_count:    s.word_count,
  kind:          s.kind || 'content',
  part_title:    s.part_title,
  chapter_label: s.chapter_label,
  chapter_title: s.chapter_title,
  section_title: s.section_title,
})

// ---------------------------------------------------------------------------
// Renderização de parágrafos (dados já vêm limpos da extração estrutural;
// as antigas heurísticas cleanText/isJunk/isSubtitle não são mais necessárias
// e corromperiam o texto)
// ---------------------------------------------------------------------------

function Paragraph({ text, align }) {
  // Notas de rodapé embutidas: "[Nota: ...]"
  if (text.startsWith('[Nota:')) {
    return (
      <p className="mb-6 last:mb-0 text-[0.85em] italic text-slate-500 dark:text-slate-400 border-l-2 border-primary-200 dark:border-primary-800 pl-3">
        {text.replace(/^\[Nota:\s*/, 'Nota: ').replace(/\]$/, '')}
      </p>
    )
  }
  // Item numerado: destaca o número e abre espaço extra antes do grupo P/R
  const m = text.match(/^(\d+\.)\s*([\s\S]*)$/)
  if (m) {
    return (
      <p className="mt-12 first:mt-0 mb-6 last:mb-0" style={{ textAlign: align }}>
        <strong className="text-[#211F1B] dark:text-slate-100">{m[1]}</strong> {m[2]}
      </p>
    )
  }
  return <p className="mb-6 last:mb-0" style={{ textAlign: align }}>{text}</p>
}

// ---------------------------------------------------------------------------
// Linha de metrô do capítulo (horizontal, compacta)
// ---------------------------------------------------------------------------

function MetroStrip({ stations, currentPosition }) {
  if (!stations || stations.length < 2) return null
  const idx = stations.findIndex(s => s.sec_position === currentPosition)
  if (idx === -1) return null

  // Janela deslizante: capítulos longos mostram só as estações vizinhas
  const MAX = 8
  let start = 0
  if (stations.length > MAX) {
    start = Math.min(Math.max(idx - 3, 0), stations.length - MAX)
  }
  const visible = stations.slice(start, start + MAX)
  const before = start
  const after = stations.length - (start + visible.length)

  return (
    <div
      className="flex items-center w-full mt-2.5"
      aria-label={`Seção ${idx + 1} de ${stations.length} do capítulo`}
    >
      {before > 0 && (
        <span className="text-[10px] text-slate-300 dark:text-slate-600 mr-1.5 shrink-0">+{before}</span>
      )}
      {visible.map((s, i) => {
        const gi = start + i
        return (
          <span key={s.sec_position} className={'flex items-center' + (i > 0 ? ' flex-1' : '')}>
            {i > 0 && <span className="h-[2px] flex-1 bg-primary-100 dark:bg-primary-900/50" />}
            <span
              title={s.section_title || ''}
              className={
                'w-[9px] h-[9px] rounded-full box-border shrink-0 ' +
                (gi < idx
                  ? 'bg-primary-300'
                  : gi === idx
                    ? 'bg-primary-600'
                    : 'bg-white dark:bg-slate-900 border-2 border-primary-300')
              }
            />
          </span>
        )
      })}
      {after > 0 && (
        <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-1.5 shrink-0">+{after}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página de abertura de capítulo (kind = 'chapter_intro') ou de parte
// ---------------------------------------------------------------------------

function ChapterIntro({ section, stations }) {
  const topics = (section.content || '')
    .split('\n')
    .map(t => t.replace(/^•\s*/, '').trim())
    .filter(Boolean)

  const overline = [section.part_title?.split('—')[0]?.trim(), section.chapter_label]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      {overline && (
        <p className="text-[12px] tracking-[0.14em] uppercase text-primary-500 dark:text-primary-400 mb-2">
          {overline}
        </p>
      )}
      <h1 className="font-display text-[27px] leading-[1.25] text-[#211F1B] dark:text-slate-100 mb-3.5">
        {section.chapter_title || section.title}
      </h1>
      <div className="w-9 h-[2px] bg-primary-300 rounded mb-5" />

      {topics.length > 0 && (
        <>
          <p className="text-[12px] tracking-[0.06em] uppercase text-slate-400 dark:text-slate-500 mb-3.5">
            Neste capítulo
          </p>
          <div>
            {topics.map((t, i) => {
              const station = stations?.[i]
              const isDone = false // pode evoluir para refletir seções já lidas
              return (
                <div key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center w-3">
                    <span
                      className={
                        'w-[10px] h-[10px] rounded-full mt-1 shrink-0 box-border ' +
                        (i === 0
                          ? 'bg-primary-600'
                          : 'bg-transparent border-2 border-primary-300')
                      }
                    />
                    {i < topics.length - 1 && (
                      <span className="w-[2px] flex-1 bg-primary-100 dark:bg-primary-900/50 min-h-[16px]" />
                    )}
                  </div>
                  <p className={'text-[15.5px] pb-4 ' + (i === 0
                    ? 'text-[#211F1B] dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400')}>
                    {t}
                  </p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function PartIntro({ section }) {
  const [label, title] = (section.title || '').split('—').map(s => s?.trim())
  return (
    <div className="text-center py-16">
      <p className="text-[12px] tracking-[0.18em] uppercase text-primary-500 dark:text-primary-400 mb-3">
        {label}
      </p>
      <h1 className="font-display text-[28px] leading-[1.3] text-[#211F1B] dark:text-slate-100">
        {title || label}
      </h1>
      <div className="w-9 h-[2px] bg-primary-300 rounded mx-auto mt-6" />
    </div>
  )
}

// ---------------------------------------------------------------------------

export default function ReaderPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const books    = useBooks()
  const { user } = useAuthStore()
  const { markSectionRead, getTodaySections, progress } = useReadingStore()
  const { fontSize, setFontSize } = useUIStore()

  const [sections,        setSections]        = useState([])
  const [currentIdx,      setCurrentIdx]      = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [done,            setDone]            = useState(false)
  const [showSettings,    setShowSettings]    = useState(false)
  const [textAlign,       setTextAlign]       = useState('left')
  const [goalReached,     setGoalReached]     = useState(false)
  const [chapterSections, setChapterSections] = useState([])

  const scrollPct = useScrollProgress()
  const timer     = useReadingTimer()
  const book      = books.find(b => b.id === Number(id))

  useEffect(() => {
    if (!user || !book) return
    const load = async () => {
      setLoading(true)
      const data = await getTodaySections(user.id, book.id)
      setSections(data || [])
      setLoading(false)
      timer.start()
    }
    load()
    return () => timer.stop()
  }, [user?.id, book?.id])

  // Pré-carrega as próximas seções
  useEffect(() => {
    if (!user || !book || loading) return
    const remaining = sections.length - currentIdx
    if (remaining <= 2 && sections.length > 0) {
      const loadMore = async () => {
        const lastSection = sections[sections.length - 1]
        const { data } = await supabase
          .from('sections')
          .select(SECTION_COLUMNS)
          .eq('book_id', book.id)
          .gt('sec_position', lastSection.sec_position)
          .order('sec_position')
          .limit(10)
        if (data && data.length > 0) {
          setSections(prev => [...prev, ...data.map(formatSection)])
        }
      }
      loadMore()
    }
  }, [currentIdx, sections, user, book, loading])

  const currentSection = sections[currentIdx]
  const isChapterIntro = currentSection?.kind === 'chapter_intro'
  const isPartIntro    = currentSection?.kind === 'part_intro'

  // Estações da linha de metrô: seções de conteúdo do capítulo atual.
  // IMPORTANTE: filtra também pela Parte, pois "CAPÍTULO V" se repete
  // entre as partes do mesmo livro.
  useEffect(() => {
    const ch = currentSection?.chapter_label
    if (!ch || !book) { setChapterSections([]); return }
    let active = true
    let query = supabase
      .from('sections')
      .select('sec_position, section_title')
      .eq('book_id', book.id)
      .eq('chapter_label', ch)
      .eq('kind', 'content')
    query = currentSection.part_title
      ? query.eq('part_title', currentSection.part_title)
      : query.is('part_title', null)
    query
      .order('sec_position')
      .then(({ data }) => { if (active) setChapterSections(data || []) })
    return () => { active = false }
  }, [currentSection?.chapter_label, currentSection?.part_title, book?.id])

  const bookProgressPct = book?.total_sections && currentSection
    ? Math.round(((currentSection.sec_position - 1) / book.total_sections) * 100)
    : 0

  const markRead = useCallback(async () => {
    if (!user || !currentSection || saving) return
    setSaving(true)
    const secondsSpent = timer.stop()

    await markSectionRead(
      user.id, book.id, currentSection.section_id, currentSection.sec_position + 1, secondsSpent
    )

    // Meta diária: só seções de conteúdo real contam (aberturas de capítulo/parte não)
    const contentRead = sections
      .slice(0, currentIdx + 1)
      .filter(s => s.kind === 'content').length
    const justHitGoal = !goalReached &&
      currentSection.kind === 'content' &&
      contentRead === GOAL_SIZE

    if (currentIdx < sections.length - 1) {
      setCurrentIdx(i => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      timer.reset()
      timer.start()
      if (justHitGoal) setGoalReached(true)
    } else {
      setDone(true)
    }
    setSaving(false)
  }, [user, currentSection, saving, currentIdx, sections.length, book, timer, markSectionRead, goalReached])

  const goToPrevious = useCallback(async () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1)
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
      setSections(prev => [formatSection(data), ...prev])
      window.scrollTo({ top: 0, behavior: 'smooth' })
      timer.reset()
      timer.start()
    }
  }, [currentIdx, timer, sections, book])

  const fontClass = FONT_SIZES.find(f => f.id === fontSize)?.cls || 'text-[20px]'

  if (loading) return <PageLoader />

  if (!sections.length) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-slate-900 flex flex-col items-center justify-center px-5 text-center gap-5">
        <div className="text-5xl">🌟</div>
        <p className="font-display text-2xl text-forest-900 dark:text-slate-100">Você já leu hoje!</p>
        <p className="text-slate-400 dark:text-slate-500">Volte amanhã para continuar sua jornada.</p>
        <Button variant="secondary" onClick={() => navigate('/home')}>Voltar para início</Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-slate-900 flex flex-col items-center justify-center px-5 text-center gap-6">
        <div className="text-6xl">✨</div>
        <div>
          <h2 className="font-display text-3xl text-forest-900 dark:text-slate-100">Leitura concluída!</h2>
          <p className="text-slate-400 dark:text-slate-500 mt-2">
            {sections.length > 1 ? sections.length + ' seções lidas' : '1 seção lida'} hoje em {book?.title}.
          </p>
        </div>
        <Button onClick={() => navigate('/home')}>Voltar para início</Button>
      </div>
    )
  }

  // Parágrafos: content usa \n\n como separador (já limpo na origem)
  const paragraphs = isChapterIntro || isPartIntro
    ? []
    : (currentSection.content || '').split(/\n\n/).map(p => p.trim()).filter(Boolean)

  const breadcrumb = [currentSection.chapter_label, currentSection.chapter_title]
    .filter(Boolean)
    .join(' — ')

  // Quantas seções de conteúdo já foram lidas antes da tela atual (para o banner da meta)
  const contentReadSoFar = sections
    .slice(0, currentIdx)
    .filter(s => s.kind === 'content').length

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">

      {/* Barra de progresso de scroll */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-primary-100 dark:bg-primary-900/30">
        <div
          className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-100"
          style={{ width: scrollPct + '%' }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-[3px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          style={{ width: 44, height: 44, borderRadius: 12, background: '#EEE9F8', border: '1px solid #DDD6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Home size={22} color="#7B5EA7" />
        </button>

        <div className="text-center flex-1 px-2">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px] mx-auto">{book?.title}</p>
          <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">
            {bookProgressPct}% do livro · {useReadingTime(currentSection?.word_count)}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{ width: 44, height: 44, borderRadius: 12, background: '#EEE9F8', border: '1px solid #DDD6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Type size={20} color="#7B5EA7" />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg w-52 z-50">
              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>Tamanho da fonte</p>
              <div className="flex gap-2 mb-3">
                {FONT_SIZES.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFontSize(f.id)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 8,
                      fontFamily: 'Fraunces, serif',
                      fontSize: f.id === 'sm' ? 17 : f.id === 'md' ? 20 : f.id === 'lg' ? 24 : 28,
                      background: fontSize === f.id ? '#7B5EA7' : 'transparent',
                      color: fontSize === f.id ? 'white' : '#334155',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    A
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>Alinhamento</p>
              <div className="flex gap-2">
                {[['left', 'Esquerda'], ['justify', 'Justificado']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setTextAlign(val); setShowSettings(false) }}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8,
                      fontSize: 11, fontWeight: 500,
                      background: textAlign === val ? '#7B5EA7' : 'transparent',
                      color: textAlign === val ? 'white' : '#334155',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Aviso de meta batida */}
      {goalReached && contentReadSoFar === GOAL_SIZE && (
        <div className="px-4 max-w-[65ch] mx-auto mb-2">
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3 flex items-center gap-2">
            <Check size={16} className="text-primary-600 dark:text-primary-400 shrink-0" />
            <p className="text-xs text-primary-700 dark:text-primary-300">
              Meta de hoje cumprida! Você pode continuar lendo se quiser.
            </p>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <main className="px-5 py-6 max-w-[65ch] mx-auto overflow-hidden">
        {isPartIntro ? (
          <PartIntro section={currentSection} />
        ) : isChapterIntro ? (
          <ChapterIntro section={currentSection} stations={chapterSections} />
        ) : (
          <>
            {/* Cabeçalho da seção: breadcrumb + título + linha de metrô */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              {breadcrumb && (
                <p className="text-[11px] tracking-[0.08em] text-slate-400 dark:text-slate-500 mb-1">
                  {breadcrumb}
                </p>
              )}
              {/* Só mostra o h2 se houver título de seção próprio; o preâmbulo
                  do capítulo (section_title nulo) já é identificado pelo breadcrumb */}
              {(currentSection.section_title || (!breadcrumb && currentSection.title)) && (
                <h2 className="font-display text-[17px] font-semibold text-primary-700 dark:text-primary-300 leading-snug">
                  {currentSection.section_title || currentSection.title}
                </h2>
              )}
              <MetroStrip stations={chapterSections} currentPosition={currentSection.sec_position} />
            </div>

            <div className={'font-display text-[#211F1B] dark:text-slate-200 break-words ' + fontClass + ' leading-[1.9]'}>
              {paragraphs.map((p, i) => (
                <Paragraph key={i} text={p} align={textAlign} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer fixo */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 to-transparent px-4 pt-4 pb-7">
        <div className="max-w-[65ch] mx-auto flex gap-2">
          {(currentSection?.sec_position || 1) > 1 && (
            <button
              onClick={goToPrevious}
              className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #5A3F88, #7B5EA7)' }}
            >
              <ChevronLeft size={20} color="white" />
            </button>
          )}
          <button
            onClick={markRead}
            disabled={saving}
            className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #5A3F88, #7B5EA7)' }}
          >
            {saving
              ? <span className="text-sm">...</span>
              : isChapterIntro
                ? <><ChevronRight size={18} /><span className="text-sm">Começar capítulo</span></>
                : currentIdx < sections.length - 1
                  ? <><ChevronRight size={18} /><span className="text-sm">Próxima seção</span></>
                  : <><Check size={18} /><span className="text-sm">Concluir leitura</span></>
            }
          </button>
        </div>
      </footer>

      <div className="h-24" />
    </div>
  )
}
