import { useState } from 'react'
import { ArrowLeft, Bookmark, Quote, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import northStarLandscape from '@/assets/northstar-landscape.svg'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui'
import { EditorialCard } from '@/components/northstar/NorthStarUI'
import {
  formatReflectionDate,
  getSavedReflections,
  getTodayReflection,
  saveTodayReflection,
} from '@/features/reflections/localReflections'

const REFLECTION_TEXT = 'Ninguém está bastante adiantado na vida para não aprender, nem tão simples e ignorante que não possa ensinar alguma coisa.'

export default function ReflectionPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const initialReflection = getTodayReflection(user?.id)
  const [note, setNote] = useState(initialReflection?.text || '')
  const [savedReflections, setSavedReflections] = useState(() => getSavedReflections(user?.id))
  const [saveStatus, setSaveStatus] = useState(initialReflection ? 'Sua reflexão de hoje está salva neste dispositivo.' : '')

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

  const saveReflection = () => {
    const saved = saveTodayReflection(user?.id, note)
    if (!saved) {
      setSaveStatus('Escreva algo antes de salvar sua reflexão.')
      return
    }

    setSavedReflections(getSavedReflections(user?.id))
    setSaveStatus('Reflexão salva neste dispositivo.')
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
          <h2 id="my-reflection-heading" className="northstar-section-title">Minha reflexão</h2>
          <textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setSaveStatus('')
            }}
            placeholder="Escreva sua reflexão..."
            className="mt-3 min-h-28 w-full resize-none rounded-[15px] border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/70 focus:border-sage-500 dark:border-night-line dark:bg-night-surface dark:text-night-ink"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button size="sm" onClick={saveReflection} disabled={!note.trim()}>
              <Bookmark size={17} />
              Salvar minha reflexão
            </Button>
            {saveStatus && (
              <p role="status" aria-live="polite" className="text-xs leading-relaxed text-muted dark:text-night-muted">
                {saveStatus}
              </p>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted dark:text-night-muted">
            Nesta versão, suas reflexões ficam salvas somente neste dispositivo.
          </p>
        </section>

        <section className="mt-7" aria-labelledby="saved-reflections-heading">
          <h2 id="saved-reflections-heading" className="northstar-section-title">Minhas reflexões salvas</h2>
          {savedReflections.length ? (
            <div className="mt-3 space-y-2">
              {savedReflections.map((reflection) => (
                <EditorialCard key={`${reflection.dateKey}-${reflection.savedAt}`} className="flex items-start gap-3 p-4">
                  <Quote size={18} className="mt-0.5 shrink-0 text-sage-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-ink dark:text-night-ink">{reflection.text}</p>
                    <p className="mt-1 text-[10px] text-muted dark:text-night-muted">{formatReflectionDate(reflection.dateKey)}</p>
                  </div>
                </EditorialCard>
              ))}
            </div>
          ) : (
            <EditorialCard className="mt-3 p-5">
              <p className="text-sm text-muted dark:text-night-muted">Quando você salvar uma reflexão pessoal, ela aparecerá aqui.</p>
            </EditorialCard>
          )}
        </section>
      </div>
    </main>
  )
}
