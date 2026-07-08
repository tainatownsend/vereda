import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, TrendingUp, User } from 'lucide-react'

const tabs = [
  { path: '/home',          label: 'Início',     Icon: Home },
  { path: '/biblioteca',    label: 'Biblioteca', Icon: BookOpen },
  { path: '/evolucao',      label: 'Evolução',   Icon: TrendingUp },
  { path: '/configuracoes', label: 'Perfil',     Icon: User },
]

const NAV_STYLE = {
  fontSize: '16px',
  height: '58px',
}

const LABEL_STYLE = {
  fontSize: '10px',
  lineHeight: '1',
  fontWeight: '600',
  letterSpacing: '0.02em',
  marginTop: '3px',
}

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()

  if (pathname.startsWith('/ler/')) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-primary-100 dark:border-slate-800"
      style={NAV_STYLE}
    >
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {tabs.map(({ path, label, Icon }) => {
          const active = pathname === path ||
            (path !== '/home' && pathname.startsWith(path))
          const color = active ? '#7B5EA7' : '#CBD5E1'

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0 16px',
                height: '100%',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} color={color} />
              <span style={{ ...LABEL_STYLE, color }}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}