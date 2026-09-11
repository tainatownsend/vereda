import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  Leaf,
  Quote,
  Share2,
} from 'lucide-react'

import { useAuthStore } from '@/store'
import { useBooks, useProgress, useUserData } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { Button, PageLoader } from '@/components/ui'
import { getActiveBooksByLastRead } from '@/features/home/readingOrder'
import {
  getGentleReturnCopy,
  getSessionEstimate,
  getStudyPlan,
  getWeeklyProgressLabel,
} from '@/features/studyPlan/studyPlan'
import {
  BookCover,
  EditorialCard,
  ProgressLine,
} from '@/components/northstar/NorthStarUI'
import { getDailyReflection } from '@/features/reflections/dailyReflections'
import { shareReflectionAsImage } from '@/features/share/reflectionCard'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const books = useBooks()
  const { progress, dataLoading } = useUserData()
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0)
  const [reflectionShareStatus, setReflectionShareStatus] = useState('')

  const activeBooks = useMemo(
    () => getActiveBooksByLastRead(books, progress),
    [books, progress],
  )
  const studyPlan = useMemo(() => getStudyPlan(user), [user])
  const dailyReflection = useMemo(() => getDailyReflection(), [])

  useEffect(() => {
    if (!user?.id) return

    const start = startOfWeekISO()
    let cancelled = false

    const loadWeeklySessions = async () => {
      const { data } = await supabase
        .from('reading_sessions')
        .select('read_at')
        .eq('user_id', user.id)
        .gte('read_at', start)

      if (cancelled || !data) return
      const distinctDays = new Set(data.map((item) => item.read_at).filter(Boolean))
      setSessionsThisWeek(distinctDays.size)
    }

    void loadWeeklySessions()
    return () => { cancelled = true }
  }, [user?.id, progress])

  if (!user || dataLoading) return <PageLoader />

  const primaryBook = activeBooks[0]
  const greeting = getGreeting(profile?.name)

  const shareDailyReflection = async () => {
    setReflectionShareStatus('')
    try {
      const result = await shareReflectionAsImage({ text: dailyReflection.text })
      if (result === 'shared') setReflectionShareStatus('Compartilhamento aberto.')
      else if (result === 'copied') setReflectionShareStatus('Imagem copiada. Cole onde quiser compartilhar.')
      else if (result === 'downloaded') setReflectionShareStatus('Imagem salva porque o navegador não oferece compartilhamento direto.')
    } catch (error) {
      if (error?.name !== 'AbortError') setReflectionShareStatus('Não foi possível compartilhar agora.')
    }
  }

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-7 sm:pt-9">
        <header className="flex items-start justify-between gap-5 border-b border-line/70 pb-5 dark:border-night-line">
          <p className="shrink-0 font-display text-[1.55rem] font-semibold tracking-[0.08em] text-[#30452f] dark:text-night-ink sm:text-[1.75rem]">
            VEREDA
          </p>
          <div className="min-w-0 max-w-[17rem] text-right sm:max-w-sm">
            <p className="font-display text-[1.08rem] font-semibold leading-tight text-ink dark:text-night-ink sm:text-[1.2rem]">
              {greeting}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/70 dark:text-night-muted sm:text-sm">
              Seu próximo passo, com calma e clareza.
            </p>
          </div>
        </header>

        {primaryBook ? (
          <NextStudyCard
            book={primaryBook}
            progress={progress[primaryBook.id]}
            studyPlan={studyPlan}
            sessionsThisWeek={sessionsThisWeek}
            navigate={navigate}
          />
        ) : (
          <EmptyHome navigate={navigate} />
        )}

        <section className="mt-7" aria-labelledby="home-reflection-heading">
          <EditorialCard className="northstar-home-quote overflow-hidden p-5">
            <div className="relative z-10 flex items-start gap-3">
              <Quote size={18} className="mt-1 shrink-0 text-sage-700" strokeWidth={1.7} />
              <div className="min-w-0 flex-1">
                <p id="home-reflection-heading" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Para refletir</p>
                <p className="mt-2 font-display text-[1.08rem] leading-[1.55] text-ink dark:text-night-ink">
                  “{dailyReflection.text}”
                </p>
              </div>
              <Leaf size={30} className="ml-auto shrink-0 text-sage-500" strokeWidth={1.35} />
            </div>
          </EditorialCard>

          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <button
              type="button"
              onClick={() => navigate('/reflexoes')}
              className="min-h-10 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
            >
              Ver outras reflexões
            </button>
            <button
              type="button"
              onClick={shareDailyReflection}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950/30"
            >
              <Share2 size={16} aria-hidden="true" />
              Compartilhar
            </button>
          </div>
          {reflectionShareStatus && (
            <p role="status" aria-live="polite" className="mt-1 px-1 text-xs leading-relaxed text-muted dark:text-night-muted">
              {reflectionShareStatus}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

function NextStudyCard({ book, progress, studyPlan, sessionsThisWeek, navigate }) {
  const percentage = useProgress(book.id, book.total_sections)
  const daysSinceLastRead = daysSince(progress?.last_read_at)

  return (
    <section className="mt-7" aria-labelledby="next-study-heading">
      <div className="mb-3">
        <h2 id="next-study-heading" className="font-display text-[1.35rem] font-semibold text-ink dark:text-night-ink">Continue seu estudo</h2>
      </div>

      <EditorialCard className="overflow-hidden p-0">
        <button type="button" onClick={() => navigate(`/ler/${book.id}`)} className="block w-full p-5 text-left">
          <div className="flex gap-4">
            <BookCover book={book} size="sm" />
            <div className="min-w-0 flex-1 py-1">
              <p className="font-display text-[1.1rem] font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted dark:text-night-muted">
                {getReadingPosition(progress)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-sage-800 dark:text-sage-300">
                {getGentleReturnCopy(daysSinceLastRead)}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <ProgressLine value={percentage} className="flex-1" />
                <span className="text-xs font-semibold text-sage-700 dark:text-sage-300">{percentage}%</span>
              </div>
            </div>
          </div>
        </button>

        {studyPlan ? (
          <div className="grid grid-cols-2 border-t border-line/80 bg-surface-soft/45 dark:border-night-line dark:bg-night/25">
            <div className="flex min-h-11 items-center gap-2 border-r border-line/80 px-4 py-3 dark:border-night-line">
              <Clock3 size={15} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <span className="text-xs font-medium text-muted dark:text-night-muted">{getSessionEstimate(studyPlan)}</span>
            </div>
            <div className="flex min-h-11 items-center gap-2 px-4 py-3">
              <CalendarDays size={15} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <span className="text-xs font-medium text-muted dark:text-night-muted">{getWeeklyProgressLabel(studyPlan, sessionsThisWeek)}</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/plano-de-estudo')}
            className="flex w-full items-center gap-3 border-t border-line/80 bg-surface-soft/45 px-5 py-3.5 text-left transition hover:bg-sage-50 dark:border-night-line dark:bg-night/25 dark:hover:bg-sage-950/30"
          >
            <CalendarDays size={17} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-ink dark:text-night-ink">Prefere definir um plano de leitura?</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted dark:text-night-muted">Escolha um tempo e uma frequência que caibam na sua rotina.</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-sage-700 dark:text-sage-300">Definir</span>
          </button>
        )}
      </EditorialCard>
    </section>
  )
}

function EmptyHome({ navigate }) {
  return (
    <section className="mt-7" aria-labelledby="empty-home-heading">
      <EditorialCard className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Seu primeiro passo</p>
        <h2 id="empty-home-heading" className="mt-2 font-display text-[1.85rem] font-semibold leading-tight text-ink dark:text-night-ink">
          Você não precisa saber por onde começar.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
          O Vereda pode sugerir uma primeira direção, sem limitar sua liberdade de explorar as obras.
        </p>
        <Button onClick={() => navigate('/comecar')} className="mt-6 w-full">Ajude-me a começar</Button>
        <button type="button" onClick={() => navigate('/biblioteca')} className="northstar-text-action mt-2 min-h-11 w-full">Prefiro conhecer os estudos primeiro</button>
      </EditorialCard>
    </section>
  )
}

function getReadingPosition(progress) {
  const section = Number(progress?.current_section)
  if (!Number.isFinite(section) || section < 1) return 'Continue exatamente de onde você parou.'
  return `Trecho ${section} · seu lugar está salvo.`
}

function daysSince(value) {
  if (!value) return Number.NaN
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return Number.NaN
  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

function startOfWeekISO() {
  const date = new Date()
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getGreeting(name) {
  const hour = new Date().getHours()
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = formatFirstName(name)
  return firstName ? `${period}, ${firstName}!` : `${period}!`
}

function formatFirstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0]
  if (!first) return ''
  const normalized = first.toLocaleLowerCase('pt-BR')
  return normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1)
}
