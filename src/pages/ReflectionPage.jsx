import { useState } from 'react'
import { ArrowLeft, Bookmark, MoreHorizontal, Quote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import heroImage from '@/assets/hero.png'
import { EditorialCard } from '@/components/northstar/NorthStarUI'

const SAVED_REFLECTIONS = [
  { text: 'Fé é ter coragem de avançar mesmo sem ver todo o caminho.', date: '18/05/2024' },
  { text: 'A caridade começa onde termina o julgamento.', date: '12/05/2024' },
]

export default function ReflectionPage() {
  const navigate = useNavigate()
  const [note, setNote] = useState('')

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
                “Ninguém está bastante adiantado na vida para não aprender, nem tão simples e ignorante que não possa ensinar alguma coisa.”
              </p>
              <p className="mt-3 text-xs text-muted dark:text-night-muted">Emmanuel</p>
            </div>
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
        </section>

        <section className="mt-6">
          <h2 className="northstar-section-title">Reflexões salvas</h2>
          <div className="mt-3 space-y-2">
            {SAVED_REFLECTIONS.map((reflection) => (
              <EditorialCard key={reflection.text} className="flex items-center gap-3 p-4">
                <Quote size={18} className="shrink-0 text-sage-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-ink dark:text-night-ink">{reflection.text}</p>
                  <p className="mt-1 text-[10px] text-muted dark:text-night-muted">{reflection.date}</p>
                </div>
                <Bookmark size={17} className="shrink-0 text-sage-700" />
              </EditorialCard>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
