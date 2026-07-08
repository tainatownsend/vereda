import { useNavigate } from 'react-router-dom'
import { TrendingUp, Clock } from 'lucide-react'
import { useAuthStore, useReadingStore } from '@/store'
import { useBooks, useProgress, useBookCompletionEstimate, useReadingMinutesLast7Days } from '@/hooks'
import { Card } from '@/components/ui'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function EvolutionPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { progress } = useReadingStore()
  const { user } = useAuthStore()

  const activeBooks    = books.filter(b => progress[b.id] && !progress[b.id]?.completed_at)
  const completedBooks = books.filter(b => progress[b.id]?.completed_at)

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-slate-900 pb-24">

      <header className="bg-white dark:bg-slate-800 border-b border-primary-100 dark:border-slate-700 px-5 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-primary-600 dark:text-primary-400" />
          <h1 className="font-display text-2xl text-forest-900 dark:text-slate-50">Evolução</h1>
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Sua jornada de estudo</p>
      </header>

      <div className="px-4 pt-4 space-y-3">

        <WeeklyChart />

        {user && <BookTotals userId={user.id} books={books} progress={progress} />}

        {activeBooks.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-0.5">
              Em andamento
            </h2>
            <div className="space-y-2">
              {activeBooks.map(book => (
                <BookEvolutionRow key={book.id} book={book} navigate={navigate} />
              ))}
            </div>
          </section>
        )}

        {completedBooks.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-0.5 mt-2">
              Concluídos
            </h2>
            <div className="space-y-2">
              {completedBooks.map(book => (
                <Card key={book.id} className="p-3 flex items-center gap-3">
                  <div className="w-2 h-10 rounded-full shrink-0" style={{ background: book.cover_color }} />
                  <div className="flex-1">
                    <p className="font-display text-sm text-forest-900 dark:text-slate-100">{book.title}</p>
                    <p className="text-[10px] text-primary-500 dark:text-primary-400 font-semibold">✓ Concluído</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {activeBooks.length === 0 && completedBooks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Comece a ler para ver sua evolução aqui.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

function WeeklyChart() {
  const { data, loading } = useReadingMinutesLast7Days()

  if (loading) {
    return <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" style={{ borderRadius: 16, padding: 16, height: 200 }} />
  }

  const maxMinutes = Math.max(...data.map(d => Number(d.minutes)), 1)
  const totalMinutes = data.reduce((sum, d) => sum + Number(d.minutes), 0)
  const today = new Date().toISOString().split('T')[0]

  const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const formatMin = (mins) => {
    if (mins < 1) return ''
    if (mins < 60) return `${Math.round(mins)}m`
    return `${Math.floor(mins)}h${Math.round((mins % 1) * 60) > 0 ? Math.round((mins % 1) * 60) + 'm' : ''}`
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" style={{
      borderRadius: 16,
      padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="dark:text-slate-500" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
          Últimos 7 dias
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#7B5EA7' }}>
          {Math.round(totalMinutes)} min total
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d) => {
          const minutes   = Number(d.minutes)
          const widthPct  = minutes > 0 ? Math.max((minutes / maxMinutes) * 100, 8) : 0
          const isToday   = d.read_date === today
          const date      = new Date(d.read_date + 'T00:00:00')
          const dayLabel  = DAYS_PT[date.getDay()]

          return (
            <div key={d.read_date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={isToday ? '' : 'text-slate-400 dark:text-slate-500'} style={{
                fontSize: 11,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? '#7B5EA7' : undefined,
                width: 28,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {dayLabel}
              </span>
              <div className="dark:bg-slate-700" style={{ flex: 1, height: 22, background: '#F4F1FA', borderRadius: 6, overflow: 'hidden' }}>
                {minutes > 0 && (
                  <div style={{
                    height: '100%',
                    width: `${widthPct}%`,
                    borderRadius: 6,
                    background: isToday
                      ? 'linear-gradient(90deg, #5A3F88, #A98FCC)'
                      : '#DDD6F3',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                    transition: 'width 0.5s ease',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? 'white' : '#7B5EA7', whiteSpace: 'nowrap' }}>
                      {formatMin(minutes)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BookTotals({ userId, books, progress }) {
  const [totals, setTotals] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('reading_sessions')
        .select('book_id, duration_s')
        .eq('user_id', userId)
        .not('duration_s', 'is', null)

      if (data) {
        const map = {}
        data.forEach(r => {
          map[r.book_id] = (map[r.book_id] || 0) + r.duration_s
        })
        setTotals(map)
      }
    }
    load()
  }, [userId])

  const booksWithProgress = books.filter(b => progress[b.id])
  if (booksWithProgress.length === 0) return null

  const totalAll = Object.values(totals).reduce((s, v) => s + v, 0)

  const formatTime = (seconds) => {
    if (!seconds) return '0 min'
    const mins = Math.round(seconds / 60)
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" style={{ borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Clock size={14} color="#94A3B8" />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
          Tempo total de estudo
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#7B5EA7' }}>
          {formatTime(totalAll)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {booksWithProgress.map(book => {
          const secs = totals[book.id] || 0
          return (
            <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: book.cover_color, flexShrink: 0 }} />
              <span className="dark:text-slate-300" style={{ fontSize: 12, color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {book.title}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#7B5EA7', flexShrink: 0 }}>
                {formatTime(secs)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BookEvolutionRow({ book, navigate }) {
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
    <Card
      className="p-3.5 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/ler/${book.id}`)}
    >
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-2 h-10 rounded-full shrink-0" style={{ background: book.cover_color }} />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm text-forest-900 dark:text-slate-100 truncate">{book.title}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{book.year}</p>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#7B5EA7', flexShrink: 0 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 100, background: '#EEE9F8', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 100,
          background: `linear-gradient(90deg, ${book.cover_color}CC, ${book.cover_color})`,
          transition: 'width 0.7s'
        }} />
      </div>
      {estimate && estimate.words_remaining > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#94A3B8', flexWrap: 'wrap' }}>
          <span>Falta {formatTimeRemaining(estimate.minutes_remaining)}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />
          <span>Termina {formatDate(estimate.estimated_date)}</span>
        </div>
      )}
    </Card>
  )
}