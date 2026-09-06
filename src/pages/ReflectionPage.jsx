import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, Cloud, CloudOff, Quote, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import northStarLandscape from '@/assets/northstar-landscape.svg'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui'
import { EditorialCard } from '@/components/northstar/NorthStarUI'
import {
  formatJournalDate,
  getLocalDateKey,
  listStudyJournalEntries,
  saveDailyReflection,
} from '@/features/studyJournal/studyJournal'

const REFLECTION_TEXT = 'Ninguém está bastante adiantado na vida para não aprender, nem tão simples e ignorante que não possa ensinar alguma coisa.'

export default function ReflectionPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const todayKey = getLocalDateKey()

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      const journal = await listStudyJournalEntries(user?.id)
      if (!active) return
      setEntries(journal)
      const today = journal.find((entry) => entry.entryKey === `reflection:${todayKey}`)
      setNote(today?.text || '')
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [todayKey, user?.id])

  const savedReflections = useMemo(
    () => entries.filter((entry) => entry.entryType === 'reflection'),
    [entries],
  )

  const shareReflection = async () => {
    const text = `“${REFLECTION_TEXT}” — Emmanuel`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Reflexão do dia · Vereda', text })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      }
    } catch {
      // Sharing is user-cancelable; keep the reflection flow uninterrupted.
    }
  }

  const saveReflection = async () => {
    if (!note.trim() || saving) return
    setSaving(true)
    setSaveStatus('')

    const saved = await saveDailyReflection(user?.id, note)
    if (!saved) {
      setSaveStatus('Escreva algo antes de salvar sua reflexão.')
      setSaving(false)
      return
    }

    const journal = await listStudyJournalEntries(user?.id)
    setEntries(journal)
    setSaveStatus(saved.synced ? 'Reflexão salva na sua conta.' : 'Reflexão salva neste dispositivo. A sincronização será retomada quando estiver disponível.')
    setSaving(false)
  }

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-8">
        <header className="flex items-center gap-3">
          <button type="button" className="northstar-icon-button -ml-2" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 font-display text-[1.55rem] font-semibold text-ink dark:text-night-ink">Reflexão do dia</h1>
        </header>

        <div className="mt-4 overflow-hidden rounded-[18px] border border-line bg-sage-100 dark:border-night-line">
          <img src={northStarLandscape} alt="Caminho sereno em meio à natureza" className="h-52 w-full object-cover" />
        </div>

        <EditorialCard className="mt-3 p-5">
          <div className="flex gap-3">
            <Quote size={20} className="mt-1 shrink-0 text-sage-700" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[1.22rem] leading-[1.55] text-ink dark:text-night-ink">
                “{REFLECTION_TEXT}”
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted dark:text-night-muted">Emmanuel</p>
                <button
                  type="button"
                  onClick={shareReflection}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-night"
                  aria-label="Compartilhar reflexão do dia"
                >
                  <Share2 size={16} />
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        </EditorialCard>

        <section className="mt-6" aria-labelledby="my-reflection-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="my-reflection-heading" className="northstar-section-title">Minha reflexão</h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted dark:text-night-muted">
              {user ? <Cloud size={14} /> : <CloudOff size={14} />}
              {user ? 'Vinculada à sua conta' : 'Somente neste dispositivo'}
            </span>
          </div>
          <textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setSaveStatus('')
            }}
            placeholder="Escreva sua reflexão..."
            className="mt-3 min-h-32 w-full resize-none rounded-[15px] border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/70 focus:border-sage-500 dark:border-night-line dark:bg-night-surface dark:text-night-ink"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button size="sm" onClick={saveReflection} disabled={!note.trim()} loading={saving}>
              <Bookmark size={17} />
              Salvar minha reflexão
            </Button>
            {saveStatus && (
              <p role="status" aria-live="polite" className="text-xs leading-relaxed text-muted dark:text-night-muted sm:max-w-sm sm:text-right">
                {saveStatus}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="saved-reflections-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Sua jornada</p>
              <h2 id="saved-reflections-heading" className="northstar-section-title mt-1">Minhas reflexões</h2>
            </div>
            <span className="text-xs text-muted dark:text-night-muted">{savedReflections.length}</span>
          </div>

          {loading ? (
            <EditorialCard className="mt-3 p-5"><p className="text-sm text-muted dark:text-night-muted">Carregando suas reflexões...</p></EditorialCard>
          ) : savedReflections.length ? (
            <div className="mt-3 space-y-2">
              {savedReflections.map((reflection) => (
                <EditorialCard key={reflection.entryKey} className="flex items-start gap-3 p-4">
                  <Quote size={18} className="mt-0.5 shrink-0 text-sage-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-ink dark:text-night-ink">{reflection.text}</p>
                    <p className="mt-1 text-[10px] text-muted dark:text-night-muted">{formatJournalDate(reflection.entryDate)}</p>
                  </div>
                </EditorialCard>
              ))}
            </div>
          ) : (
            <EditorialCard className="mt-3 p-5">
              <p className="text-sm text-muted dark:text-night-muted">Quando você salvar uma reflexão pessoal, ela aparecerá aqui e fará parte do seu histórico de estudo.</p>
            </EditorialCard>
          )}
        </section>
      </div>
    </main>
  )
}
