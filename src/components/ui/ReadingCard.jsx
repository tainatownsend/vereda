import { ArrowRight, BookOpen, Clock3 } from 'lucide-react'

import { Button, ProgressBar } from '@/components/ui'

export default function ReadingCard({
  book,
  percentage = 0,
  currentSection,
  minutesRemaining,
  onContinue,
}) {
  return (
    <article className="overflow-hidden rounded-vesLg border border-sage-200 bg-sage-50 shadow-editorial dark:border-sage-900 dark:bg-sage-950/35">
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sage-800 dark:text-sage-300">
              Continue de onde parou
            </p>

            <h3 className="mt-2 font-display text-[1.85rem] font-medium leading-[1.08] tracking-[-0.025em] text-ink dark:text-night-ink">
              {book.title}
            </h3>
          </div>

          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-vesSm bg-white/75 text-sage-800 dark:bg-white/10 dark:text-sage-300"
            aria-hidden="true"
          >
            <BookOpen size={23} />
          </div>
        </div>

        {(currentSection || minutesRemaining > 0) && (
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm leading-relaxed text-muted dark:text-night-muted">
            {currentSection && <span>{currentSection}</span>}

            {minutesRemaining > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={16} aria-hidden="true" />
                {formatReadingTime(minutesRemaining)} restantes
              </span>
            )}
          </div>
        )}

        <ProgressBar
          value={percentage}
          label={`Progresso em ${book.title}`}
          showValue
          className="mt-6"
        />

        <Button onClick={onContinue} className="mt-7 w-full">
          Continuar leitura
          <ArrowRight size={19} aria-hidden="true" />
        </Button>
      </div>
    </article>
  )
}

function formatReadingTime(minutes) {
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}min`
    : `${hours}h`
}
