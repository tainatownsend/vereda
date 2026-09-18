import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Leaf,
  Quote,
  Share2,
  UserRound,
} from 'lucide-react'

import northStarLandscape from '@/assets/northstar-landscape.svg'
import { useAuthStore } from '@/store'
import { useBooks, useProgress, useUserData } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { Button, PageLoader, VeredaLogo } from '@/components/ui'
import { getActiveBooksByLastRead } from '@/features/home/readingOrder'
import {
  getSessionEstimate,
  getStudyPlan,
  getWeeklyProgressLabel,
} from '@/features/studyPlan/studyPlan'
import {
  BookCover,
  EditorialCard,
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
      const result = await shareReflectionAsImage({
        text: dailyReflection.text,
        author: dailyReflection.author,
      })
      if (result === 'shared') setReflectionShareStatus('Compartilhamento aberto.')
      else if (result === 'copied') setReflectionShareStatus('Imagem copiada. Cole onde quiser compartilhar.')
      else if (result === 'downloaded') setReflectionShareStatus('Imagem salva porque o navegador não oferece compartilhamento direto.')
    } catch (error) {
      if (error?.name !== 'AbortError') setReflectionShareStatus('Não foi possível compartilhar agora.')
    }
  }

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-5 sm:pt-7">
        <header className="relative flex min-h-14 items-center justify-center">
          <div className="flex items-center gap-2.5" aria-label="Vereda">
            <VeredaLogo size={34} />
            <p className="font-display text-[1.55rem] font-semibold tracking-[-0.02em] text-sage-800 dark:text-night-ink">
              Vereda
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/configuracoes')}
            className="northstar-icon-button absolute right-0"
            aria-label="Abrir perfil e preferências"
          >
            <UserRound size={21} aria-hidden="true" />
          </button>
        </header>

        <section className="relative mt-3 overflow-hidden rounded-[24px] border border-line/80 bg-[#E9E1D2] shadow-[0_16px_40px_rgba(67,62,49,0.08)] dark:border-night-line dark:bg-night-surface" aria-labelledby="home-greeting">
          <img
            src={northStarLandscape}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0E7]/5 via-[#F5F0E7]/15 to-[#F5F0E7]/95 dark:from-night/5 dark:via-night/20 dark:to-night/95" />
          <div className="relative flex min-h-[12.5rem] flex-col justify-end p-5 sm:p-6">
            <h1 id="home-greeting" className="font-display text-[1.85rem] font-semibold leading-tight text-[#263126] dark:text-night-ink">
              {greeting}
            </h1>
            <p className="mt-1 max-w-[18rem] font-display text-sm italic leading-relaxed text-[#465047] dark:text-night-muted">
              Que a paz do bem te acompanhe nesta jornada.
            </p>
          </div>
        </section>

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

        <section className="mt-5" aria-labelledby="home-reflection-heading">
          <EditorialCard className="northstar-home-quote overflow-hidden p-5">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-sage-700 dark:text-sage-300">
                <Quote size={17} strokeWidth={1.7} aria-hidden="true" />
                <p id="home-reflection-heading" className="text-xs font-semibold">
                  Reflexão do dia
                </p>
              </div>
              <p className="mt-4 max-w-[28rem] font-display text-[1.12rem] italic leading-[1.62] text-ink dark:text-night-ink">
                “{dailyReflection.text}”
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-xs font-medium text-muted dark:text-night-muted">
                  {dailyReflection.author}
                </p>
                <Leaf size={28} className="shrink-0 text-sage-500" strokeWidth={1.25} aria-hidden="true" />
              </div>
            </div>
          </EditorialCard>

          <div className="mt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/reflexoes')}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-sage-800 hover:bg-surface-soft dark:text-sage-300"
            >
              Ver reflexões
            </button>
            <button
              type="button"
              onClick={shareDailyReflection}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-sage-800 hover:bg-surface-soft dark:text-sage-300"
            >
              <Share2 size={16} aria-hidden="true" />
              Compartilhar
            </button>
          </div>
          {reflectionShareStatus && (
            <p role="status" aria-live="polite" className="mt-1 px-2 text-xs leading-relaxed text-muted dark:text-night-muted">
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
  const currentSection = Math.max(1, Number(progress?.current_section) || 1)
  const totalSections = Number(book.total_sections) || null

  return (
    <section className="mt-5" aria-labelledby="next-study-heading">
      <p id="next-study-heading" className="mb-2.5 px-1 text-xs font-semibold text-[#4D594C] dark:text-sage-300">
        Continuar estudo
      </p>

      <EditorialCard className="overflow-hidden border-[#53664E] bg-[#53664E] p-0 shadow-[0_16px_36px_rgba(67,80,63,0.18)]">
        <button
          type="button"
          onClick={() => navigate(`/ler/${book.id}`)}
          className="block w-full p-4 text-left sm:p-5"
        >
          <div className="flex items-center gap-4">
            <BookCover book={book} size="sm" color="#D8CDAF" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[1.08rem] font-semibold leading-snug text-white">{book.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/78">
                {getStudyPosition(progress)}
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/22">
                <div
                  className="h-full rounded-full bg-[#E7D7B4]"
                  style={{ width: `${percentage}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-xs font-medium text-white/80">
                {totalSections ? `${currentSection} de ${totalSections} trechos` : `${percentage}% concluído`}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F0E7] text-[#53664E]">
              <ChevronRight size={20} aria-hidden="true" />
            </span>
          </div>
        </button>

        {studyPlan ? (
          <div className="grid grid-cols-2 border-t border-white/15 bg-black/8">
            <div className="flex min-h-11 items-center gap-2 border-r border-white/15 px-4 py-3">
              <Clock3 size={15} className="shrink-0 text-[#E7D7B4]" aria-hidden="true" />
              <span className="text-xs font-medium text-white/82">{getSessionEstimate(studyPlan)}</span>
            </div>
            <div className="flex min-h-11 items-center gap-2 px-4 py-3">
              <CalendarDays size={15} className="shrink-0 text-[#E7D7B4]" aria-hidden="true" />
              <span className="text-xs font-medium text-white/82">{getWeeklyProgressLabel(studyPlan, sessionsThisWeek)}</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/plano-de-estudo')}
            className="flex w-full items-center gap-3 border-t border-white/15 bg-black/8 px-4 py-3 text-left"
          >
            <CalendarDays size={16} className="shrink-0 text-[#E7D7B4]" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-xs font-medium text-white/85">
              Defina um ritmo de leitura que caiba na sua rotina.
            </span>
            <span className="text-xs font-semibold text-[#F4E6C6]">Definir</span>
          </button>
        )}
      </EditorialCard>
    </section>
  )
}

function EmptyHome({ navigate }) {
  return (
    <section className="mt-5" aria-labelledby="empty-home-heading">
      <EditorialCard className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Seu primeiro passo</p>
        <h2 id="empty-home-heading" className="mt-2 font-display text-[1.65rem] font-semibold leading-tight text-ink dark:text-night-ink">
          Comece com calma.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
          O Vereda pode ajudar você a escolher uma primeira direção, sem pressa.
        </p>
        <Button onClick={() => navigate('/comecar')} className="mt-5 w-full">Ajude-me a começar</Button>
        <button type="button" onClick={() => navigate('/biblioteca')} className="northstar-text-action mt-2 min-h-11 w-full">
          Prefiro conhecer os estudos
        </button>
      </EditorialCard>
    </section>
  )
}

function getStudyPosition(progress) {
  const section = Number(progress?.current_section)
  if (!Number.isFinite(section) || section < 1) return 'Seu lugar está pronto para começar.'
  return `Trecho ${section} · seu lugar está salvo`
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
  return firstName ? `${period}, ${firstName}` : period
}

function formatFirstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0]
  if (!first) return ''
  const normalized = first.toLocaleLowerCase('pt-BR')
  return normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1)
}
