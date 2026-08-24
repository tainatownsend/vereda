import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Feather,
} from 'lucide-react'

import { useAuthStore, useReadingStore } from '@/store'
import { useBooks } from '@/hooks'
import { Button, PageLoader } from '@/components/ui'

const MINUTE_OPTIONS = [5, 10, 15, 20, 30]
const WEEK_OPTIONS = [4, 8, 12, 24, 52]

const COVER_IMAGES = {
  1: '/espiritos.jpg',
  2: '/mediuns.jpg',
  3: '/evangelho.jpg',
  4: '/ceu-inferno.jpg',
  5: '/genese.jpg',
}

export default function BookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const books = useBooks()
  const { user } = useAuthStore()
  const { startBook, progress } = useReadingStore()

  const [paceMode, setPaceMode] = useState('none')
  const [minutes, setMinutes] = useState(10)
  const [weeks, setWeeks] = useState(12)
  const [loading, setLoading] = useState(false)

  const bookId = Number(id)
  const book = books.find((item) => item.id === bookId)

  useEffect(() => {
    if (progress[bookId]) navigate(`/ler/${id}`, { replace: true })
  }, [progress, bookId, id, navigate])

  const deadline = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + weeks * 7)
    return date.toISOString().split('T')[0]
  }, [weeks])

  if (!book) return <PageLoader label="Carregando obra" />

  const start = async () => {
    if (!user || loading) return

    setLoading(true)

    try {
      await startBook(
        user.id,
        book.id,
        paceMode === 'none' ? 'minutes' : paceMode,
        paceMode === 'minutes' ? minutes : null,
        paceMode === 'deadline' ? deadline : null,
      )
      navigate(`/ler/${book.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ves-page ves-brand-page min-h-screen pb-12">
      <div className="ves-container pt-7 lg:max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex min-h-12 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Voltar
        </button>
      </div>

      <div className="ves-container grid gap-10 pb-8 pt-6 lg:max-w-5xl lg:grid-cols-[18rem_1fr] lg:items-start">
        <BookIdentity book={book} />

        <div>
          <p className="ves-eyebrow">Antes de começar</p>
          <h1 className="ves-heading mt-2 break-words text-[2.2rem] sm:text-[2.45rem] lg:text-[3rem]">
            {book.title}
          </h1>
          <p className="mt-2 text-sm font-medium text-sage-700 dark:text-sage-300">
            {book.author}
            {book.year ? ` · ${book.year}` : ''}
          </p>

          {book.description && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg dark:text-night-muted">
              {book.description}
            </p>
          )}

          <section className="ves-warm-panel mt-8 rounded-vesLg border border-line/80 p-5 shadow-sm sm:p-6 dark:border-night-line" aria-labelledby="context-heading">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface/80 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
                <BookOpen size={20} aria-hidden="true" />
              </div>
              <div>
                <h2 id="context-heading" className="font-display text-lg font-semibold text-ink dark:text-night-ink">Como esta leitura funciona no Vereda</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                  A obra é apresentada em pequenos trechos para facilitar a continuidade. O texto continua sendo a fonte principal; o Vereda organiza o caminho, sem substituir a leitura.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="pace-heading">
            <p className="ves-eyebrow">Seu ritmo</p>
            <h2 id="pace-heading" className="ves-heading mt-1 text-[1.8rem]">
              Quer combinar algum ritmo?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">
              É totalmente opcional. Você pode simplesmente ler quando puder e continuar de onde parou.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ChoiceCard
                selected={paceMode === 'none'}
                onClick={() => setPaceMode('none')}
                icon={Feather}
                title="Sem ritmo fixo"
                description="Leia quando fizer sentido para você."
                tone="warm"
              />
              <ChoiceCard
                selected={paceMode === 'minutes'}
                onClick={() => setPaceMode('minutes')}
                icon={Clock3}
                title="Alguns minutos"
                description="Um lembrete de ritmo, sem obrigação."
              />
              <ChoiceCard
                selected={paceMode === 'deadline'}
                onClick={() => setPaceMode('deadline')}
                icon={CalendarDays}
                title="Uma referência de tempo"
                description="Uma estimativa aproximada, que pode mudar."
              />
            </div>

            {paceMode !== 'none' && (
              <div className="mt-7 rounded-vesLg border border-line bg-surface/90 p-5 shadow-sm dark:border-night-line dark:bg-night-surface/90">
                {paceMode === 'minutes' ? (
                  <>
                    <h3 className="font-display text-lg font-semibold text-ink dark:text-night-ink">
                      Quanto tempo costuma caber no seu dia?
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {MINUTE_OPTIONS.map((option) => (
                        <PillChoice
                          key={option}
                          selected={minutes === option}
                          onClick={() => setMinutes(option)}
                        >
                          {option} min
                        </PillChoice>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-display text-lg font-semibold text-ink dark:text-night-ink">
                      Qual horizonte parece confortável?
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {WEEK_OPTIONS.map((option) => (
                        <PillChoice
                          key={option}
                          selected={weeks === option}
                          onClick={() => setWeeks(option)}
                        >
                          {formatWeeks(option)}
                        </PillChoice>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <div className="mt-8 rounded-vesLg border border-sage-200 bg-sage-50/80 p-5 shadow-sm dark:border-sage-900 dark:bg-sage-950/35">
            <div className="flex items-start gap-3">
              <Check
                size={20}
                className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-muted dark:text-night-muted">
                O Vereda salva automaticamente onde você parou. Uma pausa não apaga seu caminho nem cria atraso.
              </p>
            </div>
          </div>

          <Button onClick={start} loading={loading} className="mt-8 w-full sm:w-auto sm:min-w-56">
            Começar esta leitura
            {!loading && <ArrowRight size={19} aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </main>
  )
}

function BookIdentity({ book }) {
  const image = COVER_IMAGES[book.id]

  return (
    <aside className="mx-auto w-full max-w-[17rem] lg:sticky lg:top-8">
      <div className="ves-horizon-panel rounded-vesLg border border-line p-5 shadow-editorial dark:border-night-line">
        <div className="relative z-10">
          {image ? (
            <img
              src={image}
              alt={`Capa de ${book.title}`}
              className="mx-auto w-full rounded-vesSm object-cover shadow-xl"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center rounded-vesSm bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
              <BookOpen size={48} aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function ChoiceCard({ selected, onClick, icon: Icon, title, description, tone = 'sage' }) {
  const unselectedTone = tone === 'warm'
    ? 'border-clay-100 bg-clay-50/60 hover:border-clay-300 dark:border-clay-900/60 dark:bg-clay-950/10'
    : 'border-line bg-surface/90 hover:border-sage-400 dark:border-night-line dark:bg-night-surface/90'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-36 rounded-vesMd border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 ${
        selected
          ? 'border-sage-700 bg-sage-50 ring-2 ring-sage-500/20 dark:border-sage-300 dark:bg-sage-950/40'
          : unselectedTone
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selected ? 'bg-sage-700 text-white dark:bg-sage-300 dark:text-sage-950' : 'bg-surface text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300'}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-ink dark:text-night-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">
        {description}
      </p>
    </button>
  )
}

function PillChoice({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-12 rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${
        selected
          ? 'border-sage-800 bg-sage-800 text-white dark:border-sage-300 dark:bg-sage-300 dark:text-sage-950'
          : 'border-line bg-surface text-ink hover:border-sage-400 dark:border-night-line dark:bg-night-surface dark:text-night-ink'
      }`}
    >
      {children}
    </button>
  )
}

function formatWeeks(weeks) {
  if (weeks === 4) return '1 mês'
  if (weeks < 52) return `${weeks / 4} meses`
  return '1 ano'
}
