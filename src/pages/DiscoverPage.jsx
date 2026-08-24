import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Compass, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input, PageLoader } from '@/components/ui'
import { buildSearchExcerpt } from '@/features/discover/searchExcerpt'

const TOPICS = [
  { id: 'vida-apos-morte', label: 'Vida após a morte', query: 'morte', hint: 'Trechos sobre a continuidade da vida e o mundo espiritual.' },
  { id: 'reencarnacao', label: 'Reencarnação', query: 'reencarna', hint: 'Passagens sobre novas existências e progresso do Espírito.' },
  { id: 'sofrimento', label: 'Sofrimento e provas', query: 'sofrimento', hint: 'Trechos ligados às provas, aflições e sentido das dificuldades.' },
  { id: 'oracao', label: 'Oração', query: 'oração', hint: 'Passagens sobre prece, intenção e recolhimento.' },
  { id: 'livre-arbitrio', label: 'Livre-arbítrio', query: 'livre-arbítrio', hint: 'Trechos sobre escolha, responsabilidade e vontade.' },
  { id: 'mediunidade', label: 'Mediunidade', query: 'mediun', hint: 'Passagens das obras que tratam da comunicação com os Espíritos.' },
  { id: 'familia', label: 'Família', query: 'família', hint: 'Trechos sobre vínculos, convivência e responsabilidades familiares.' },
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
  const [query, setQuery] = useState('')
  const [activeTerm, setActiveTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const booksById = useMemo(
    () => Object.fromEntries(books.map((book) => [book.id, book])),
    [books],
  )

  if (!books.length) return <PageLoader label="Preparando caminhos de estudo" />

  const runSearch = async (rawValue = query) => {
    const normalized = cleanSearchTerm(normalizeHumanQuery(rawValue))
    if (!normalized) return

    setQuery(rawValue)
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
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container pb-7 pt-10">
        <p className="ves-eyebrow">Descobrir</p>
        <h1 className="ves-heading mt-2 max-w-lg text-[2.4rem] leading-[1.08]">O que você quer compreender hoje?</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
          Procure por uma dúvida ou escolha um tema. O Vereda leva você aos trechos das obras — sem responder no lugar delas.
        </p>
      </header>

      <div className="ves-container space-y-10 pb-10">
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

        <section aria-labelledby="topics-heading">
          <p className="ves-eyebrow">Explore por tema</p>
          <h2 id="topics-heading" className="ves-heading mt-1 text-[1.75rem]">Escolha um caminho</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {TOPICS.map((topic, index) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => runSearch(topic.query)}
                className={`min-h-32 rounded-vesLg border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-editorial ${
                  index % 3 === 1
                    ? 'border-clay-100 bg-clay-50/70 hover:border-clay-300 dark:border-clay-900/60 dark:bg-clay-950/10'
                    : 'border-sage-200 bg-sage-50/75 hover:border-sage-400 dark:border-sage-900 dark:bg-sage-950/25'
                }`}
              >
                <span className="flex items-center gap-2 font-display text-lg font-semibold text-ink dark:text-night-ink">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
                    <Compass size={18} aria-hidden="true" />
                  </span>
                  {topic.label}
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-muted dark:text-night-muted">
                  {topic.hint}
                </span>
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-vesMd border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        {searched && !loading && !error && (
          <section aria-labelledby="results-heading">
            <p className="ves-eyebrow">Encontrado nas obras</p>
            <h2 id="results-heading" className="ves-heading mt-1 text-[1.75rem]">
              {results.length ? 'Trechos para explorar' : 'Nenhum trecho encontrado'}
            </h2>

            {results.length ? (
              <div className="mt-5 space-y-3">
                {results.map((section) => {
                  const book = booksById[section.book_id]
                  const heading = section.section_title || section.chapter_title || section.title || `Trecho ${section.sec_position}`
                  const excerpt = buildSearchExcerpt(section.content, activeTerm)

                  return (
                    <Card
                      key={section.id}
                      as="button"
                      type="button"
                      onClick={() => navigate(`/trecho/${section.id}`)}
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
                  Tente uma palavra mais simples, como “oração”, “morte”, “reencarnação” ou “mediunidade”.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
