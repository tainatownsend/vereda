import PageBackButton from '@/components/ui/PageBackButton'
import { useEffect, useMemo, useState } from 'react'
import { Heart, Bookmark, Cloud, CloudOff, Image, Quote, RefreshCw, Share2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import northStarLandscape from '@/assets/vereda-sunrise.webp'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui'
import { EditorialCard } from '@/components/northstar/NorthStarUI'
import { getFavoriteReflectionIds } from '@/features/reflections/favorites'
import { shareReflectionAsImage } from '@/features/share/reflectionCard'
import {
  getDailyReflection,
  getReflectionsByIds,
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
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = ['today', 'favorites', 'mine'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'today'
  const { user, setReflectionFavorite } = useAuthStore()
  const [savingFavorite, setSavingFavorite] = useState(false)
  const [favoriteStatus, setFavoriteStatus] = useState('')
  const favoriteIds = getFavoriteReflectionIds(user)
  const favorites = getReflectionsByIds(favoriteIds)
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

  const toggleFavorite = async (id) => {
    if (savingFavorite) return
    setSavingFavorite(true)
    setFavoriteStatus('')
    try {
      const saved = !favoriteIds.includes(id)
      await setReflectionFavorite(id, saved)
      setFavoriteStatus(saved ? 'Reflexão salva nas favoritas da sua conta.' : 'Reflexão removida das favoritas.')
    } catch { setFavoriteStatus('Não foi possível salvar agora. Tente novamente.') }
    finally { setSavingFavorite(false) }
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
        <header><div className="flex min-w-0 items-center gap-2"><PageBackButton /><h1 className="min-w-0 font-display text-[2rem]">Reflexões</h1></div></header>
        <div className="editorial-tabs mt-5" role="group" aria-label="Escolher reflexões">
          {[['today', 'Hoje'], ['favorites', 'Favoritas'], ['mine', 'Minhas']].map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setSearchParams(id === 'today' ? {} : { tab: id })}>{label}</button>)}
        </div>
        {tab === 'today' && <>
        <section className="reflection-composition mt-5" aria-label="Reflexão de hoje">
          <img src={northStarLandscape} alt="Colinas ao amanhecer, em uma paisagem serena" />
          <div className="reflection-quotation"><blockquote>“{featuredReflection.text}”</blockquote>
            <p className="mt-5 text-sm text-muted dark:text-night-muted">{featuredReflection.author}</p>
          </div>
        </section>
        <div className="mt-3 flex flex-wrap items-center justify-around gap-2">
          <button type="button" onClick={() => toggleFavorite(featuredReflection.id)} disabled={savingFavorite} aria-pressed={favoriteIds.includes(featuredReflection.id)} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-base disabled:opacity-50">
            <Heart size={20} fill={favoriteIds.includes(featuredReflection.id) ? 'currentColor' : 'none'} aria-hidden="true" />{favoriteIds.includes(featuredReflection.id) ? 'Salva' : 'Salvar'}
          </button>
          <button type="button" onClick={() => shareImage({ text: featuredReflection.text, author: featuredReflection.author })} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-base" aria-label="Compartilhar esta reflexão"><Share2 size={20} aria-hidden="true" />Compartilhar</button>
        </div>
        <button type="button" onClick={() => { setFeaturedReflection(current => getNextReflection(current.id)); setShareStatus('') }} className="northstar-text-action mt-3 inline-flex items-center gap-2"><RefreshCw size={16} aria-hidden="true" />Ler outra reflexão</button>
        <details className="mt-5"><summary className="min-h-11 cursor-pointer py-3 text-base">Reflexões anteriores</summary>
        <section className="mt-7" aria-labelledby="previous-daily-reflections-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Para revisitar</p>
              <h2 id="previous-daily-reflections-heading" className="northstar-section-title mt-1">Reflexões anteriores</h2>
            </div>
            <span className="text-sm text-muted dark:text-night-muted">{previousDailyReflections.length}</span>
          </div>

          <div className="mt-3 space-y-2">
            {previousDailyReflections.map((reflection) => (
              <EditorialCard key={reflection.dateKey} className="p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">{reflection.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink dark:text-night-ink">“{reflection.text}”</p>
                <p className="mt-1.5 text-sm font-semibold text-muted dark:text-night-muted">— {reflection.author}</p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => shareImage({ text: reflection.text, author: reflection.author })}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-night"
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

        </details></>}
        {tab === 'favorites' && <section className="mt-5" aria-label="Reflexões favoritas">
          {favorites.length ? favorites.map(reflection => <EditorialCard key={reflection.id} className="mb-3 p-5">
            <blockquote className="font-display text-xl leading-relaxed">“{reflection.text}”</blockquote>
            <p className="mt-3 text-sm text-muted dark:text-night-muted">{reflection.author}</p>
            <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={savingFavorite} onClick={() => toggleFavorite(reflection.id)} className="northstar-text-action">Remover das favoritas</button>
              <button type="button" onClick={() => shareImage(reflection)} className="northstar-text-action">Compartilhar</button></div>
          </EditorialCard>) : <p className="py-8 text-base leading-relaxed text-muted dark:text-night-muted">Salve uma reflexão em Hoje para encontrá-la aqui quando precisar.</p>}
        </section>}
        {favoriteStatus && <p role="status" className="mt-3 text-sm">{favoriteStatus}</p>}
        {tab === 'mine' && <>
        <section className="mt-6" aria-labelledby="my-reflection-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="my-reflection-heading" className="northstar-section-title">Minha reflexão</h2>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted dark:text-night-muted">
              {user ? <Cloud size={14} /> : <CloudOff size={14} />}
              {user ? 'Vinculada à sua conta' : 'Somente neste dispositivo'}
            </span>
          </div>
          <textarea
            aria-label="Minha reflexão"
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-vesSm border border-sage-300 px-4 text-sm font-semibold text-sage-800 disabled:opacity-50 dark:border-sage-800 dark:text-sage-300"
            >
              <Image size={17} aria-hidden="true" />
              Compartilhar minha reflexão
            </button>
          </div>
          {saveStatus && (
            <p role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
              {saveStatus}
            </p>
          )}
        </section>

        <section className="mt-8" aria-labelledby="saved-reflections-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Sua jornada</p>
              <h2 id="saved-reflections-heading" className="northstar-section-title mt-1">Minhas reflexões</h2>
            </div>
            <span className="text-sm text-muted dark:text-night-muted">{savedReflections.length}</span>
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
                      <p className="text-sm text-muted dark:text-night-muted">{formatJournalDate(reflection.entryDate)}</p>
                      <button
                        type="button"
                        onClick={() => shareImage({ text: reflection.text })}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-night"
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
        </>}
      </div>

      {shareStatus && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-vesSm border border-sage-200 bg-surface/95 px-4 py-3 text-center text-sm font-medium leading-relaxed text-sage-900 shadow-lg backdrop-blur dark:border-sage-900 dark:bg-night-surface/95 dark:text-sage-200" role="status" aria-live="polite">
          {shareStatus}
        </div>
      )}
    </main>
  )
}
