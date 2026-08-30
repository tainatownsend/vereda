import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Compass, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input, PageLoader } from '@/components/ui'
import { normalizeStructuralRomanNumerals } from '@/features/content/structuralLabels'
import { buildSearchExcerpt } from '@/features/discover/searchExcerpt'

const TOPICS = [
  { id: 'vida-apos-morte', label: 'Vida após a morte', hint: 'Trechos sobre a continuidade da vida e o mundo espiritual.' },
  { id: 'reencarnacao', label: 'Reencarnação', hint: 'Passagens sobre novas existências e progresso do Espírito.' },
  { id: 'sofrimento', label: 'Sofrimento e provas', hint: 'Trechos ligados às provas, aflições e sentido das dificuldades.' },
  { id: 'oracao', label: 'Oração', hint: 'Passagens sobre prece, intenção e recolhimento.' },
  { id: 'livre-arbitrio', label: 'Livre-arbítrio', hint: 'Trechos sobre escolha, responsabilidade e vontade.' },
  { id: 'mediunidade', label: 'Mediunidade', hint: 'Passagens das obras que tratam da comunicação com os Espíritos.' },
  { id: 'familia', label: 'Família', hint: 'Trechos sobre vínculos, convivência e responsabilidades familiares.' },
]

const HUMAN_QUERY_ALIASES = [
  { pattern: /o que acontece.*(morr|morte)|depois.*morte|vida.*depois/i, query: 'morte' },
  { pattern: /por que.*sofr|sentido.*sofr|dor/i, query: 'sofrimento' },
  { pattern: /animais?.*(alma|esp[ií]rito)|alma.*animais?/i, query: 'animais' },
  { pattern: /voltar.*viver|outra.*vida|reencarna/i, query: 'reencarna' },
  { pattern: /como.*orar|prece|ora[cç][aã]o/i, query: 'oração' },
  { pattern: /m[eé]diu|mediun/i, query: 'mediun' },
  { pattern: /livre.*arb[ií]trio|escolh.*vida|destino/i, query: 'livre-arbítrio' },
]

function normalizeHumanQuery(value) {
  const trimmed = value.trim()
  const alias = HUMAN_QUERY_ALIASES.find((item) => item.pattern.test(trimmed))
  return alias?.query || trimmed
}

function cleanSearchTerm(value) {
  return value
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export default function DiscoverPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const resultsRef = useRef(null)
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [searchedFor, setSearchedFor] = useState('')
  const [activeTerm, setActiveTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const booksById = useMemo(
    () => Object.fromEntries(books.map((book) => [book.id, book])),
    [books],
  )

  useEffect(() => {
    if (mode !== 'search' || !searched || loading) return undefined

    const frame = window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [loading, mode, searched])

  if (!books.length) return <PageLoader label="Preparando caminhos de estudo" />

  const runSearch = async (rawValue = query) => {
    const displayValue = rawValue.trim()
    const normalized = cleanSearchTerm(normalizeHumanQuery(rawValue))
    if (!normalized) return

    setMode('search')
    setQuery(displayValue)
    setSearchedFor(displayValue)
    setActiveTerm(normalized)
    setLoading(true)
    setError('')
    setSearched(true)

    const escaped = normalized.replace(/'/g, "''")
    const filter = [
      `title.ilike.%${escaped}%`,
      `chapter_title.ilike.%${escaped}%`,
      `section_title.ilike.%${escaped}%`,
      `content.ilike.%${escaped}%`,
    ].join(',')

    const { data, error: searchError } = await supabase
      .from('sections')
      .select('id, book_id, sec_position, title, chapter_label, chapter_title, section_title, kind, content')
      .or(filter)
      .order('book_id')
      .order('sec_position')
      .limit(24)

    if (searchError) {
      setResults([])
      setError('Não foi possível pesquisar agora. Tente novamente em instantes.')
    } else {
      setResults(data || [])
    }

    setLoading(false)
  }

  return (
    <main className="ves-page ves-brand-page bg-canvas pb-28 text-ink dark:bg-night dark:text-night-ink">
      <header className="ves-container pb-6 pt-7 sm:pt-10">
        <p className="ves-eyebrow">Descobrir</p>
        <h1 className="ves-heading mt-2 max-w-lg text-[2.4rem] leading-[1.08]">O que você quer compreender hoje?</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
          Pesquise uma dúvida ou explore um tema. Cada caminho leva você diretamente a trechos das obras.
        </p>
      </header>

      <div className="ves-container pb-10">
        <div className="grid grid-cols-2 rounded-vesMd border border-line bg-surface p-1 dark:border-night-line dark:bg-night-surface" role="tablist" aria-label="Como descobrir trechos">
          <ModeTab active={mode === 'search'} icon={Search} onClick={() => setMode('search')}>
            Pesquisar
          </ModeTab>
          <ModeTab active={mode === 'topics'} icon={Compass} onClick={() => setMode('topics')}>
            Explorar temas
          </ModeTab>
        </div>

        {mode === 'search' ? (
          <div className="mt-5 space-y-6">
            <section aria-labelledby="search-heading" className="ves-warm-panel rounded-vesLg border border-line/80 p-5 shadow-sm sm:p-6 dark:border-night-line">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/80 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
                  <Search size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className="ves-eyebrow">Pergunte do seu jeito</p>
                  <h2 id="search-heading" className="font-display text-lg font-semibold text-ink dark:text-night-ink">Pesquisar nas obras</h2>
                </div>
              </div>

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  runSearch()
                }}
              >
                <Input
                  label="Sua dúvida"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ex.: o que acontece depois que morremos?"
                  hint="A pesquisa mostra passagens das obras fundamentais, não uma resposta criada pelo aplicativo."
                />
                <Button type="submit" loading={loading} disabled={!query.trim()} className="w-full sm:w-auto">
                  <Search size={19} aria-hidden="true" />
                  Procurar nas obras
                </Button>
              </form>
            </section>

            <div ref={resultsRef} className="scroll-mt-6">
              {loading && (
                <div role="status" aria-live="polite" className="rounded-vesMd border border-sage-200 bg-sage-50 p-5 text-sm font-medium text-sage-900 dark:border-sage-900 dark:bg-sage-950/35 dark:text-sage-200">
                  Procurando trechos nas obras…
                </div>
              )}

              {!loading && error && (
                <p role="alert" className="rounded-vesMd border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </p>
              )}

              {searched && !loading && !error && (
                <SearchResults
                  results={results}
                  booksById={booksById}
                  activeTerm={activeTerm}
                  searchedFor={searchedFor}
                  onOpen={(sectionId) => navigate(`/trecho/${sectionId}`)}
                />
              )}
            </div>
          </div>
        ) : (
          <section aria-labelledby="topics-heading" className="mt-7">
            <p className="ves-eyebrow">Explore por tema</p>
            <h2 id="topics-heading" className="ves-heading mt-1 text-[1.75rem]">Escolha um caminho</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted dark:text-night-muted">
              Toque em um tema para ver os trechos encontrados. Você poderá voltar aos temas quando quiser.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {TOPICS.map((topic, index) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => runSearch(topic.label)}
                  className={`min-h-28 rounded-vesLg border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-editorial ${
                    index % 3 === 1
                      ? 'border-clay-100 bg-clay-50/70 hover:border-clay-300 dark:border-clay-900/60 dark:bg-clay-950/10'
                      : 'border-sage-200 bg-sage-50/75 hover:border-sage-400 dark:border-sage-900 dark:bg-sage-950/25'
                  }`}
                >
                  <span className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/80 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
                      <Compass size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold text-ink dark:text-night-ink">
                        {topic.label}
                      </span>
                      <span className="mt-1.5 block text-sm leading-relaxed text-muted dark:text-night-muted">
                        {topic.hint}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function ModeTab({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-vesSm px-3 text-sm font-semibold transition-colors ${
        active
          ? 'bg-sage-800 text-white shadow-sm dark:bg-sage-300 dark:text-sage-950'
          : 'text-muted hover:bg-surface-soft dark:text-night-muted dark:hover:bg-night'
      }`}
    >
      <Icon size={18} aria-hidden="true" />
      {children}
    </button>
  )
}

function SearchResults({ results, booksById, activeTerm, searchedFor, onOpen }) {
  const resultLabel = results.length === 1
    ? '1 trecho encontrado'
    : `${results.length} trechos encontrados`

  return (
    <section aria-labelledby="results-heading">
      <div role="status" aria-live="polite" className="rounded-vesMd border border-sage-200 bg-sage-50 p-4 dark:border-sage-900 dark:bg-sage-950/35">
        <p className="text-sm font-semibold text-sage-900 dark:text-sage-200">
          {results.length ? resultLabel : 'Nenhum trecho encontrado'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-sage-800/80 dark:text-sage-300/90">
          {results.length
            ? `Resultados para “${searchedFor}”. Toque em um trecho para ler na obra.`
            : `Não encontramos resultados para “${searchedFor}”. Tente uma palavra mais simples.`}
        </p>
      </div>

      <p className="ves-eyebrow mt-7">Encontrado nas obras</p>
      <h2 id="results-heading" className="ves-heading mt-1 text-[1.75rem]">
        {results.length ? 'Trechos para explorar' : 'Tente outra busca'}
      </h2>

      {results.length ? (
        <div className="mt-5 space-y-3">
          {results.map((section) => {
            const book = booksById[section.book_id]
            const heading = normalizeStructuralRomanNumerals(
              section.section_title || section.chapter_title || section.title || `Trecho ${section.sec_position}`,
            )
            const excerpt = buildSearchExcerpt(section.content, activeTerm)

            return (
              <Card
                key={section.id}
                as="button"
                type="button"
                onClick={() => onOpen(section.id)}
                className="group block w-full p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-editorial"
                aria-label={`Ler trecho de ${book?.title || 'obra fundamental'}: ${heading}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                    <BookOpen size={20} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sage-700 dark:text-sage-300">
                      {book?.title || 'Obra fundamental'}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-ink dark:text-night-ink">{heading}</h3>
                    {excerpt && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                        {excerpt}
                      </p>
                    )}
                    <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">
                      Ler este trecho
                      <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-vesMd border border-line bg-surface/75 p-5 dark:border-night-line dark:bg-night-surface/75">
          <p className="max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
            Tente “oração”, “morte”, “reencarnação”, “mediunidade” ou outra palavra curta relacionada ao que você quer compreender.
          </p>
        </div>
      )}
    </section>
  )
}
