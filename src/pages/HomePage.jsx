import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, ChevronRight, Sun, Sunrise, Sunset, Clock } from 'lucide-react'
import { useAuthStore, useReadingStore, useUIStore } from '@/store'
import { useBooks, useUserData, useProgress, useBookCompletionEstimate, useMinutesReadToday } from '@/hooks'
import { Card, PageLoader, VeredaLogo } from '@/components/ui'

export default function HomePage() {
  const { user, profile }        = useAuthStore()
  const { darkMode }             = useUIStore()
  const books                    = useBooks()
  const { progress, streak, dataLoading } = useUserData()
  const { minutes: minutesToday } = useMinutesReadToday()
  const navigate                 = useNavigate()

  const [greeting, setGreeting]         = useState('')
  const [GreetingIcon, setGreetingIcon] = useState(() => Sun)

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) { setGreeting('Bom dia'); setGreetingIcon(() => Sunrise) }
    else if (h < 18) { setGreeting('Boa tarde'); setGreetingIcon(() => Sun) }
    else { setGreeting('Boa noite'); setGreetingIcon(() => Sunset) }
  }, [])

  const activeBooks = books.filter(b => progress[b.id] && !progress[b.id]?.completed_at)
  const name = profile?.name?.split(' ')[0] || 'amigo'

  if (!user || dataLoading) return <PageLoader />

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-slate-900 pb-24">

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-primary-100 dark:border-slate-700 px-5 pt-12 pb-5 flex items-center gap-3">
        <VeredaLogo size={42} />
        <div>
          <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
            {greeting}
            <GreetingIcon size={13} strokeWidth={2.5} className="text-primary-500" />
          </p>
          <h1 className="font-display font-medium text-[28px] leading-[0.95] text-forest-900 dark:text-slate-50 mt-1">{name}</h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {activeBooks.length > 0 ? (
          <>
            <TodaySummary streak={streak} minutesToday={minutesToday} />

            <section>
              <h2 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-0.5">
                Leitura de hoje
              </h2>
              <div className="space-y-3">
                {activeBooks.map(book => (
                  <TodayCard key={book.id} book={book} progress={progress[book.id]} navigate={navigate} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <EmptyState navigate={navigate} />
        )}
      </div>
    </div>
  )
}

function TodaySummary({ streak, minutesToday }) {
  const formatMinutes = (mins) => {
    if (mins < 1) return '0 min'
    if (mins < 60) return `${Math.round(mins)} min`
    const hours = Math.floor(mins / 60)
    const remaining = Math.round(mins % 60)
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`
  }

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Resumo de hoje
        </h2>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{today}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
            <Flame size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Sequência</p>
            <p className="text-sm font-bold text-forest-900 dark:text-slate-100">
              {streak} {streak === 1 ? 'dia' : 'dias'}
            </p>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-100 dark:bg-slate-700" />

        <div className="flex-1 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Lido hoje</p>
            <p className="text-sm font-bold text-forest-900 dark:text-slate-100">
              {formatMinutes(minutesToday)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function getBookGradient(bookId) {
  const gradients = {
    1: 'linear-gradient(135deg, #3D2A5C 0%, #6B4FA8 60%, #9B7FD4 100%)', // Espíritos — violeta
    2: 'linear-gradient(135deg, #1A4A63 0%, #2D6B8A 60%, #5A9AB5 100%)', // Médiuns — azul-índigo
    3: 'linear-gradient(135deg, #5A3A18 0%, #8B6030 60%, #B8905A 100%)', // Evangelho — dourado
    4: 'linear-gradient(135deg, #253A52 0%, #3D5A7A 60%, #6A8FAF 100%)', // Céu e Inferno — azul-ardósia
    5: 'linear-gradient(135deg, #2A4A38 0%, #4A7A5A 60%, #7AAA8A 100%)', // Gênese — verde-sálvia
  }
  return gradients[bookId] || gradients[1]
}

function TodayCard({ book, progress: prog, navigate }) {
  const pct = useProgress(book.id, book.total_sections)
  const { estimate } = useBookCompletionEstimate(book.id)

  const formatTimeRemaining = (mins) => {
    if (!mins) return null
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  }

  return (
    <div
      onClick={() => navigate(`/ler/${book.id}`)}
      className="rounded-2xl p-4 cursor-pointer shadow-md relative overflow-hidden"
      style={{ background: getBookGradient(book.id) }}
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10" />
      <p className="text-[10px] font-medium text-white/60 mb-1">Continue de onde parou</p>
      <h3 className="font-display text-xl text-white leading-tight mb-3">{book.title}</h3>
      <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-white/75 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-white/65 flex-wrap">
          <span className="font-semibold text-white/90">{pct}%</span>
          {estimate && estimate.words_remaining > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
              <span>Falta {formatTimeRemaining(estimate.minutes_remaining)}</span>
              <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
              <span>Termina {formatDate(estimate.estimated_date)}</span>
            </>
          )}
        </div>
        <span className="shrink-0 bg-white text-primary-700 rounded-full pl-3 pr-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 shadow-sm">
          Ler agora <ChevronRight size={12} strokeWidth={3} />
        </span>
      </div>
    </div>
  )
}

function EmptyState({ navigate }) {
  return (
    <div className="flex flex-col items-center text-center py-10 gap-5">
      <VeredaLogo size={56} />
      <div>
        <p className="font-display text-xl text-forest-900 dark:text-slate-100">Pronto para começar?</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
          Escolha um livro e defina seu ritmo.<br />Cinco minutos por dia já fazem diferença.
        </p>
      </div>
      <button
        onClick={() => navigate('/biblioteca')}
        className="bg-gradient-to-br from-primary-500 to-primary-700 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-sm"
      >
        Escolher primeiro livro
      </button>
    </div>
  )
}