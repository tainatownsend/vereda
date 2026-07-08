import { Clock, Calendar } from 'lucide-react'
import { useBookCompletionEstimate } from '@/hooks'

export default function CompletionEstimate({ bookId }) {
  const { estimate, loading } = useBookCompletionEstimate(bookId)

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 h-20 animate-pulse" />
    )
  }

  if (!estimate || estimate.words_remaining === 0) {
    return null
  }

  const { minutes_remaining, estimated_date } = estimate

  const formatTimeRemaining = (mins) => {
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex gap-4">
        <div className="flex-1 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Falta</p>
            <p className="text-sm font-bold text-forest-900 dark:text-slate-100">
              {formatTimeRemaining(minutes_remaining)}
            </p>
          </div>
        </div>

        <div className="w-px bg-slate-100 dark:bg-slate-700" />

        <div className="flex-1 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <Calendar size={16} className="text-violet-500 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Termina em</p>
            <p className="text-sm font-bold text-forest-900 dark:text-slate-100">
              {formatDate(estimated_date)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}