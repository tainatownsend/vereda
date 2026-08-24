import { ArrowRight, BookOpen } from 'lucide-react'

import { Button } from '@/components/ui'

export default function ReadingCard({
  book,
  currentSection,
  returning = false,
  onContinue,
}) {
  return (
    <article className="ves-horizon-panel rounded-vesLg border border-line shadow-editorial dark:border-night-line">
      <div className="relative z-10 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5 pr-2">
          <div className="min-w-0 max-w-[78%]">
            <p className="text-sm font-semibold text-sage-800 dark:text-sage-300">
              {returning ? 'Retome com tranquilidade' : 'Continue de onde parou'}
            </p>

            <h3 className="mt-2 font-display text-[1.9rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink dark:text-night-ink">
              {book.title}
            </h3>
          </div>

          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/55 text-sage-800 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10 dark:text-sage-300"
            aria-hidden="true"
          >
            <BookOpen size={22} />
          </div>
        </div>

        {currentSection && (
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted dark:text-night-muted">
            Você parou em{' '}
            <span className="font-semibold text-ink dark:text-night-ink">
              {currentSection}
            </span>
            .
          </p>
        )}

        {returning && (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted dark:text-night-muted">
            Não é preciso recuperar tempo perdido. Basta continuar daqui.
          </p>
        )}

        <Button onClick={onContinue} className="mt-7 w-full sm:w-auto sm:min-w-64">
          Continuar de onde parei
          <ArrowRight size={19} aria-hidden="true" />
        </Button>
      </div>
    </article>
  )
}
