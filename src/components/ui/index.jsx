import { Loader2 } from 'lucide-react'

export function Button({ children, variant = 'primary', size = 'md', className = '', loading, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary:   'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md',
    secondary: 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    ghost:     'text-primary-600 hover:bg-primary-50',
    danger:    'bg-red-500 text-white hover:bg-red-600',
  }
  const sizes = {
    sm: 'h-8  px-3 text-sm',
    md: 'h-11 px-5 text-base',
    lg: 'h-13 px-7 text-lg',
  }
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</label>
      )}
      <input
        className={`h-11 px-4 rounded-xl border-2 bg-white dark:bg-slate-900 text-forest-900 dark:text-slate-100
          border-slate-200 dark:border-slate-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20
          placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors outline-none
          ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function ProgressBar({ value = 0, color = 'primary', className = '' }) {
  const colors = {
    primary: 'from-primary-500 to-primary-400',
    amber:   'from-amber-500 to-amber-400',
    gold:    'from-gold-400 to-gold-600',
  }
  return (
    <div className={`h-1.5 rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${colors[color] || colors.primary}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function Badge({ children, color = 'primary', className = '' }) {
  const colors = {
    primary: 'bg-primary-100 text-primary-700',
    amber:   'bg-amber-100 text-amber-600',
    gold:    'bg-gold-100 text-gold-600',
    slate:   'bg-slate-100 text-slate-500',
    violet:  'bg-primary-100 text-primary-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.primary} ${className}`}>
      {children}
    </span>
  )
}

export function Spinner({ size = 24, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-primary-600 ${className}`} />
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <VeredaLogo size={48} />
        <Spinner size={24} />
      </div>
    </div>
  )
}

export function VeredaLogo({ size = 40 }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl shadow-md"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'linear-gradient(135deg, #8B6BBF, #5A3F88)'
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 28 28" fill="none">
        <path d="M4 6L14 22L24 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="14" cy="22" r="2.5" fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  )
}

export function Divider({ className = '' }) {
  return <hr className={`border-slate-200 dark:border-slate-700 ${className}`} />
}