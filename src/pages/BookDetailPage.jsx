import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Calendar } from 'lucide-react'
import { useAuthStore, useReadingStore } from '@/store'
import { PageLoader } from '@/components/ui'
import { useBooks } from '@/hooks'

const MINUTE_OPTIONS = [5, 10, 15, 20, 30]
const WEEK_OPTIONS   = [4, 8, 12, 24, 52]

const COVER_IMAGES = {
  1: '/espiritos.jpg',
  2: '/mediuns.jpg',
  3: '/evangelho.jpg',
  4: '/ceu-inferno.jpg',
  5: '/genese.jpg',
}

export default function BookDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const books     = useBooks()
  const { user }  = useAuthStore()
  const { startBook, progress } = useReadingStore()

  const [paceMode, setPaceMode] = useState('minutes')
  const [minutes,  setMinutes]  = useState(10)
  const [weeks,    setWeeks]    = useState(12)
  const [loading,  setLoading]  = useState(false)

  const book = books.find(b => b.id === Number(id))

  useEffect(() => {
    if (progress[Number(id)]) navigate(`/ler/${id}`)
  }, [progress, id, navigate])

  if (!book) return <PageLoader />

  const deadlineDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + weeks * 7)
    return d.toISOString().split('T')[0]
  }

  const start = async () => {
    if (!user) return
    setLoading(true)
    await startBook(
      user.id, book.id, paceMode,
      paceMode === 'minutes'  ? minutes  : null,
      paceMode === 'deadline' ? deadlineDate() : null
    )
    navigate(`/ler/${book.id}`)
  }

  const coverImage = COVER_IMAGES[book.id]

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-slate-900 pb-10">

      {/* Hero com capa */}
      <div className="relative" style={{ background: `linear-gradient(180deg, ${book.cover_color} 0%, ${book.cover_color}88 100%)` }}>
        <button
          onClick={() => navigate(-1)}
          style={{ position: 'absolute', top: 48, left: 20, zIndex: 10, width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} color="white" />
        </button>

        <div className="flex flex-col items-center pt-16 pb-6 px-5">
          {coverImage && (
            <img
              src={coverImage}
              alt={`Capa de ${book.title}`}
              style={{
                width: 140,
                height: 'auto',
                borderRadius: 8,
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                marginBottom: 16,
              }}
            />
          )}
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4, textAlign: 'center' }}>
            {book.year} · {book.author}
          </p>
          <h1 className="font-display text-white text-center" style={{ fontSize: 'clamp(18px, 5vw, 24px)', lineHeight: 1.25 }}>
            {book.title}
          </h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">

        {/* Resumo */}
        {book.description && (
          <div>
            <p className="font-display text-forest-900 dark:text-slate-100 text-lg mb-2">Sobre o livro</p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
              {book.description}
            </p>
          </div>
        )}

        {/* Ritmo */}
        <div>
          <p className="font-display text-forest-900 dark:text-slate-100 text-lg mb-4">Defina seu ritmo</p>

          <div className="flex gap-2 mb-5">
            {[
              { id: 'minutes',  label: 'Minutos/dia', icon: Clock },
              { id: 'deadline', label: 'Com prazo',   icon: Calendar },
            ].map(({ id: pid, label, icon: Icon }) => (
              <button
                key={pid}
                onClick={() => setPaceMode(pid)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px',
                  borderRadius: 12,
                  border: '2px solid',
                  borderColor: paceMode === pid ? '#7B5EA7' : '#E2E8F0',
                  background: paceMode === pid ? '#EEE9F8' : 'white',
                  color: paceMode === pid ? '#5A3F88' : '#94A3B8',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {paceMode === 'minutes' ? (
            <div>
              <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Quantos minutos por dia?</p>
              <div className="flex flex-wrap gap-2">
                {MINUTE_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 12,
                      border: '2px solid',
                      borderColor: minutes === m ? '#7B5EA7' : '#E2E8F0',
                      background: minutes === m ? '#7B5EA7' : 'white',
                      color: minutes === m ? 'white' : '#334155',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Quero terminar em…</p>
              <div className="flex flex-wrap gap-2">
                {WEEK_OPTIONS.map(w => (
                  <button
                    key={w}
                    onClick={() => setWeeks(w)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 12,
                      border: '2px solid',
                      borderColor: weeks === w ? '#7B5EA7' : '#E2E8F0',
                      background: weeks === w ? '#7B5EA7' : 'white',
                      color: weeks === w ? 'white' : '#334155',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {w < 8 ? `${w} sem.` : w < 52 ? `${w / 4} meses` : '1 ano'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={start}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #8B6BBF, #5A3F88)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          {loading ? '...' : 'Começar a ler'}
        </button>
      </div>
    </div>
  )
}