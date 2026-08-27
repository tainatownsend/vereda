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
          <h1 className="font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Comunidade</h1>
          <button type="button" className="northstar-icon-button" aria-label="Mais opções">
            <MoreHorizontal size={21} />
          </button>
        </header>

        <div className="mt-6 grid grid-cols-3 border-b border-line dark:border-night-line">
          {['grupos', 'discussoes', 'amigos'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`relative min-h-12 px-2 text-xs font-medium capitalize ${tab === item ? 'text-sage-800 dark:text-sage-300' : 'text-muted dark:text-night-muted'}`}
            >
              {item === 'discussoes' ? 'Discussões' : item}
              {tab === item && <span className="absolute inset-x-4 bottom-[-1px] h-[2px] bg-sage-600" />}
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

            <EditorialCard className="mt-6 p-4 text-center">
              <p className="text-xs leading-relaxed text-muted dark:text-night-muted">
                Esta tela define o North Star visual. Criação de grupos, discussões e conexões serão ativadas apenas na fase de Comunidade.
              </p>
            </EditorialCard>

            <button
              type="button"
              disabled
              className="fixed bottom-24 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-sage-700 text-white opacity-45 shadow-[0_10px_24px_rgba(66,82,54,0.25)]"
              aria-label="Criar grupo — em breve"
            >
              <Plus size={23} />
            </button>
          </>
        ) : (
          <EditorialCard className="mt-5 p-6 text-center">
            <Users size={24} className="mx-auto text-sage-700" />
            <p className="mt-3 font-display text-xl font-semibold text-ink dark:text-night-ink">Estrutura preparada</p>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
              Discussões e conexões entram na última fase, junto com moderação, privacidade e segurança social.
            </p>
          </EditorialCard>
        )}
      </div>
    </main>
  )
}

function GroupCard({ group }) {
  return (
    <EditorialCard as="button" type="button" disabled className="flex w-full items-center gap-3 p-3 text-left disabled:cursor-default">
      <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[10px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
        <Users size={22} strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink dark:text-night-ink">{group.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted dark:text-night-muted">{group.subtitle}</p>
        <p className="mt-1 text-[10px] text-muted dark:text-night-muted">{group.members} membros</p>
      </div>
      <span className="text-xl text-muted">›</span>
    </EditorialCard>
  )
}
