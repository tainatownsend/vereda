import PageBackButton from '@/components/ui/PageBackButton'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, CalendarDays, ChevronRight, Heart, Leaf, LogOut, NotebookPen, Settings, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store'

const groups = [
  { title: 'Meu caminho', items: [
    ['/evolucao', 'Minha jornada', Leaf], ['/notas', 'Notas de estudo', NotebookPen],
    ['/salvos', 'Trechos salvos', Bookmark], ['/favoritos', 'Favoritos', Heart],
    ['/plano-de-estudo', 'Plano de estudo', CalendarDays],
  ] },
  { title: 'Minha conta', items: [
    ['/configuracoes', 'Perfil', UserRound],
    ['/configuracoes', 'Preferências, lembretes e privacidade', Settings],
  ] },
]
export default function MorePage() {
  const navigate = useNavigate()
  const { signOut } = useAuthStore()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const leave = async () => {
    setBusy(true)
    try { await signOut(); navigate('/') } catch { setStatus('Não foi possível sair agora. Tente novamente.'); setBusy(false) }
  }
  return <main className="northstar-page pb-28"><div className="northstar-container pt-8">
    <div className="flex min-w-0 items-center gap-2"><PageBackButton /><h1 className="min-w-0 font-display text-[2rem]">Mais</h1></div>
    {groups.map(group => <section key={group.title} className="mt-8" aria-label={group.title}>
      <h2 className="mb-2 text-sm font-medium text-muted dark:text-night-muted">{group.title}</h2>
      <ul className="divide-y divide-line dark:divide-night-line">{group.items.map(([path, label, Icon]) => <li key={label}>
        <button type="button" onClick={() => navigate(path)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left text-base"><Icon size={21} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" /><span className="flex-1">{label}</span><ChevronRight size={19} aria-hidden="true" /></button>
      </li>)}</ul>
    </section>)}
    <button type="button" onClick={leave} disabled={busy} className="mt-6 flex min-h-14 items-center gap-3 text-base disabled:opacity-50"><LogOut size={21} aria-hidden="true" />{busy ? 'Saindo…' : 'Sair'}</button>
    {status && <p role="alert" className="mt-3">{status}</p>}
  </div></main>
}
