import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Compass, Home, Settings } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Início', Icon: Home },
  { path: '/descobrir', label: 'Descobrir', Icon: Compass },
  { path: '/biblioteca', label: 'Obras', Icon: BookOpen },
  { path: '/configuracoes', label: 'Ajustes', Icon: Settings },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (
    pathname.startsWith('/ler/') ||
    pathname.startsWith('/livro/') ||
    pathname === '/comecar'
  ) {
    return null
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="ves-nav-shell fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-canvas/92 pb-safe backdrop-blur-xl dark:border-night-line dark:bg-night/92"
    >
      <div className="mx-auto flex min-h-[4.9rem] max-w-xl items-center justify-around gap-1 px-1 pt-1 sm:px-2">
        {tabs.map(({ path, label, Icon }) => {
          const active = pathname === path || pathname.startsWith(`${path}/`)

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-vesMd px-1 py-2 text-[0.72rem] font-semibold leading-tight transition-colors sm:px-2 sm:text-xs ${
                active
                  ? 'bg-sage-100 text-sage-900 shadow-sm dark:bg-sage-950 dark:text-sage-200'
                  : 'text-muted hover:bg-surface-soft/70 hover:text-ink dark:text-night-muted dark:hover:bg-night-surface dark:hover:text-night-ink'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.35 : 1.8}
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
