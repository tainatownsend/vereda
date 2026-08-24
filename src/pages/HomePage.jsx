import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Compass, Map } from 'lucide-react'

import { useAuthStore } from '@/store'
import { useBooks, useUserData } from '@/hooks'
import { Button, PageLoader, VeredaLogo } from '@/components/ui'
import ReadingCard from '@/components/ui/ReadingCard'
import { getActiveBooksByLastRead } from '@/features/home/readingOrder'

const RETURN_AFTER_DAYS = 14

export default function HomePage() {
  const { user, profile } = useAuthStore()
  const books = useBooks()
  const { progress, dataLoading } = useUserData()
  const navigate = useNavigate()
  const [greeting, setGreeting] = useState('Olá')

  useEffect(() => {
    const hour = new Date().getHours()

    if (hour < 12) setGreeting('Bom dia')
    else if (hour < 18) setGreeting('Boa tarde')
    else setGreeting('Boa noite')
  }, [])

  const activeBooks = useMemo(
    () => getActiveBooksByLastRead(books, progress),
    [books, progress],
  )

  const returning = isReturningAfterPause(
    progress[activeBooks[0]?.id]?.last_read_at,
  )
  const displayName = getDisplayName(profile, user)

  if (!user || dataLoading) return <PageLoader />

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container flex items-center justify-between gap-5 pb-7 pt-9">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sage-700 dark:text-sage-300">
            {greeting}{displayName ? `, ${displayName}` : ''}.
          </p>

          <h1 className="mt-1 font-display text-[2.05rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink dark:text-night-ink">
            {returning ? 'Que bom ter você de volta.' : 'Que bom ter você aqui.'}
          </h1>
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line/70 bg-surface/65 shadow-sm backdrop-blur-sm dark:border-night-line dark:bg-night-surface/65">
          <VeredaLogo size={52} />
        </div>
      </header>

      <div className="ves-container space-y-10 pb-10 pt-2">
        {activeBooks.length > 0 ? (
          <HomeWithReading
            activeBooks={activeBooks}
            progress={progress}
            navigate={navigate}
          />
        ) : (
          <EmptyHome navigate={navigate} />
        )}
      </div>
    </main>
  )
}

function HomeWithReading({ activeBooks, progress, navigate }) {
  return (
    <>
      <section aria-labelledby="continue-reading-heading">
        <div className="mb-4">
          <p className="ves-eyebrow">Seu próximo passo</p>
          <h2
            id="continue-reading-heading"
            className="ves-heading mt-1 text-[1.75rem]"
          >
            {isReturningAfterPause(progress[activeBooks[0].id]?.last_read_at)
              ? 'Continue daqui, sem pressa'
              : 'Continue de onde parou'}
          </h2>
        </div>

        <PrimaryReading
          book={activeBooks[0]}
          state={progress[activeBooks[0].id]}
          returning={isReturningAfterPause(progress[activeBooks[0].id]?.last_read_at)}
          navigate={navigate}
        />
      </section>

      <section aria-labelledby="explore-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="ves-eyebrow">Quando quiser explorar</p>
            <h2 id="explore-heading" className="ves-heading mt-1 text-[1.55rem]">
              Outros caminhos
            </h2>
          </div>
          <span className="hidden text-xs font-medium text-muted sm:block dark:text-night-muted">
            sem mudar sua leitura atual
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SecondaryAction
            icon={Compass}
            title="Explorar um tema"
            description="Encontre passagens das obras a partir de uma dúvida."
            tone="warm"
            onClick={() => navigate('/descobrir')}
          />
          <SecondaryAction
            icon={Map}
            title="Ver minha jornada"
            description="Veja onde você está e quais obras já percorreu."
            tone="sage"
            onClick={() => navigate('/evolucao')}
          />
        </div>
      </section>

      {activeBooks.length > 1 && (
        <section aria-labelledby="other-readings-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="ves-eyebrow">Também em andamento</p>
              <h2
                id="other-readings-heading"
                className="ves-heading mt-1 text-[1.55rem]"
              >
                Outras leituras
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate('/biblioteca')}
              className="min-h-11 rounded-vesSm px-2 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
            >
              Ver obras
            </button>
          </div>

          <div className="ves-soft-card divide-y divide-line overflow-hidden px-5 dark:divide-night-line">
            {activeBooks.slice(1).map((book) => (
              <SecondaryReadingRow
                key={book.id}
                book={book}
                state={progress[book.id]}
                navigate={navigate}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function PrimaryReading({ book, state, returning, navigate }) {
  const position = Number(state?.current_section) || 1
  const total = Number(book.total_sections) || 0
  const currentSection = total > 0
    ? `trecho ${Math.min(position, total)} de ${total}`
    : `trecho ${position}`

  return (
    <ReadingCard
      book={book}
      returning={returning}
      currentSection={currentSection}
      onContinue={() => navigate(`/ler/${book.id}`)}
    />
  )
}

function SecondaryAction({ icon: Icon, title, description, tone = 'sage', onClick }) {
  const toneClass = tone === 'warm'
    ? 'border-clay-100 bg-clay-50/75 hover:border-clay-300 hover:bg-clay-50 dark:border-clay-900/60 dark:bg-clay-950/10'
    : 'border-sage-200 bg-sage-50/80 hover:border-sage-400 hover:bg-sage-100/70 dark:border-sage-900 dark:bg-sage-950/30'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-32 rounded-vesLg border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-editorial ${toneClass}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
        <Icon size={20} aria-hidden="true" />
      </div>
      <span className="mt-4 block font-display text-lg font-semibold text-ink dark:text-night-ink">{title}</span>
      <span className="mt-1 block text-sm leading-relaxed text-muted dark:text-night-muted">{description}</span>
    </button>
  )
}

function SecondaryReadingRow({ book, state, navigate }) {
  const position = Number(state?.current_section) || 1
  const total = Number(book.total_sections) || 0
  const orientation = total > 0
    ? `, trecho ${Math.min(position, total)} de ${total}`
    : `, trecho ${position}`

  return (
    <button
      type="button"
      onClick={() => navigate(`/ler/${book.id}`)}
      className="group flex min-h-20 w-full items-center gap-4 py-4 text-left"
      aria-label={`Retomar ${book.title}${orientation}`}
    >
      <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-vesSm bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
        <BookOpen size={20} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink dark:text-night-ink">
          {book.title}
        </p>
        <p className="mt-1 text-sm text-muted dark:text-night-muted">
          Retomar esta leitura
        </p>
      </div>

      <ArrowRight
        size={19}
        className="shrink-0 text-sage-700 transition-transform group-hover:translate-x-1 dark:text-sage-300"
        aria-hidden="true"
      />
    </button>
  )
}

function EmptyHome({ navigate }) {
  return (
    <section aria-labelledby="empty-home-heading">
      <div className="ves-horizon-panel rounded-vesLg border border-line p-6 shadow-editorial sm:p-8 dark:border-night-line">
        <div className="relative z-10 max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-white/60 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
            <VeredaLogo size={52} />
          </div>

          <p className="ves-eyebrow mt-7">Seu primeiro passo</p>

          <h2
            id="empty-home-heading"
            className="ves-heading mt-2 text-[2.2rem] leading-[1.08]"
          >
            Você não precisa saber por onde começar.
          </h2>

          <p className="mt-4 text-base leading-relaxed text-muted dark:text-night-muted">
            Duas escolhas simples ajudam o Vereda a indicar uma primeira leitura. Você continua livre para explorar todas as obras.
          </p>

          <Button
            onClick={() => navigate('/comecar')}
            className="mt-7 w-full sm:w-auto"
          >
            Ajude-me a começar
            <ArrowRight size={19} aria-hidden="true" />
          </Button>

          <button
            type="button"
            onClick={() => navigate('/biblioteca')}
            className="mt-3 min-h-11 rounded-vesSm px-2 text-sm font-semibold text-sage-800 underline-offset-4 hover:underline dark:text-sage-300"
          >
            Prefiro conhecer as obras primeiro
          </button>
        </div>
      </div>
    </section>
  )
}

function isReturningAfterPause(lastReadAt) {
  if (!lastReadAt) return false
  const last = new Date(lastReadAt).getTime()
  if (!Number.isFinite(last)) return false
  return Date.now() - last >= RETURN_AFTER_DAYS * 24 * 60 * 60 * 1000
}

function getDisplayName(profile, user) {
  const candidates = [
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
    profile?.name,
  ]

  const validName = candidates.find(
    (value) =>
      typeof value === 'string' &&
      value.trim() &&
      !value.includes('@'),
  )

  return validName?.trim().split(/\s+/)[0] || ''
}
