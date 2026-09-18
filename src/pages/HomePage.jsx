import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Leaf,
  Quote,
  UserRound,
} from 'lucide-react'

import northStarLandscape from '@/assets/northstar-landscape.svg'
import { useAuthStore } from '@/store'
import { useBooks, useProgress, useUserData } from '@/hooks'
import { Button, PageLoader, VeredaLogo } from '@/components/ui'
import { getActiveBooksByLastRead } from '@/features/home/readingOrder'
import {
  BookCover,
  EditorialCard,
} from '@/components/northstar/NorthStarUI'
import { getDailyReflection } from '@/features/reflections/dailyReflections'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const books = useBooks()
  const { progress, dataLoading } = useUserData()

  const activeBooks = useMemo(
    () => getActiveBooksByLastRead(books, progress),
    [books, progress],
  )
  const dailyReflection = useMemo(() => getDailyReflection(), [])

  if (!user || dataLoading) return <PageLoader />

  const primaryBook = activeBooks[0]
  const greeting = getGreeting(profile?.name)

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
            className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#D9BE82] text-[#485443] shadow-[0_4px_12px_rgba(92,76,48,0.14)]"
            aria-label="Abrir perfil e preferências"
          >
            <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <section className="relative mt-2 overflow-hidden rounded-[22px] border border-[#D8CEBF] bg-[#E9DFC9] shadow-[0_12px_34px_rgba(67,62,49,0.08)] dark:border-night-line dark:bg-night-surface" aria-labelledby="home-greeting">
          <img
            src={northStarLandscape}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F8F0E3]/0 via-[#F4E9D8]/10 to-[#E8DDC9]/92 dark:from-night/5 dark:via-night/20 dark:to-night/95" />
          <div className="relative flex min-h-[10.7rem] flex-col justify-end p-5 sm:min-h-[11.5rem] sm:p-6">
            <h1 id="home-greeting" className="font-display text-[1.78rem] font-semibold leading-[1.08] text-[#263126] dark:text-night-ink">
              {greeting}
            </h1>
            <p className="mt-1 max-w-[17rem] font-display text-[0.82rem] italic leading-[1.48] text-[#465047] dark:text-night-muted">
              Que a paz do bem te acompanhe nesta jornada.
            </p>
          </div>
        </section>

        {primaryBook ? (
          <NextStudyCard
            book={primaryBook}
            progress={progress[primaryBook.id]}
            navigate={navigate}
          />
        ) : (
          <EmptyHome navigate={navigate} />
        )}

        <section className="mt-4" aria-labelledby="home-reflection-heading">
          <button
            type="button"
            onClick={() => navigate('/reflexoes')}
            className="block w-full text-left"
          >
            <EditorialCard className="northstar-home-quote overflow-hidden border-[#DED1BD] bg-[#F7EFE2] p-5 shadow-[0_10px_26px_rgba(67,62,49,0.06)]">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[#6F755E]">
                  <Quote size={16} strokeWidth={1.7} aria-hidden="true" />
                  <p id="home-reflection-heading" className="text-xs font-semibold">
                    Reflexão do dia
                  </p>
                </div>
                <p className="mt-4 max-w-[28rem] font-display text-[1.06rem] italic leading-[1.58] text-[#343B31] dark:text-night-ink">
                  “{dailyReflection.text}”
                </p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <p className="text-xs font-medium text-[#6F7168] dark:text-night-muted">
                    {dailyReflection.author}
                  </p>
                  <Leaf size={30} className="shrink-0 text-[#66745F]" strokeWidth={1.2} aria-hidden="true" />
                </div>
              </div>
            </EditorialCard>
          </button>
        </section>
      </div>
    </main>
  )
}

function NextStudyCard({ book, progress, navigate }) {
  const percentage = useProgress(book.id, book.total_sections)
  const currentSection = Math.max(1, Number(progress?.current_section) || 1)
  const totalSections = Number(book.total_sections) || null

  return (
    <section className="mt-4" aria-labelledby="next-study-heading">
      <p id="next-study-heading" className="mb-2 px-1 text-xs font-semibold text-[#4D594C] dark:text-sage-300">
        Continuar estudo
      </p>

      <div
        className="overflow-hidden rounded-[20px] border border-[#4F5E4A] shadow-[0_16px_34px_rgba(59,70,55,0.18)]"
        style={{ background: 'linear-gradient(135deg, #596A55 0%, #4D5E49 100%)' }}
      >
        <button
          type="button"
          onClick={() => navigate(`/ler/${book.id}`)}
          className="block w-full p-4 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <BookCover book={book} size="sm" color="#C9B98D" className="shadow-[0_8px_20px_rgba(28,39,29,0.22)]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-display text-[1.03rem] font-semibold leading-snug text-[#FFF9ED]">
                {book.title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#F4EBDD]/80">
                {getStudyPosition(progress)}
              </p>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/18">
                <div
                  className="h-full rounded-full bg-[#E4D2A5]"
                  style={{ width: `${percentage}%` }}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-2 text-xs font-medium text-[#F4EBDD]/78">
                {totalSections ? `${currentSection} de ${totalSections} trechos` : `${percentage}% concluído`}
              </p>
            </div>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F1E6] text-[#53664E] shadow-sm">
              <ChevronRight size={19} aria-hidden="true" />
            </span>
          </div>
        </button>
      </div>
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
