import { useEffect, useMemo, useState } from 'react'
import { Bookmark, NotebookPen, Quote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store'
import { getSavedPassageIds } from '@/features/savedPassages/savedPassages'
import { listStudyJournalEntries } from '@/features/studyJournal/studyJournal'
import { EditorialCard } from '@/components/northstar/NorthStarUI'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const savedPassages = getSavedPassageIds(user)
  const [journalEntries, setJournalEntries] = useState([])
  const [journalLoading, setJournalLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      setJournalLoading(true)
      const entries = await listStudyJournalEntries(user?.id)
      if (!active) return
      setJournalEntries(entries)
      setJournalLoading(false)
    }

    load()
    return () => { active = false }
  }, [user?.id])

  const reflections = useMemo(
    () => journalEntries.filter((entry) => entry.entryType === 'reflection'),
    [journalEntries],
  )
  const notes = useMemo(
    () => journalEntries.filter((entry) => entry.entryType === 'note'),
    [journalEntries],
  )

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Seu estudo</p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Favoritos</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
            Trechos, notas e reflexões ficam reunidos aqui para você revisitar quando fizer sentido.
          </p>
        </header>

        <section className="mt-7 space-y-3" aria-label="Coleções salvas" aria-busy={journalLoading}>
          <CollectionCard
            icon={Bookmark}
            title="Trechos das obras"
            count={savedPassages.length}
            description={savedPassages.length ? 'Releia as passagens que você marcou durante seus estudos.' : 'Quando você salvar um trecho durante a leitura, ele aparecerá aqui.'}
            onClick={() => navigate('/salvos')}
          />
          <CollectionCard
            icon={NotebookPen}
            title="Notas de estudo"
            count={journalLoading ? null : notes.length}
            description={journalLoading
              ? 'Carregando suas notas de estudo...'
              : notes.length
                ? 'Volte às ideias e dúvidas que você escreveu durante a leitura.'
                : 'Quando você fizer uma anotação em um trecho, ela aparecerá aqui.'}
            onClick={() => navigate('/notas')}
          />
          <CollectionCard
            icon={Quote}
            title="Minhas reflexões"
            count={journalLoading ? null : reflections.length}
            description={journalLoading
              ? 'Carregando suas reflexões...'
              : reflections.length
                ? 'Releia as reflexões pessoais que você escolheu guardar.'
                : 'Suas reflexões salvas aparecerão aqui.'}
            onClick={() => navigate('/reflexoes')}
          />
        </section>
      </div>
    </main>
  )
}

function CollectionCard({ icon: Icon, title, count, description, onClick }) {
  return (
    <EditorialCard as="button" type="button" onClick={onClick} className="flex min-h-[7rem] w-full items-start gap-4 p-5 text-left">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-semibold text-ink dark:text-night-ink">{title}</p>
          <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-muted dark:bg-night dark:text-night-muted">
            {count ?? '—'}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted dark:text-night-muted">{description}</p>
      </div>
    </EditorialCard>
  )
}
