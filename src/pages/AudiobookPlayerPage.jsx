import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Pause,
  Play,
  Square,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { useBooks, useUserData } from '@/hooks'
import { PageLoader } from '@/components/ui'
import { EditorialCard } from '@/components/northstar/NorthStarUI'
import {
  getNextSection,
  getPreviousSection,
  getSectionsFromPosition,
} from '@/features/reader/readerService'
import { getAudioPosition, saveAudioPosition } from '@/features/audio/audioPosition'
import { useSpeechNarration } from '@/features/audio/useSpeechNarration'

const RATE_OPTIONS = [0.85, 0.95, 1.1]

export default function AudiobookPlayerPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const bookId = Number(id)
  const books = useBooks()
  const { progress, dataLoading } = useUserData()
  const book = books.find((item) => item.id === bookId)
  const narration = useSpeechNarration()

  const [section, setSection] = useState(null)
  const [previousSection, setPreviousSection] = useState(null)
  const [nextSection, setNextSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSection = useCallback(async (position) => {
    setLoading(true)
    setError('')

    try {
      const [current] = await getSectionsFromPosition({ bookId, position, limit: 1 })
      if (!current) throw new Error('Não encontramos um trecho disponível para ouvir.')

      const [previous, next] = await Promise.all([
        getPreviousSection({ bookId, position: current.sec_position }),
        getNextSection({ bookId, position: current.sec_position }),
      ])

      setSection(current)
      setPreviousSection(previous)
      setNextSection(next)
      saveAudioPosition(bookId, current.sec_position)
    } catch {
      setError('Não foi possível carregar este trecho para ouvir agora.')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    if (!book || dataLoading) return
    const readingPosition = Number(progress[bookId]?.current_section || 1)
    loadSection(getAudioPosition(bookId, readingPosition))
  }, [book, bookId, dataLoading, loadSection, progress])

  useEffect(() => {
    narration.stop()
  }, [section?.section_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => narration.stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const narrationText = useMemo(() => {
    if (!section) return ''
    return [
      section.chapter_label,
      section.chapter_title,
      section.section_title || section.title,
      section.content,
    ].filter(Boolean).join('. ')
  }, [section])

  if (!book || dataLoading || (loading && !section)) return <PageLoader label="Preparando áudio" />

  const goTo = async (candidate) => {
    if (!candidate || loading) return
    narration.stop()
    await loadSection(candidate.sec_position)
  }

  const togglePlayback = () => {
    if (narration.status === 'playing') {
      narration.pause()
      return
    }
    if (narration.status === 'paused') {
      narration.resume()
      return
    }
    narration.speak(narrationText)
  }

  const displayTitle = section?.section_title || section?.title || section?.chapter_title || 'Trecho da obra'
  const context = [section?.part_title, section?.chapter_label].filter(Boolean).join(' · ')

  return (
    <main className="min-h-screen bg-canvas pb-40 text-ink dark:bg-night dark:text-night-ink">
      <div className="northstar-container pt-7">
        <button
          type="button"
          onClick={() => navigate('/audiobooks')}
          className="flex min-h-11 items-center gap-2 rounded-vesSm px-1 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Audiobooks
        </button>

        <header className="mt-5">
          <p className="ves-eyebrow">Ouvindo</p>
          <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-tight text-ink dark:text-night-ink">{book.title}</h1>
          <p className="mt-2 text-xs text-muted dark:text-night-muted">
            Ponto de áudio independente da sua leitura
          </p>
        </header>

        {!narration.supported && (
          <EditorialCard className="mt-6 p-5">
            <div className="flex items-start gap-3">
              <Headphones size={20} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted dark:text-night-muted">
                Este navegador não oferece narração por voz. Você pode voltar à leitura da obra normalmente.
              </p>
            </div>
          </EditorialCard>
        )}

        {error ? (
          <p role="alert" className="mt-6 rounded-vesMd border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : section ? (
          <article className="mt-8">
            {context && <p className="text-xs font-bold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">{context}</p>}
            <h2 className="mt-2 font-display text-[2rem] font-semibold leading-tight text-ink dark:text-night-ink">{displayTitle}</h2>
            <div className="mt-6 whitespace-pre-line font-display text-[1.18rem] leading-[1.8] text-ink/90 dark:text-night-ink/90">
              {section.content}
            </div>
          </article>
        ) : null}
      </div>

      <section className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/97 pb-safe shadow-[0_-8px_30px_rgba(47,55,47,0.08)] backdrop-blur-xl dark:border-night-line dark:bg-night-surface/97" aria-label="Controles do audiobook">
        <div className="mx-auto max-w-xl px-5 pb-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="truncate text-xs font-medium text-muted dark:text-night-muted">
              Trecho {section?.sec_position || '—'}
            </p>
            <div className="flex items-center gap-1 rounded-full border border-line bg-canvas p-1 dark:border-night-line dark:bg-night">
              {RATE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    narration.stop()
                    narration.setRate(option)
                  }}
                  aria-pressed={narration.rate === option}
                  className={`min-h-8 rounded-full px-2.5 text-[11px] font-semibold ${narration.rate === option ? 'bg-sage-800 text-white dark:bg-sage-300 dark:text-sage-950' : 'text-muted dark:text-night-muted'}`}
                >
                  {option}×
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-4">
            <button
              type="button"
              onClick={() => goTo(previousSection)}
              disabled={!previousSection || loading}
              className="flex h-12 w-12 items-center justify-center rounded-full text-sage-800 disabled:opacity-25 dark:text-sage-300"
              aria-label="Trecho anterior"
            >
              <ChevronLeft size={26} aria-hidden="true" />
            </button>

            <div className="flex items-center justify-center gap-3">
              {narration.status !== 'idle' && (
                <button
                  type="button"
                  onClick={narration.stop}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted dark:border-night-line dark:text-night-muted"
                  aria-label="Parar narração"
                >
                  <Square size={17} fill="currentColor" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!narration.supported || !section || loading}
                className="flex h-16 min-w-16 items-center justify-center rounded-full bg-sage-800 px-6 text-white shadow-sm disabled:opacity-40 dark:bg-sage-300 dark:text-sage-950"
                aria-label={narration.status === 'playing' ? 'Pausar narração' : 'Ouvir trecho'}
              >
                {narration.status === 'playing'
                  ? <Pause size={26} fill="currentColor" aria-hidden="true" />
                  : <Play size={26} fill="currentColor" aria-hidden="true" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => goTo(nextSection)}
              disabled={!nextSection || loading}
              className="flex h-12 w-12 items-center justify-center rounded-full text-sage-800 disabled:opacity-25 dark:text-sage-300"
              aria-label="Próximo trecho"
            >
              <ChevronRight size={26} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
