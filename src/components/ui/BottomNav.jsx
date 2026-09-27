import { getActiveDestination } from '@/features/ui/navigation'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Home, Heart, ListFilter } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Início', Icon: Home },
  { path: '/biblioteca', label: 'Estudos', Icon: BookOpen },
  { path: '/reflexoes', label: 'Reflexões', Icon: Heart },
  { path: '/mais', label: 'Mais', Icon: ListFilter },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (pathname.startsWith('/ler/') || pathname.startsWith('/livro/') || pathname.startsWith('/trecho/') || pathname === '/comecar' || /^\/estudo-guiado\/[^/]+\/[^/]+/.test(pathname)) return null
  return (
    <nav aria-label="Navegação principal" className="ves-nav-shell fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-safe backdrop-blur-xl dark:border-night-line dark:bg-night/95">
      <div className="mx-auto grid min-h-[4.8rem] max-w-xl grid-cols-4 items-center px-2">
        {tabs.map(({ path, label, Icon }) => {
          const active = getActiveDestination(pathname) === path
          return <button key={path} type="button" onClick={() => navigate(path)} aria-current={active ? 'page' : undefined}
            className={`northstar-nav-item ${active ? 'is-active' : ''}`}>
            <Icon size={22} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
            <span>{label}</span>
          </button>
        })}
      </div>
    </nav>
  )
}
