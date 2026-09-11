import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, Cloud, CloudOff, Image, Quote, RefreshCw, Share2 } from 'lucide-react'
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

  const shareImage = async ({ text, attribution = '' }) => {
    setShareStatus('')
    try {
      const result = await shareReflectionAsImage({ text, attribution })
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
        <header className="flex items-center gap-3">
          <button type="button" className="northstar-icon-button -ml-2" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Reflexões</p>
            <h1 className="mt-1 font-display text-[1.55rem] font-semibold text-ink dark:text-night-ink">Um espaço para parar e pensar</h1>
          </div>
        </header>

        <div className="mt-4 overflow-hidden rounded-[18px] border border-line bg-sage-100 dark:border-night-line">
          <img src={northStarLandscape} alt="Caminho sereno em meio à natureza" className="h-52 w-full object-cover" />
        </div>

        <EditorialCard className="mt-3 p-5">
          <div className="flex gap-3">
            <Quote size={20} className="mt-1 shrink-0 text-sage-700" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">
                {featuredReflection.id === dailyReflection.id ? 'Reflexão de hoje' : 'Outra reflexão'}
              </p>
              <p className="mt-2 font-display text-[1.22rem] leading-[1.55] text-ink dark:text-night-ink">
                “{featuredReflection.text}”
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => shareImage({ text: featuredReflection.text })}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-vesSm border border-sage-300 px-4 text-sm font-semibold text-sage-800 dark:border-sage-800 dark:text-sage-300"
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
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-vesSm px-4 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950/30"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Gerar outra reflexão
                </button>
              </div>
            </div>
          </div>
        </EditorialCard>

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
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => shareImage({ text: reflection.text })}
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
          {shareStatus && (
            <p role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed text-sage-800 dark:text-sage-300">
              {shareStatus}
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
                        onClick={() => shareImage({ text: reflection.text, attribution: formatJournalDate(reflection.entryDate) })}
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
    </main>
  )
}
