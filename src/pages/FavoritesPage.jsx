import { Bookmark, BookOpen, Quote } from 'lucide-react'

import { EditorialCard } from '@/components/northstar/NorthStarUI'

export default function FavoritesPage() {
  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#697260]">Sua coleção</p>
          <h1 className="mt-1 font-display text-[2rem] font-medium text-[#233326] dark:text-night-ink">Favoritos</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#72796f] dark:text-night-muted">
            Reúna trechos, reflexões e conteúdos que você deseja revisitar.
          </p>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SummaryCard icon={Quote} label="Reflexões" value="2 salvas" />
          <SummaryCard icon={BookOpen} label="Trechos" value="Em breve" />
        </div>

        <section className="mt-7">
          <h2 className="northstar-section-title">Reflexões salvas</h2>
          <div className="mt-3 space-y-2">
            <EditorialCard className="flex items-start gap-3 p-4">
              <Quote size={18} className="mt-0.5 shrink-0 text-[#6d7d5c]" />
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-[#39443a] dark:text-night-ink">A caridade começa onde termina o julgamento.</p>
                <p className="mt-2 text-[10px] text-[#83877f]">Reflexão pessoal</p>
              </div>
              <Bookmark size={17} className="shrink-0 text-[#687658]" fill="currentColor" />
            </EditorialCard>

            <EditorialCard className="flex items-start gap-3 p-4">
              <Quote size={18} className="mt-0.5 shrink-0 text-[#6d7d5c]" />
              <div className="flex-1">
                <p className="text-sm leading-relaxed text-[#39443a] dark:text-night-ink">Estudar com calma também é uma forma de constância.</p>
                <p className="mt-2 text-[10px] text-[#83877f]">Reflexão pessoal</p>
              </div>
              <Bookmark size={17} className="shrink-0 text-[#687658]" fill="currentColor" />
            </EditorialCard>
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <EditorialCard className="p-4">
      <Icon size={20} className="text-[#667658]" />
      <p className="mt-4 text-sm font-semibold text-[#2b362c] dark:text-night-ink">{label}</p>
      <p className="mt-1 text-xs text-[#777d74] dark:text-night-muted">{value}</p>
    </EditorialCard>
  )
}
