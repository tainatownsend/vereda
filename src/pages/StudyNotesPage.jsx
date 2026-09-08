import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, NotebookPen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store'
import { Button } from '@/components/ui'
import { EditorialCard } from '@/components/northstar/NorthStarUI'
import { formatJournalDate, listStudyJournalEntries } from '@/features/studyJournal/studyJournal'

export default function StudyNotesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      const journal = await listStudyJournalEntries(user?.id)
      if (!active) return
      setEntries(journal)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [user?.id])

  const notes = useMemo(
    () => entries.filter((entry) => entry.entryType === 'note'),
    [entries],
  )

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-8">
        <header className="flex items-start gap-3">
          <button
            type="button"
            className="northstar-icon-button -ml-2 mt-0.5"
            onClick={() => navigate('/favoritos')}
            aria-label="Voltar aos favoritos"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Seu estudo</p>
            <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Notas de estudo</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted dark:text-night-muted">
              Ideias, dúvidas e conexões que você guardou durante a leitura aparecem aqui junto do trecho de origem.
            </p>
          </div>
        </header>

        {loading ? (
          <EditorialCard className="mt-7 p-5" aria-live="polite">
            <p className="text-sm text-muted dark:text-night-muted">Carregando suas notas...</p>
          </EditorialCard>
        ) : notes.length ? (
          <section className="mt-7 space-y-3" aria-label="Notas salvas">
            {notes.map((note) => (
              <EditorialCard key={note.entryKey} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                    <NotebookPen size={20} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold leading-snug text-ink dark:text-night-ink">
                      {note.sourceTitle || 'Nota de estudo'}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/85 dark:text-night-ink/90">
                      {note.text}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-muted dark:text-night-muted">
                        {formatJournalDate(note.entryDate)}
                      </span>
                      {note.sectionId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/trecho/${note.sectionId}?from=notas`)}
                          className="northstar-text-action inline-flex min-h-11 items-center gap-2"
                        >
                          <BookOpen size={16} aria-hidden="true" />
                          Abrir trecho de origem
                        </button>
                      ) : (
                        <span className="text-xs text-muted dark:text-night-muted">Trecho de origem indisponível</span>
                      )}
                    </div>
                  </div>
                </div>
              </EditorialCard>
            ))}
          </section>
        ) : (
          <EditorialCard className="mt-7 p-6">
            <div className="flex items-start gap-3">
              <NotebookPen size={22} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
              <div>
                <h2 className="font-display text-xl font-semibold text-ink dark:text-night-ink">Você ainda não guardou nenhuma nota.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                  Durante uma leitura, abra o menu do trecho e escolha “Minha nota neste trecho”.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/biblioteca')} className="mt-5 w-full sm:w-auto">
              Escolher uma obra para estudar
            </Button>
          </EditorialCard>
        )}
      </div>
    </main>
  )
}
