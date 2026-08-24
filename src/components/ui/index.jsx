import { forwardRef, useId } from 'react'
import { Loader2 } from 'lucide-react'

const buttonBase =
  'inline-flex min-h-14 items-center justify-center gap-2 rounded-vesMd px-6 py-3 font-body text-base font-semibold transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'

const buttonVariants = {
  primary:
    'bg-sage-800 text-white shadow-sm hover:bg-sage-900 active:bg-sage-950 dark:bg-sage-300 dark:text-sage-950 dark:hover:bg-sage-200',
  secondary:
    'border border-line bg-surface text-ink hover:bg-surface-soft dark:border-night-line dark:bg-night-surface dark:text-night-ink dark:hover:bg-sage-950',
  ghost:
    'bg-transparent text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950',
  danger:
    'bg-red-700 text-white hover:bg-red-800 active:bg-red-900',
}

const buttonSizes = {
  sm: 'min-h-11 rounded-vesSm px-4 py-2 text-sm',
  md: '',
  lg: 'min-h-16 rounded-vesLg px-7 py-4 text-lg',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    className = '',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonBase} ${buttonVariants[variant] || buttonVariants.primary} ${buttonSizes[size] || ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={19} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
})

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    id,
    className = '',
    inputClassName = '',
    required = false,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const inputId = id || generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-ink dark:text-night-ink"
        >
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`min-h-14 w-full rounded-vesSm border bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-muted/65 hover:border-sage-400 focus:border-sage-700 focus:ring-2 focus:ring-sage-500/25 dark:bg-night-surface dark:text-night-ink dark:placeholder:text-night-muted/65 ${
          error
            ? 'border-red-700 focus:border-red-700 focus:ring-red-700/20'
            : 'border-line dark:border-night-line'
        } ${inputClassName}`}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-sm leading-relaxed text-muted dark:text-night-muted">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm font-medium leading-relaxed text-red-800 dark:text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  )
})

export function Card({
  children,
  as: Component = 'div',
  className = '',
  ...props
}) {
  return (
    <Component
      className={`rounded-vesMd border border-line bg-surface shadow-sm dark:border-night-line dark:bg-night-surface ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export function ProgressBar({
  value = 0,
  max = 100,
  label = 'Progresso',
  color = 'primary',
  showValue = false,
  className = '',
}) {
  const safeMax = max > 0 ? max : 100
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), safeMax)
  const percentage = Math.round((safeValue / safeMax) * 100)

  const fills = {
    primary: 'bg-sage-700 dark:bg-sage-300',
    sage: 'bg-sage-700 dark:bg-sage-300',
    amber: 'bg-amber-500',
    gold: 'bg-gold-600',
  }

  return (
    <div className={className}>
      {showValue && (
        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
          <span className="text-muted dark:text-night-muted">{label}</span>
          <strong className="text-ink dark:text-night-ink">{percentage}%</strong>
        </div>
      )}

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        className="h-2 overflow-hidden rounded-full bg-sage-100 dark:bg-white/10"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${fills[color] || fills.primary}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function Badge({
  children,
  color = 'primary',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300',
    violet: 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300',
    sage: 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
    gold: 'bg-gold-100 text-gold-700 dark:bg-white/10 dark:text-amber-200',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  }

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-semibold ${variants[color] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export function Spinner({ size = 24, className = '', label = 'Carregando' }) {
  return (
    <span role="status" className="inline-flex">
      <Loader2
        size={size}
        className={`animate-spin text-sage-700 dark:text-sage-300 ${className}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function PageLoader({ label = 'Carregando conteúdo' }) {
  return (
    <div className="ves-page flex min-h-[60vh] items-center justify-center px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-sage-200/80 dark:border-sage-800/80" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-sage-700 border-r-gold-400 motion-safe:animate-spin [animation-duration:2.8s] dark:border-t-sage-300 dark:border-r-gold-600" />
          <span className="absolute inset-2 rounded-full bg-sage-100/45 motion-safe:animate-pulse [animation-duration:1.8s] dark:bg-sage-950/35" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-surface/90 shadow-editorial dark:bg-night-surface/90">
            <VeredaLogo size={82} className="motion-safe:animate-pulse [animation-duration:2.2s]" />
          </div>
        </div>
        <p className="text-sm font-medium text-muted dark:text-night-muted">{label}</p>
      </div>
    </div>
  )
}

export function VeredaLogo({ size = 40, className = '', alt = '' }) {
  return (
    <img
      src="/vereda-logo-mark.svg"
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  )
}

export function Divider({ className = '', ...props }) {
  return (
    <hr
      className={`border-0 border-t border-line dark:border-night-line ${className}`}
      {...props}
    />
  )
}
