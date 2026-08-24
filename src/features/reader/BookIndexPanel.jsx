import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  X,
} from 'lucide-react'

import {
  buildBookIndex,
  getIndexItemState,
  getIndexSectionLabel,
} from '@/features/reader/bookIndex'
import { READER_COPY } from '@/features/reader/readerCopy'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function BookIndexPanel({
  open,
  onClose,
  bookTitle,
  sections,
  loading,
  viewedPosition,
  persistedPosition,
  bookCompleted,
  onSelect,
}) {
  const closeButtonRef = useRef(null)
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const [expandedChapters, setExpandedChapters] = useState(() => new Set())

  const index = useMemo(() => buildBookIndex(sections), [sections])

  useEffect(() => {
    if (!open) return undefined

    previousFocusRef.current = document.activeElement
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR),
      )

      if (!focusable.length) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [onClose, open])

  useEffect(() => {
    if (!open || !viewedPosition || !index.length) return

    for (const part of index) {
      for (const chapter of part.chapters) {
        if (
          chapter.sections.some(
            (section) =>
              Number(section.sec_position) === Number(viewedPosition),
          )
        ) {
          setExpandedChapters((current) => {
            const next = new Set(current)
            next.add(chapter.id)
            return next
          })
          return
        }
      }
    }
  }, [index, open, viewedPosition])

  if (!open) return null

  const toggleChapter = (chapterId) => {
    setExpandedChapters((current) => {
      const next = new Set(current)

      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)

      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] dark:bg-black/55"
        aria-label="Fechar índice"
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-index-title"
        aria-describedby="book-index-description"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line bg-canvas shadow-2xl dark:border-night-line dark:bg-night"
      >
        <header className="flex items-start justify-between gap-5 border-b border-line px-5 py-5 sm:px-6 sm:py-6 dark:border-night-line">
          <div className="min-w-0">
            <p className="ves-eyebrow">Índice da obra</p>
            <h2
              id="book-index-title"
              className="ves-heading mt-1 break-words text-[1.55rem] sm:text-[1.75rem]"
            >
              {bookTitle}
            </h2>
            <p id="book-index-description" className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
              {READER_COPY.indexDescription}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-vesSm border border-line bg-surface text-sage-800 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:text-sage-300 dark:hover:bg-sage-950"
            aria-label="Fechar índice"
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 min-[360px]:px-5 sm:px-6">
          {loading ? (
            <div
              className="flex min-h-52 items-center justify-center gap-3 text-muted dark:text-night-muted"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={21} className="animate-spin" aria-hidden="true" />
              Carregando índice
            </div>
          ) : (
            <div className="space-y-8">
              {index.map((part) => (
                <section key={part.id}>
                  <h3 className="font-display text-[1.35rem] font-medium text-ink dark:text-night-ink">
                    {part.title}
                  </h3>

                  <div className="mt-3 space-y-2">
                    {part.chapters.map((chapter) => {
                      const expanded = expandedChapters.has(chapter.id)
                      const currentInside = chapter.sections.some(
                        (section) =>
                          Number(section.sec_position) ===
                          Number(viewedPosition),
                      )

                      return (
                        <div
                          key={chapter.id}
                          className={`overflow-hidden rounded-vesMd border ${
                            currentInside
                              ? 'border-sage-400 bg-sage-50/70 dark:border-sage-700 dark:bg-sage-950/25'
                              : 'border-line bg-surface dark:border-night-line dark:bg-night-surface'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleChapter(chapter.id)}
                            aria-expanded={expanded}
                            className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
                          >
                            {expanded ? (
                              <ChevronDown
                                size={19}
                                className="shrink-0 text-sage-700 dark:text-sage-300"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronRight
                                size={19}
                                className="shrink-0 text-sage-700 dark:text-sage-300"
                                aria-hidden="true"
                              />
                            )}

                            <span className="min-w-0 flex-1">
                              {chapter.label && (
                                <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">
                                  {chapter.label}
                                </span>
                              )}
                              <span className="mt-0.5 block font-semibold text-ink dark:text-night-ink">
                                {chapter.title}
                              </span>
                            </span>

                            <span className="shrink-0 text-xs text-muted dark:text-night-muted">
                              {chapter.sections.length}
                              <span className="sr-only"> trechos</span>
                            </span>
                          </button>

                          {expanded && (
                            <ol className="border-t border-line dark:border-night-line">
                              {chapter.sections.map((section) => {
                                const itemState = getIndexItemState({
                                  sectionPosition: section.sec_position,
                                  viewedPosition,
                                  persistedPosition,
                                  bookCompleted,
                                })

                                return (
                                  <li key={section.section_id}>
                                    <button
                                      type="button"
                                      onClick={() => onSelect(section)}
                                      aria-current={
                                        itemState === 'current'
                                          ? 'location'
                                          : undefined
                                      }
                                      className={`flex min-h-14 w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 dark:border-night-line ${
                                        itemState === 'current'
                                          ? 'bg-sage-100/80 dark:bg-sage-950/45'
                                          : 'hover:bg-surface-soft dark:hover:bg-sage-950/20'
                                      }`}
                                    >
                                      <IndexStateIcon state={itemState} />

                                      <span className="min-w-0 flex-1">
                                        <span
                                          className={`block text-sm leading-relaxed ${
                                            itemState === 'current'
                                              ? 'font-semibold text-sage-900 dark:text-sage-200'
                                              : 'text-ink dark:text-night-ink'
                                          }`}
                                        >
                                          {getIndexSectionLabel(section)}
                                        </span>

                                        {itemState === 'current' && (
                                          <span className="mt-1 block text-xs font-semibold text-sage-700 dark:text-sage-300">
                                            Você está aqui
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  </li>
                                )
                              })}
                            </ol>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function IndexStateIcon({ state }) {
  if (state === 'read') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-700 text-white dark:bg-sage-300 dark:text-sage-950">
        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
        <span className="sr-only">Lida</span>
      </span>
    )
  }

  if (state === 'current') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-sage-700 dark:border-sage-300">
        <span className="h-2 w-2 rounded-full bg-sage-700 dark:bg-sage-300" />
        <span className="sr-only">{READER_COPY.currentUnitLabel}</span>
      </span>
    )
  }

  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-line dark:text-night-line">
      <Circle size={18} aria-hidden="true" />
      <span className="sr-only">Ainda não lida</span>
    </span>
  )
}
