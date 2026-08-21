import { ArrowRight, BookOpen } from 'lucide-react'

import { Button } from '@/components/ui'

export default function ReadingCard({
  book,
  currentSection,
  returning = false,
  onContinue,
}) {
  return (
    <article className="overflow-hidden rounded-vesLg border border-sage-200 bg-sage-50 shadow-editorial dark:border-sage-900 dark:bg-sage-950/35">
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sage-800 dark:text-sage-300">
              {returning ? 'Retome com tranquilidade' : 'Continue de onde parou'}
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

        {currentSection && (
          <p className="mt-5 text-base leading-relaxed text-muted dark:text-night-muted">
            Você parou em{' '}
            <span className="font-semibold text-ink dark:text-night-ink">
              {currentSection}
            </span>
            .
          </p>
        )}

        {returning && (
          <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
            Não é preciso recuperar tempo perdido. Basta continuar daqui.
          </p>
        )}

        <Button onClick={onContinue} className="mt-7 w-full">
          Continuar de onde parei
          <ArrowRight size={19} aria-hidden="true" />
        </Button>
      </div>
    </article>
  )
}
