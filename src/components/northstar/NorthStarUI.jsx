import { useState } from 'react'
import { BookOpen } from 'lucide-react'

export function BookCover({ book, size = 'md', color, className = '' }) {
  const [failed, setFailed] = useState(false)
  const covers = { 1: '/espiritos.jpg', 2: '/mediuns.jpg', 3: '/evangelho.jpg', 4: '/ceu-inferno.jpg', 5: '/genese.jpg' }
  const src = covers[book?.id]
  const dimensions = size === 'sm' ? 'h-20 w-14' : 'h-28 w-20'
  const fallback = color || '#53664E'

  return (
    <div
      className={`${dimensions} ${className} relative shrink-0 overflow-hidden rounded-[8px] border border-black/10 shadow-[0_8px_18px_rgba(44,56,45,0.12)]`}
      style={{ backgroundColor: fallback }}
      aria-hidden="true"
    >
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" loading="lazy" /> : <>
      <div className="absolute inset-x-0 top-0 h-1 bg-gold-400/80" />
      <div className="flex h-full flex-col items-center justify-center px-2 text-center text-[#f8f0df]">
        <BookOpen size={size === 'sm' ? 13 : 16} strokeWidth={1.4} />
        <span className="mt-2 font-display text-[9px] leading-[1.15]">
          {book?.title || 'Vereda'}
        </span>
      </div></>}
    </div>
  )
}

export function ProgressLine({ value = 0, className = '' }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className={`h-[4px] overflow-hidden rounded-full bg-[#EEE4D4] dark:bg-night-line ${className}`}>
      <div
        className="h-full rounded-full bg-[#53664E] transition-[width] duration-300 dark:bg-sage-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}

export function EditorialCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[18px] border border-[#DED5C7] bg-surface shadow-[0_3px_16px_rgba(44,53,43,0.035)] dark:border-night-line dark:bg-night-surface ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
