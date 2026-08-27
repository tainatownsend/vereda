import { BookOpen } from 'lucide-react'

export function BookCover({ book, size = 'md', className = '' }) {
  const dimensions = size === 'sm' ? 'h-20 w-14' : 'h-28 w-20'
  const palette = ['#355147', '#9b7954', '#304b42', '#8a4534', '#405c3e']
  const fallback = palette[Math.max(0, (Number(book?.display_order || book?.id || 1) - 1) % palette.length)]
  const color = book?.cover_color || fallback

  return (
    <div
      className={`${dimensions} ${className} relative shrink-0 overflow-hidden rounded-[8px] border border-black/10 shadow-[0_8px_18px_rgba(44,56,45,0.12)]`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gold-400/80" />
      <div className="flex h-full flex-col items-center justify-center px-2 text-center text-[#f8f0df]">
        <BookOpen size={size === 'sm' ? 13 : 16} strokeWidth={1.4} />
        <span className="mt-2 font-display text-[9px] leading-[1.15]">
          {book?.title || 'Vereda'}
        </span>
      </div>
    </div>
  )
}

export function ProgressLine({ value = 0, className = '' }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={`h-[4px] overflow-hidden rounded-full bg-[#e6dfd5] dark:bg-night-line ${className}`}>
      <div
        className="h-full rounded-full bg-[#617553] transition-[width] duration-300 dark:bg-sage-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}

export function EditorialCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[16px] border border-[#e5ddd2] bg-[#fffdf8] shadow-[0_8px_24px_rgba(63,67,55,0.045)] dark:border-night-line dark:bg-night-surface ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
