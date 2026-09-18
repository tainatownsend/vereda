import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Home, MessageCircleHeart, MoreHorizontal } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Início', Icon: Home },
  { path: '/biblioteca', label: 'Estudos', Icon: BookOpen },
  { path: '/reflexoes', label: 'Reflexões', Icon: MessageCircleHeart },
  { path: '/mais', label: 'Mais', Icon: MoreHorizontal },
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
      <div className="mx-auto grid min-h-[4.8rem] max-w-xl grid-cols-4 items-center px-2 pt-1">
        {tabs.map(({ path, label, Icon }) => {
          const active = pathname === path || pathname.startsWith(`${path}/`)

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium leading-tight transition-colors ${
                active
                  ? 'text-[#B28D49] dark:text-[#E3C98D]'
                  : 'text-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.15 : 1.55} aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 h-[3px] w-6 rounded-full bg-[#C5A15D]"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
