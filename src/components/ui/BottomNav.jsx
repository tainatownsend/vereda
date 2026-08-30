import { useLocation, useNavigate } from 'react-router-dom'
import { Bookmark, BookOpen, Compass, Home, UserRound } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Início', Icon: Home },
  { path: '/biblioteca', label: 'Estudos', Icon: BookOpen },
  { path: '/descobrir', label: 'Descobrir', Icon: Compass },
  { path: '/favoritos', label: 'Favoritos', Icon: Bookmark },
  { path: '/configuracoes', label: 'Perfil', Icon: UserRound },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (
    pathname.startsWith('/ler/') ||
    pathname.startsWith('/livro/') ||
    pathname === '/comecar' ||
    pathname === '/reflexoes'
  ) {
    return null
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="ves-nav-shell fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 pb-safe backdrop-blur-xl dark:border-night-line dark:bg-night/95"
    >
      <div className="mx-auto flex min-h-[4.65rem] max-w-xl items-center justify-around gap-0 px-1 pt-1">
        {tabs.map(({ path, label, Icon }) => {
          const active = pathname === path || pathname.startsWith(`${path}/`)

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.66rem] font-medium leading-tight transition-colors ${
                active
                  ? 'text-sage-800 dark:text-sage-300'
                  : 'text-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.2 : 1.6}
                fill={active && label === 'Favoritos' ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span className="max-w-full truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
