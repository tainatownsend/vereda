import { useLocation, useNavigate } from 'react-router-dom'
import { Bookmark, BookOpen, Home, Leaf, UserRound } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Início', Icon: Home },
  { path: '/biblioteca', label: 'Estudos', Icon: BookOpen },
  { path: '/reflexoes', label: 'Reflexões', Icon: Leaf },
  { path: '/favoritos', label: 'Favoritos', Icon: Bookmark },
  { path: '/configuracoes', label: 'Perfil', Icon: UserRound },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (pathname.startsWith('/ler/')) return null

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4ded4] bg-[#fffdf8]/95 pb-safe backdrop-blur-xl dark:border-night-line dark:bg-night/95"
    >
      <div className="mx-auto flex h-[4.35rem] max-w-xl items-stretch justify-around px-1">
        {tabs.map(({ path, label, Icon }) => {
          const active = pathname === path || (path !== '/home' && pathname.startsWith(path))

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                active
                  ? 'text-[#526443] dark:text-sage-300'
                  : 'text-[#777d74] hover:text-[#334034] dark:text-night-muted'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.1 : 1.55} fill={active && label === 'Favoritos' ? 'currentColor' : 'none'} aria-hidden="true" />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
