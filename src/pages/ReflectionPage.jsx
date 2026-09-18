import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Cloud, CloudOff, Image, Quote, RefreshCw, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import northStarLandscape from '@/assets/northstar-landscape.svg'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui'
import { EditorialCard } from '@/components/northstar/NorthStarUI'
import { shareReflectionAsImage } from '@/features/share/reflectionCard'
import {
  getDailyReflection,
  getNextReflection,
  getPreviousDailyReflections,
} from '@/features/reflections/dailyReflections'
import {
  formatJournalDate,
  getLocalDateKey,
  listStudyJournalEntries,
  saveDailyReflection,
} from '@/features/studyJournal/studyJournal'


export default function ReflectionPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const dailyReflection = useMemo(() => getDailyReflection(), [])
  const previousDailyReflections = useMemo(() => getPreviousDailyReflections(7), [])
  const [featuredReflection, setFeaturedReflection] = useState(dailyReflection)
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

  const shareImage = async ({ text, author }) => {
    setShareStatus('')
    try {
      const result = await shareReflectionAsImage({ text, author })
      if (result === 'shared') {
        setShareStatus('Compartilhamento aberto com a arte da reflexão.')
      } else if (result === 'copied') {
        setShareStatus('Imagem copiada. Cole diretamente na conversa, publicação ou status em que quiser compartilhar.')
      } else if (result === 'downloaded') {
        setShareStatus('A imagem foi salva porque o navegador não oferece compartilhamento direto.')
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
      setShareStatus('Não foi possível criar a imagem agora. Tente novamente.')
    }
  }

  const saveReflection = async () => {
    if (!note.trim() || saving) return
    setSaving(true)
    setSaveStatus('')

    try {
      const saved = await saveDailyReflection(user?.id, note)
      if (!saved) {
        setSaveStatus('Escreva algo antes de salvar sua reflexão.')
        return
      }

      const journal = await listStudyJournalEntries(user?.id)
      setEntries(journal)

      if (saved.synced) {
        setSaveStatus('Reflexão salva na sua conta.')
      } else if (saved.localSaved === false) {
        setSaveStatus('Não foi possível salvar esta reflexão agora. Copie o texto antes de sair e tente novamente.')
      } else {
        setSaveStatus('Reflexão salva neste dispositivo. A sincronização será retomada quando estiver disponível.')
      }
    } catch {
      setSaveStatus('Não foi possível salvar esta reflexão agora. Tente novamente em instantes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-8">
        <header>
          <h1 className="font-display text-[1.72rem] font-semibold text-ink dark:text-night-ink">Reflexões</h1>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-[14px] bg-[#EEE4D4] p-1 dark:bg-night-surface" aria-label="Áreas de reflexões">
          <button
            type="button"
            onClick={() => document.getElementById('reflection-today')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="min-h-10 rounded-[11px] bg-[#FBF8F1] px-3 text-xs font-semibold text-[#53664E] shadow-sm dark:bg-night dark:text-sage-300"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => navigate('/favoritos')}
            className="min-h-10 rounded-[11px] px-3 text-xs font-semibold text-muted hover:text-ink dark:text-night-muted"
          >
            Favoritas
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('my-reflection-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="min-h-10 rounded-[11px] px-3 text-xs font-semibold text-muted hover:text-ink dark:text-night-muted"
          >
            Minhas
          </button>
        </div>

        <section
          id="reflection-today"
          className="mt-4 scroll-mt-6 overflow-hidden rounded-[20px] border border-[#D8CCBA] bg-[#F7EFE2] shadow-[0_14px_34px_rgba(67,62,49,0.08)] dark:border-night-line dark:bg-night-surface"
          aria-labelledby="featured-reflection-title"
        >
          <div className="relative min-h-[19rem] overflow-hidden">
            <img
              src={northStarLandscape}
              alt="Paisagem serena ao amanhecer"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#F5E7CF]/5 via-[#EFE0C6]/20 to-[#F8F0E5]/96" />
            <div className="relative flex min-h-[19rem] flex-col justify-end px-6 pb-7 pt-24 text-center">
              <p id="featured-reflection-title" className="sr-only">
                {featuredReflection.id === dailyReflection.id ? 'Reflexão de hoje' : 'Outra reflexão'}
              </p>
              <Quote size={20} className="mx-auto mb-3 text-[#69735F]" aria-hidden="true" />
              <p className="mx-auto max-w-[19rem] font-display text-[1.06rem] italic leading-[1.55] text-[#343A30]">
                “{featuredReflection.text}”
              </p>
              <p className="mt-3 text-[0.72rem] font-medium text-[#686B63]">
                {featuredReflection.author}
              </p>
            </div>
          </div>

          <div className="flex min-h-12 items-center justify-center gap-5 border-t border-[#E2D6C4] bg-[#FBF8F1]/95 px-4 py-2">
            <button
              type="button"
              onClick={() => shareImage({ text: featuredReflection.text, author: featuredReflection.author })}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-[#53664E] hover:bg-[#EEE4D4]"
              aria-label="Compartilhar esta reflexão"
            >
              <Share2 size={16} />
              Compartilhar
            </button>
            <button
              type="button"
              onClick={() => {
                setFeaturedReflection((current) => getNextReflection(current.id))
                setShareStatus('')
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-[#53664E] hover:bg-[#EEE4D4]"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Outra
            </button>
          </div>
        </section>

        <section className="mt-7" aria-labelledby="previous-daily-reflections-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Para revisitar</p>
              <h2 id="previous-daily-reflections-heading" className="northstar-section-title mt-1">Reflexões anteriores</h2>
            </div>
            <span className="text-xs text-muted dark:text-night-muted">{previousDailyReflections.length}</span>
          </div>

          <div className="mt-3 space-y-2">
            {previousDailyReflections.map((reflection) => (
              <EditorialCard key={reflection.dateKey} className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">{reflection.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink dark:text-night-ink">“{reflection.text}”</p>
                <p className="mt-1.5 text-xs font-semibold text-muted dark:text-night-muted">— {reflection.author}</p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => shareImage({ text: reflection.text, author: reflection.author })}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-night"
                    aria-label={`Compartilhar reflexão de ${reflection.label}`}
                  >
                    <Share2 size={15} aria-hidden="true" />
                    Compartilhar
                  </button>
                </div>
              </EditorialCard>
            ))}
          </div>
        </section>

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
              setShareStatus('')
            }}
            placeholder="Escreva sua reflexão..."
            className="mt-3 min-h-32 w-full resize-none rounded-[15px] border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/70 focus:border-sage-500 dark:border-night-line dark:bg-night-surface dark:text-night-ink"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button size="sm" onClick={saveReflection} disabled={!note.trim()} loading={saving}>
              <Bookmark size={17} />
              Salvar minha reflexão
            </Button>
            <button
              type="button"
              onClick={() => shareImage({ text: note })}
              disabled={!note.trim()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-vesSm border border-sage-300 px-4 text-sm font-semibold text-sage-800 disabled:opacity-50 dark:border-sage-800 dark:text-sage-300"
            >
              <Image size={17} aria-hidden="true" />
              Compartilhar minha reflexão
            </button>
          </div>
          {saveStatus && (
            <p role="status" aria-live="polite" className="mt-3 text-xs leading-relaxed text-muted dark:text-night-muted">
              {saveStatus}
            </p>
          )}
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
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[10px] text-muted dark:text-night-muted">{formatJournalDate(reflection.entryDate)}</p>
                      <button
                        type="button"
                        onClick={() => shareImage({ text: reflection.text })}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-night"
                        aria-label="Compartilhar esta reflexão como imagem"
                      >
                        <Share2 size={15} aria-hidden="true" /> Compartilhar
                      </button>
                    </div>
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

      {shareStatus && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-vesSm border border-sage-200 bg-surface/95 px-4 py-3 text-center text-xs font-medium leading-relaxed text-sage-900 shadow-lg backdrop-blur dark:border-sage-900 dark:bg-night-surface/95 dark:text-sage-200" role="status" aria-live="polite">
          {shareStatus}
        </div>
      )}
    </main>
  )
}
