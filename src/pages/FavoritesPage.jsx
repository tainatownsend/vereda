import { Bookmark, BookOpen, Quote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store'
import { getSavedPassageIds } from '@/features/savedPassages/savedPassages'
import { EditorialCard } from '@/components/northstar/NorthStarUI'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const savedPassages = getSavedPassageIds(user)

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Sua coleção</p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Favoritos</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
            Reúna trechos e reflexões que você deseja revisitar.
          </p>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SummaryCard icon={Quote} label="Reflexões" value="2 salvas" onClick={() => navigate('/reflexoes')} />
          <SummaryCard
            icon={BookOpen}
            label="Trechos"
            value={savedPassages.length ? `${savedPassages.length} salvos` : 'Nenhum ainda'}
            onClick={() => navigate('/salvos')}
          />
        </div>

        <section className="mt-7">
          <h2 className="northstar-section-title">Para revisitar</h2>
          <div className="mt-3 space-y-2">
            <EditorialCard as="button" type="button" onClick={() => navigate('/salvos')} className="flex w-full items-start gap-3 p-4 text-left">
              <Bookmark size={18} className="mt-0.5 shrink-0 text-sage-700" fill="currentColor" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink dark:text-night-ink">Trechos salvos das obras</p>
                <p className="mt-1 text-xs leading-relaxed text-muted dark:text-night-muted">
                  Continue usando a coleção de passagens que já existe no Vereda.
                </p>
              </div>
            </EditorialCard>

            <EditorialCard as="button" type="button" onClick={() => navigate('/reflexoes')} className="flex w-full items-start gap-3 p-4 text-left">
              <Quote size={18} className="mt-0.5 shrink-0 text-sage-700" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink dark:text-night-ink">Reflexões</p>
                <p className="mt-1 text-xs leading-relaxed text-muted dark:text-night-muted">
                  Releia a reflexão do dia e seus registros pessoais.
                </p>
              </div>
            </EditorialCard>
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ icon: Icon, label, value, onClick }) {
  return (
    <EditorialCard as="button" type="button" onClick={onClick} className="p-4 text-left">
      <Icon size={20} className="text-sage-700" />
      <p className="mt-4 text-sm font-semibold text-ink dark:text-night-ink">{label}</p>
      <p className="mt-1 text-xs text-muted dark:text-night-muted">{value}</p>
    </EditorialCard>
  )
}
