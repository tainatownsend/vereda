import { Bookmark, Quote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store'
import { getSavedPassageIds } from '@/features/savedPassages/savedPassages'
import { getSavedReflections } from '@/features/reflections/localReflections'
import { EditorialCard } from '@/components/northstar/NorthStarUI'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const savedPassages = getSavedPassageIds(user)
  const savedReflections = getSavedReflections(user?.id)

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Sua coleção</p>
          <h1 className="mt-1 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Favoritos</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
            Volte ao que você decidiu guardar para consultar depois.
          </p>
        </header>

        <section className="mt-7 space-y-3" aria-label="Coleções salvas">
          <CollectionCard
            icon={Bookmark}
            title="Trechos das obras"
            count={savedPassages.length}
            description={savedPassages.length ? 'Releia as passagens que você marcou durante seus estudos.' : 'Quando você salvar um trecho durante a leitura, ele aparecerá aqui.'}
            onClick={() => navigate('/salvos')}
          />
          <CollectionCard
            icon={Quote}
            title="Minhas reflexões"
            count={savedReflections.length}
            description={savedReflections.length ? 'Releia as reflexões pessoais que você escolheu guardar.' : 'Suas reflexões salvas aparecerão aqui.'}
            onClick={() => navigate('/reflexoes')}
          />
        </section>
      </div>
    </main>
  )
}

function CollectionCard({ icon: Icon, title, count, description, onClick }) {
  return (
    <EditorialCard as="button" type="button" onClick={onClick} className="flex w-full items-start gap-4 p-5 text-left">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-ink dark:text-night-ink">{title}</p>
          <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-muted dark:bg-night dark:text-night-muted">
            {count}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted dark:text-night-muted">{description}</p>
      </div>
    </EditorialCard>
  )
}
