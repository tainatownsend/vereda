import { useState } from 'react'
import { MoreHorizontal, Plus, Users } from 'lucide-react'

import { EditorialCard } from '@/components/northstar/NorthStarUI'

const GROUPS = [
  { name: 'Estudo Sistematizado', subtitle: 'O Evangelho segundo o Espiritismo', members: 32 },
  { name: 'Grupo da Caridade', subtitle: 'Estudo e prática', members: 713 },
  { name: 'Família Espírita', subtitle: 'Trocas e acolhimento', members: 186 },
]

export default function CommunityPage() {
  const [tab, setTab] = useState('grupos')

  return (
    <main className="northstar-page pb-28">
      <div className="northstar-container pt-9">
        <header className="flex items-center justify-between gap-4">
          <h1 className="font-display text-[2rem] font-medium text-[#233326] dark:text-night-ink">Comunidade</h1>
          <button type="button" className="northstar-icon-button" aria-label="Mais opções">
            <MoreHorizontal size={21} />
          </button>
        </header>

        <div className="mt-6 grid grid-cols-3 border-b border-[#e4ded4] dark:border-night-line">
          {['grupos', 'discussoes', 'amigos'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`relative min-h-12 px-2 text-xs font-medium capitalize ${tab === item ? 'text-[#405239] dark:text-sage-300' : 'text-[#73786f] dark:text-night-muted'}`}
            >
              {item === 'discussoes' ? 'Discussões' : item}
              {tab === item && <span className="absolute inset-x-4 bottom-[-1px] h-[2px] bg-[#657852]" />}
            </button>
          ))}
        </div>

        {tab === 'grupos' ? (
          <>
            <section className="mt-5">
              <h2 className="northstar-section-title">Meus grupos</h2>
              <div className="mt-3 space-y-2">
                {GROUPS.map((group) => <GroupCard key={group.name} group={group} />)}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="northstar-section-title">Explorar grupos</h2>
              <div className="mt-3 space-y-2">
                <GroupCard group={{ name: 'Jovens Espíritas', subtitle: 'Estudo e convivência', members: 341 }} />
                <GroupCard group={{ name: 'Estudo dos Médiuns', subtitle: 'Leitura guiada', members: 256 }} />
              </div>
            </section>

            <button
              type="button"
              className="fixed bottom-24 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#687b50] text-white shadow-[0_10px_24px_rgba(66,82,54,0.25)]"
              aria-label="Criar grupo"
            >
              <Plus size={23} />
            </button>
          </>
        ) : (
          <EditorialCard className="mt-5 p-6 text-center">
            <Users size={24} className="mx-auto text-[#667658]" />
            <p className="mt-3 font-display text-xl text-[#283328] dark:text-night-ink">Estrutura preparada</p>
            <p className="mt-2 text-sm leading-relaxed text-[#72796f] dark:text-night-muted">
              A camada social será conectada ao backend em uma etapa posterior, depois do núcleo de estudo e reflexão.
            </p>
          </EditorialCard>
        )}
      </div>
    </main>
  )
}

function GroupCard({ group }) {
  return (
    <EditorialCard as="button" type="button" className="flex w-full items-center gap-3 p-3 text-left">
      <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[#e7eadf] text-[#586849] dark:bg-sage-950 dark:text-sage-300">
        <Users size={22} strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#293429] dark:text-night-ink">{group.name}</p>
        <p className="mt-0.5 truncate text-xs text-[#747a70] dark:text-night-muted">{group.subtitle}</p>
        <p className="mt-1 text-[10px] text-[#7d827a] dark:text-night-muted">{group.members} membros</p>
      </div>
      <span className="text-xl text-[#9a9d95]">›</span>
    </EditorialCard>
  )
}
