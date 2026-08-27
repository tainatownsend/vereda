import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  FileText,
  Headphones,
  Leaf,
  MessageCircle,
  Quote,
  Sparkles,
} from 'lucide-react'

import { useAuthStore } from '@/store'
import { useBooks, useProgress, useUserData } from '@/hooks'
import { PageLoader } from '@/components/ui'
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

  const activeBooks = useMemo(
    () => books.filter((book) => progress[book.id] && !progress[book.id]?.completed_at),
    [books, progress],
  )

  if (!user || dataLoading) return <PageLoader />

  const primaryBook = activeBooks[0] || books[0]
  const displayName = getDisplayName(profile, user)

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[2rem] font-medium tracking-[0.08em] text-[#30452f] dark:text-night-ink">
              VEREDA
            </p>
            <p className="mt-2 max-w-[19rem] text-[15px] leading-relaxed text-[#3f493e] dark:text-night-muted">
              {displayName ? `Bem-vindo, ${displayName}. ` : 'Bem-vindo. '}
              Sua jornada de estudo continua no seu ritmo.
            </p>
          </div>

          <button
            type="button"
            className="northstar-icon-button"
            aria-label="Notificações"
          >
            <Bell size={20} strokeWidth={1.7} />
          </button>
        </header>

        <EditorialCard className="mt-7 overflow-hidden p-5">
          <div className="flex items-start gap-3">
            <Quote size={18} className="mt-1 shrink-0 text-[#667658]" strokeWidth={1.7} />
            <div>
              <p className="font-display text-[1.12rem] leading-[1.55] text-[#253328] dark:text-night-ink">
                “Fora da caridade não há salvação.”
              </p>
              <p className="mt-3 text-xs text-[#697268] dark:text-night-muted">Allan Kardec</p>
            </div>
            <Leaf size={31} className="ml-auto shrink-0 text-[#82916f]" strokeWidth={1.35} />
          </div>
        </EditorialCard>

        <section className="mt-6" aria-labelledby="continue-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="continue-heading" className="northstar-section-title">Continuar estudando</h2>
            <button
              type="button"
              onClick={() => navigate('/biblioteca')}
              className="northstar-text-action"
            >
              Ver tudo
            </button>
          </div>

          {primaryBook ? (
            <ContinueCard
              book={primaryBook}
              hasProgress={Boolean(progress[primaryBook.id])}
              onOpen={() => navigate(progress[primaryBook.id] ? `/ler/${primaryBook.id}` : `/livro/${primaryBook.id}`)}
            />
          ) : null}
        </section>

        <section className="mt-6" aria-labelledby="start-heading">
          <h2 id="start-heading" className="northstar-section-title">De onde você quer começar?</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <QuickAction icon={BookOpen} label="Livros" onClick={() => navigate('/biblioteca')} />
            <QuickAction icon={Leaf} label="Reflexões" onClick={() => navigate('/reflexoes')} />
            <QuickAction icon={FileText} label="Resumos" onClick={() => navigate('/biblioteca')} />
            <QuickAction icon={Headphones} label="Áudios" disabled />
          </div>
        </section>

        <section className="mt-6" aria-labelledby="plan-heading">
          <h2 id="plan-heading" className="northstar-section-title">Plano de estudo</h2>
          {primaryBook ? (
            <StudyPlanCard book={primaryBook} onOpen={() => navigate('/biblioteca')} />
          ) : null}
        </section>

        <section className="mt-6 pb-3">
          <button
            type="button"
            onClick={() => navigate('/comunidade')}
            className="flex w-full items-center gap-3 rounded-[16px] border border-[#e7e1d7] bg-[#f7f3e9] px-4 py-4 text-left dark:border-night-line dark:bg-night-surface"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4eadb] text-[#526443] dark:bg-sage-950 dark:text-sage-300">
              <MessageCircle size={19} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-[#273328] dark:text-night-ink">Comunidade Vereda</span>
              <span className="mt-0.5 block text-xs text-[#747a70] dark:text-night-muted">Conheça a estrutura que será ativada em uma etapa futura.</span>
            </span>
          </button>
        </section>
      </div>
    </main>
  )
}

function ContinueCard({ book, hasProgress, onOpen }) {
  const percentage = useProgress(book.id, book.total_sections)

  return (
    <EditorialCard as="button" type="button" onClick={onOpen} className="w-full p-4 text-left">
      <div className="flex gap-4">
        <BookCover book={book} size="sm" />
        <div className="min-w-0 flex-1 py-1">
          <p className="font-display text-[1.08rem] font-medium leading-tight text-[#233326] dark:text-night-ink">
            {book.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#70776d] dark:text-night-muted">
            {hasProgress ? 'Continue exatamente de onde você parou.' : 'Comece esta obra no seu ritmo.'}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <ProgressLine value={percentage} className="flex-1" />
            <span className="text-[11px] font-semibold text-[#556447] dark:text-sage-300">{percentage}%</span>
          </div>
        </div>
      </div>
    </EditorialCard>
  )
}

function StudyPlanCard({ book, onOpen }) {
  const percentage = useProgress(book.id, book.total_sections)

  return (
    <EditorialCard as="button" type="button" onClick={onOpen} className="mt-3 w-full p-4 text-left">
      <div className="flex items-center gap-3">
        <BookCover book={book} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[#60704f] dark:text-sage-300">
            <Sparkles size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Estudo sistematizado</span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-[#283328] dark:text-night-ink">{book.title}</p>
          <p className="mt-1 text-xs text-[#747a70] dark:text-night-muted">Progresso geral</p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressLine value={percentage} className="flex-1" />
            <span className="text-[11px] font-semibold text-[#556447] dark:text-sage-300">{percentage}%</span>
          </div>
        </div>
      </div>
    </EditorialCard>
  )
}

function QuickAction({ icon: Icon, label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-[14px] border border-[#e9e2d8] bg-[#fffdf8] px-2 text-[#526443] disabled:opacity-45 dark:border-night-line dark:bg-night-surface dark:text-sage-300"
    >
      <Icon size={20} strokeWidth={1.7} />
      <span className="text-[10px] font-semibold text-[#4c544b] dark:text-night-muted">{label}</span>
    </button>
  )
}

function getDisplayName(profile, user) {
  const candidates = [user?.user_metadata?.full_name, user?.user_metadata?.name, profile?.name]
  const validName = candidates.find((value) => typeof value === 'string' && value.trim() && !value.includes('@'))
  return validName?.trim().split(/\s+/)[0] || ''
}
