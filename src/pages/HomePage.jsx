import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Leaf,
  Quote,
  Settings2,
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

export default function HomePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const books = useBooks()
  const { progress, dataLoading } = useUserData()
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0)

  const activeBooks = useMemo(
    () => getActiveBooksByLastRead(books, progress),
    [books, progress],
  )
  const studyPlan = useMemo(() => getStudyPlan(user), [user])

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

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="font-display text-[1.92rem] font-semibold tracking-[0.06em] text-[#30452f] dark:text-night-ink">
            VEREDA
          </p>
          <p className="mt-3 font-display text-[1.2rem] font-semibold text-ink dark:text-night-ink">
            {greeting}
          </p>
          <p className="mt-1 max-w-[22rem] text-[14px] leading-relaxed text-ink/75 dark:text-night-muted">
            Seu próximo passo fica claro aqui. Você continua no seu ritmo.
          </p>
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

        {!studyPlan && (
          <EditorialCard className="mt-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                <Settings2 size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">Faça o Vereda caber na sua rotina</p>
                <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
                  Diga quanto tempo e quantas sessões por semana parecem realistas. Isso orienta o app, não cria cobrança.
                </p>
                <button type="button" onClick={() => navigate('/plano-de-estudo')} className="northstar-text-action mt-3">
                  Definir meu ritmo de estudo
                </button>
              </div>
            </div>
          </EditorialCard>
        )}

        <QuickActions navigate={navigate} />

        <EditorialCard className="northstar-home-quote mt-7 overflow-hidden p-5">
          <div className="relative z-10 flex items-start gap-3">
            <Quote size={18} className="mt-1 shrink-0 text-sage-700" strokeWidth={1.7} />
            <div className="max-w-[16rem]">
              <p className="font-display text-[1.08rem] leading-[1.55] text-ink dark:text-night-ink">
                “A maior caridade que podemos fazer pela Doutrina Espírita é a sua divulgação.”
              </p>
              <p className="mt-3 text-xs text-muted dark:text-night-muted">Allan Kardec</p>
            </div>
            <Leaf size={30} className="ml-auto shrink-0 text-sage-500" strokeWidth={1.35} />
          </div>
        </EditorialCard>
      </div>
    </main>
  )
}

function NextStudyCard({ book, progress, studyPlan, sessionsThisWeek, navigate }) {
  const percentage = useProgress(book.id, book.total_sections)
  const daysSinceLastRead = daysSince(progress?.last_read_at)

  return (
    <section className="mt-7" aria-labelledby="next-study-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700 dark:text-sage-300">Seu próximo passo</p>
          <h2 id="next-study-heading" className="mt-1 font-display text-[1.35rem] font-semibold text-ink dark:text-night-ink">Continue seu estudo</h2>
        </div>
        {studyPlan && (
          <button type="button" onClick={() => navigate('/plano-de-estudo')} className="min-h-11 text-xs font-semibold text-sage-700 underline-offset-4 hover:underline dark:text-sage-300">
            Ajustar ritmo
          </button>
        )}
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
      </EditorialCard>
    </section>
  )
}

function QuickActions({ navigate }) {
  return (
    <section className="mt-6" aria-labelledby="explore-heading">
      <h2 id="explore-heading" className="northstar-section-title">Outros caminhos</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <QuickAction icon={BookOpen} label="Livros" onClick={() => navigate('/biblioteca')} />
        <QuickAction icon={Leaf} label="Reflexões" onClick={() => navigate('/reflexoes')} />
      </div>
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
        <button type="button" onClick={() => navigate('/biblioteca')} className="northstar-text-action mt-2 min-h-11 w-full">Prefiro conhecer as obras primeiro</button>
      </EditorialCard>
    </section>
  )
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[14px] border border-line bg-surface px-2 text-sage-700 dark:border-night-line dark:bg-night-surface dark:text-sage-300"
    >
      <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
      <span className="max-w-full text-xs font-semibold text-ink/85 dark:text-night-muted">{label}</span>
    </button>
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
