import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'

import { useAuthStore } from '@/store'
import { useBookCompletionEstimate, useBooks, useUserData } from '@/hooks'
import { Button, PageLoader, VeredaLogo } from '@/components/ui'
import ReadingCard from '@/components/ui/ReadingCard'

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
    () =>
      books.filter(
        (book) => progress[book.id] && !progress[book.id]?.completed_at,
      ),
    [books, progress],
  )

  const displayName = getDisplayName(profile, user)

  if (!user || dataLoading) return <PageLoader />

  return (
    <main className="ves-page pb-28">
      <header className="ves-container flex items-start justify-between gap-5 pb-6 pt-11">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted dark:text-night-muted">
            {greeting}{displayName ? `, ${displayName}` : ''}.
          </p>

          <h1 className="mt-1 font-display text-[2rem] font-medium leading-[1.08] tracking-[-0.03em] text-ink dark:text-night-ink">
            Que bom ter você aqui.
          </h1>
        </div>

        <VeredaLogo size={46} className="shrink-0" />
      </header>

      <div className="ves-container space-y-10 pb-10 pt-4">
        {activeBooks.length > 0 ? (
          <HomeWithReading
            activeBooks={activeBooks}
            navigate={navigate}
          />
        ) : (
          <EmptyHome navigate={navigate} />
        )}
      </div>
    </main>
  )
}

function HomeWithReading({ activeBooks, navigate }) {
  return (
    <>
      <section aria-labelledby="continue-reading-heading">
        <div className="mb-4">
          <p className="ves-eyebrow">Seu próximo passo</p>
          <h2
            id="continue-reading-heading"
            className="ves-heading mt-1 text-[1.75rem]"
          >
            Continue de onde parou
          </h2>
        </div>

        <PrimaryReading
          book={activeBooks[0]}
          navigate={navigate}
        />
      </section>

      {activeBooks.length > 1 && (
        <section
          className="border-t border-line pt-8 dark:border-night-line"
          aria-labelledby="other-readings-heading"
        >
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

          <div className="divide-y divide-line dark:divide-night-line">
            {activeBooks.slice(1).map((book) => (
              <SecondaryReadingRow
                key={book.id}
                book={book}
                navigate={navigate}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function PrimaryReading({ book, navigate }) {
  const { estimate } = useBookCompletionEstimate(book.id)

  return (
    <ReadingCard
      book={book}
      currentSection={
        estimate?.current_section ||
        estimate?.section_label ||
        estimate?.current_section_label
      }
      onContinue={() => navigate(`/ler/${book.id}`)}
    />
  )
}

function SecondaryReadingRow({ book, navigate }) {
  return (
    <button
      type="button"
      onClick={() => navigate(`/ler/${book.id}`)}
      className="group flex min-h-20 w-full items-center gap-4 py-4 text-left"
      aria-label={`Retomar ${book.title}`}
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
        className="shrink-0 text-muted transition-transform group-hover:translate-x-1 dark:text-night-muted"
        aria-hidden="true"
      />
    </button>
  )
}

function EmptyHome({ navigate }) {
  return (
    <section className="pt-6" aria-labelledby="empty-home-heading">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-vesLg bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300"
        aria-hidden="true"
      >
        <BookOpen size={30} />
      </div>

      <p className="ves-eyebrow mt-8">Seu primeiro passo</p>

      <h2
        id="empty-home-heading"
        className="ves-heading mt-2 max-w-md text-[2.25rem] leading-[1.08]"
      >
        Você não precisa saber por onde começar.
      </h2>

      <p className="mt-5 max-w-md text-lg leading-relaxed text-muted dark:text-night-muted">
        O Vereda ajuda você a encontrar uma primeira leitura e seguir no seu
        ritmo, sem pressa.
      </p>

      <Button
        onClick={() => navigate('/biblioteca')}
        className="mt-8"
      >
        Ajude-me a começar
        <ArrowRight size={19} aria-hidden="true" />
      </Button>

      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted dark:text-night-muted">
        Você também poderá explorar todas as obras antes de decidir.
      </p>
    </section>
  )
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
