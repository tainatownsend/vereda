import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Home, Compass, MessageCircle } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Início', Icon: Home },
  { path: '/estudo-guiado', label: 'Estudos', Icon: Compass },
  { path: '/biblioteca', label: 'Leitura', Icon: BookOpen },
  { path: '/reflexoes', label: 'Reflexões', Icon: MessageCircle },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (
    pathname.startsWith('/ler/') ||
    pathname.startsWith('/livro/') ||
    pathname.startsWith('/trecho/') ||
    pathname === '/comecar'
  ) {
    return null
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="ves-nav-shell fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 pb-safe backdrop-blur-xl dark:border-night-line dark:bg-night/95"
    >
      <div className="mx-auto flex min-h-[4.8rem] max-w-xl items-center justify-around gap-0 px-1 pt-1">
        {tabs.map(({ path, label, Icon }) => {
          const active = pathname === path || pathname.startsWith(`${path}/`)

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium leading-tight transition-colors ${
                active
                  ? 'text-sage-800 dark:text-sage-300'
                  : 'text-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink'
              }`}
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.2 : 1.6}
                fill="none"
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
