import { BookOpen } from 'lucide-react'

export function BookCover({ book, size = 'md', className = '' }) {
  const dimensions = size === 'sm' ? 'h-20 w-14' : 'h-28 w-20'
  const color = book?.cover_color || '#354a3b'

  return (
    <div
      className={`${dimensions} ${className} relative shrink-0 overflow-hidden rounded-[8px] border border-black/10 shadow-[0_8px_18px_rgba(44,56,45,0.12)]`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[#c8a96b]/80" />
      <div className="flex h-full flex-col items-center justify-center px-2 text-center text-[#f6f0df]">
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
    <div className={`h-[4px] overflow-hidden rounded-full bg-[#e7e2d8] dark:bg-night-line ${className}`}>
      <div
        className="h-full rounded-full bg-[#60764f] transition-[width] duration-300 dark:bg-sage-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}

export function EditorialCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[16px] border border-[#e7e1d7] bg-[#fffdf8] shadow-[0_8px_24px_rgba(63,67,55,0.045)] dark:border-night-line dark:bg-night-surface ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export function ScreenTitle({ title, eyebrow, action }) {
  return (
    <header className="flex items-start justify-between gap-4 pb-5 pt-1">
      <div>
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#697260]">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-[2rem] font-medium leading-tight tracking-[-0.025em] text-[#233326] dark:text-night-ink">
          {title}
        </h1>
      </div>
      {action}
    </header>
  )
}
