import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Compass, Home, Settings } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Início', Icon: Home },
  { path: '/biblioteca', label: 'Obras', Icon: BookOpen },
  { path: '/evolucao', label: 'Jornada', Icon: Compass },
  { path: '/configuracoes', label: 'Ajustes', Icon: Settings },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (pathname.startsWith('/ler/')) return null

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-safe backdrop-blur-md dark:border-night-line dark:bg-night/95"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-xl items-stretch justify-around px-2">
        {tabs.map(({ path, label, Icon }) => {
          const active =
            pathname === path ||
            (path !== '/home' && pathname.startsWith(path))

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-vesSm text-xs font-semibold transition-colors ${
                active
                  ? 'text-sage-800 dark:text-sage-300'
                  : 'text-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink'
              }`}
            >
              <Icon
                size={23}
                strokeWidth={active ? 2.4 : 1.8}
                aria-hidden="true"
              />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
