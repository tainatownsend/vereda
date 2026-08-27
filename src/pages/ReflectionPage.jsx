import { useState } from 'react'
import { ArrowLeft, Bookmark, Heart, MoreHorizontal, Quote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import heroImage from '@/assets/hero.png'
import { EditorialCard } from '@/components/northstar/NorthStarUI'

const SAVED_REFLECTIONS = [
  'A caridade começa onde termina o julgamento.',
  'Estudar com calma também é uma forma de constância.',
]

export default function ReflectionPage() {
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [liked, setLiked] = useState(false)

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-8">
        <header className="flex items-center justify-between gap-3">
          <button type="button" className="northstar-icon-button -ml-2" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 font-display text-[1.55rem] font-semibold text-ink dark:text-night-ink">Reflexão do dia</h1>
          <button type="button" className="northstar-icon-button" aria-label="Mais opções">
            <MoreHorizontal size={21} />
          </button>
        </header>

        <div className="mt-4 overflow-hidden rounded-[18px] border border-line bg-sage-100 dark:border-night-line">
          <img src={heroImage} alt="Caminho sereno em meio à natureza" className="h-52 w-full object-cover" />
        </div>

        <EditorialCard className="mt-3 p-5">
          <div className="flex gap-3">
            <Quote size={20} className="mt-1 shrink-0 text-sage-700" />
            <div>
              <p className="font-display text-[1.22rem] leading-[1.55] text-ink dark:text-night-ink">
                “Reconhece-se o verdadeiro espírita pela sua transformação moral e pelos esforços que emprega para domar suas inclinações más.”
              </p>
              <p className="mt-3 text-xs text-muted dark:text-night-muted">O Evangelho segundo o Espiritismo</p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-3 dark:border-night-line">
            <button type="button" onClick={() => setLiked((value) => !value)} className={`northstar-icon-button ${liked ? 'text-sage-800 dark:text-sage-300' : ''}`} aria-label="Curtir reflexão">
              <Heart size={19} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={() => setSaved((value) => !value)} className={`northstar-icon-button ${saved ? 'text-sage-800 dark:text-sage-300' : ''}`} aria-label="Salvar reflexão">
              <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </EditorialCard>

        <section className="mt-6">
          <h2 className="northstar-section-title">Minha reflexão</h2>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Escreva sua reflexão..."
            className="mt-3 min-h-24 w-full resize-none rounded-[15px] border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/70 focus:border-sage-500 dark:border-night-line dark:bg-night-surface dark:text-night-ink"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted dark:text-night-muted">
            Nesta primeira rodada o campo é local à tela; a persistência entra junto da camada de Reflexões.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="northstar-section-title">Reflexões salvas</h2>
          <div className="mt-3 space-y-2">
            {SAVED_REFLECTIONS.map((reflection) => (
              <EditorialCard key={reflection} className="flex items-center gap-3 p-4">
                <Quote size={18} className="shrink-0 text-sage-700" />
                <p className="flex-1 text-sm leading-relaxed text-ink dark:text-night-ink">{reflection}</p>
                <Bookmark size={17} className="shrink-0 text-sage-700" />
              </EditorialCard>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
