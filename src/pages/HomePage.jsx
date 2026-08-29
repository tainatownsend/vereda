import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  FileText,
  Headphones,
  Leaf,
  Quote,
} from 'lucide-react'

import { useAuthStore } from '@/store'
import { useBooks, useProgress, useUserData } from '@/hooks'
import { Button, PageLoader } from '@/components/ui'
import { getActiveBooksByLastRead } from '@/features/home/readingOrder'
import {
  BookCover,
  EditorialCard,
  ProgressLine,
} from '@/components/northstar/NorthStarUI'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const books = useBooks()
  const { progress, dataLoading } = useUserData()

  const activeBooks = useMemo(
    () => getActiveBooksByLastRead(books, progress),
    [books, progress],
  )

  if (!user || dataLoading) return <PageLoader />

  const primaryBook = activeBooks[0]

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[1.92rem] font-semibold tracking-[0.06em] text-[#30452f] dark:text-night-ink">
              VEREDA
            </p>
            <p className="mt-2 max-w-[20rem] text-[14px] leading-relaxed text-ink/80 dark:text-night-muted">
              Um passo por dia. Uma jornada para toda a vida.
            </p>
          </div>

          <button type="button" className="northstar-icon-button" aria-label="Notificações">
            <Bell size={20} strokeWidth={1.7} />
          </button>
        </header>

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

        {primaryBook ? (
          <HomeWithReading book={primaryBook} progress={progress[primaryBook.id]} navigate={navigate} />
        ) : (
          <EmptyHome navigate={navigate} />
        )}
      </div>
    </main>
  )
}

function HomeWithReading({ book, progress, navigate }) {
  const percentage = useProgress(book.id, book.total_sections)

  return (
    <>
      <section className="mt-6" aria-labelledby="continue-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="continue-heading" className="northstar-section-title">Continuar estudando</h2>
          <button type="button" onClick={() => navigate('/biblioteca')} className="northstar-text-action">Ver tudo</button>
        </div>

        <EditorialCard as="button" type="button" onClick={() => navigate(`/ler/${book.id}`)} className="w-full p-4 text-left">
          <div className="flex gap-4">
            <BookCover book={book} size="sm" />
            <div className="min-w-0 flex-1 py-1">
              <p className="font-display text-[1.05rem] font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted dark:text-night-muted">
                {getReadingPosition(progress)}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <ProgressLine value={percentage} className="flex-1" />
                <span className="text-[11px] font-semibold text-sage-700 dark:text-sage-300">{percentage}%</span>
              </div>
            </div>
          </div>
        </EditorialCard>
      </section>

      <section className="mt-6" aria-labelledby="start-heading">
        <h2 id="start-heading" className="northstar-section-title">De onde você quer começar?</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <QuickAction icon={BookOpen} label="Livros" onClick={() => navigate('/biblioteca')} />
          <QuickAction icon={Leaf} label="Reflexões" onClick={() => navigate('/reflexoes')} />
          <QuickAction icon={FileText} label="Resumos" disabled />
          <QuickAction icon={Headphones} label="Audiobooks" disabled />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="plan-heading">
        <h2 id="plan-heading" className="northstar-section-title">Plano de estudo</h2>
        <EditorialCard as="button" type="button" onClick={() => navigate('/evolucao')} className="mt-3 w-full p-4 text-left">
          <div className="flex items-center gap-3">
            <BookCover book={book} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">Estudo Sistematizado</p>
              <p className="mt-2 text-sm font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</p>
              <p className="mt-1 text-xs text-muted dark:text-night-muted">Progresso geral</p>
              <div className="mt-3 flex items-center gap-3">
                <ProgressLine value={percentage} className="flex-1" />
                <span className="text-[11px] font-semibold text-sage-700 dark:text-sage-300">{percentage}%</span>
              </div>
            </div>
          </div>
        </EditorialCard>
      </section>
    </>
  )
}

function EmptyHome({ navigate }) {
  return (
    <section className="mt-6" aria-labelledby="empty-home-heading">
      <EditorialCard className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Seu primeiro passo</p>
        <h2 id="empty-home-heading" className="mt-2 font-display text-[1.85rem] font-semibold leading-tight text-ink dark:text-night-ink">
          Você não precisa saber por onde começar.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
          O Vereda pode sugerir uma primeira direção, sem limitar sua liberdade de explorar as obras.
        </p>
        <Button onClick={() => navigate('/comecar')} className="mt-6 w-full">Ajude-me a começar</Button>
        <button type="button" onClick={() => navigate('/biblioteca')} className="northstar-text-action mt-2 w-full">Prefiro conhecer as obras primeiro</button>
      </EditorialCard>
    </section>
  )
}

function QuickAction({ icon: Icon, label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Em breve' : undefined}
      className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[14px] border border-line bg-surface px-1 text-sage-700 dark:border-night-line dark:bg-night-surface dark:text-sage-300"
    >
      <Icon size={20} strokeWidth={1.7} />
      <span className="max-w-full text-[9.5px] font-semibold text-ink/80 dark:text-night-muted">{label}</span>
    </button>
  )
}

function getReadingPosition(progress) {
  const section = Number(progress?.current_section)
  if (!Number.isFinite(section) || section < 1) return 'Continue exatamente de onde você parou.'
  return `Trecho ${section} · continue de onde você parou.`
}
