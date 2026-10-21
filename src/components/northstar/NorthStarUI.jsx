import { BookOpen } from 'lucide-react'

export function BookCover({ book, size = 'md', color, className = '' }) {
  // Dedicated original vector artwork keeps all five fundamental works distinct and sharp
  // on high-density mobile screens. Book metadata and reading progress remain unchanged.
  const coverId = Number(book?.id)
  const hasNorthStarCover = Number.isInteger(coverId) && coverId >= 1 && coverId <= 5
  const dimensions = size === 'sm' ? 'h-20 w-14' : 'h-28 w-20'
  const fallback = color || '#53664E'

  return (
    <div
      className={`${dimensions} ${className} relative shrink-0 overflow-hidden rounded-[8px] border border-black/10 shadow-[0_8px_18px_rgba(44,56,45,0.12)]`}
      style={{ backgroundColor: fallback }}
      aria-hidden="true"
    >
      {hasNorthStarCover ? <img src={`/art/covers/kardec-${coverId}.svg`} alt="" className={`northstar-cover-art northstar-cover-art-${coverId}`} loading="lazy" decoding="async" /> : <>
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
