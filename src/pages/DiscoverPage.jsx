import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Compass, Search } from 'lucide-react'

import { useBooks } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input, PageLoader } from '@/components/ui'

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
  const books = useBooks()
  const [query, setQuery] = useState('')
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
      .select('id, book_id, sec_position, title, chapter_label, chapter_title, section_title, kind')
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
    <main className="ves-page pb-28">
      <header className="ves-container pb-7 pt-11">
        <p className="ves-eyebrow">Descobrir</p>
        <h1 className="ves-heading mt-2 text-[2.35rem]">O que você quer compreender hoje?</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted dark:text-night-muted">
          Procure por uma dúvida ou escolha um tema. O Vereda leva você aos trechos das obras — sem responder no lugar delas.
        </p>
      </header>

      <div className="ves-container space-y-10 pb-10">
        <section aria-labelledby="search-heading">
          <h2 id="search-heading" className="sr-only">Pesquisar nas obras</h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              runSearch()
            }}
          >
            <Input
              label="Escreva sua dúvida do seu jeito"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: o que acontece depois que morremos?"
              hint="A pesquisa mostra passagens das obras fundamentais, não uma resposta criada pelo aplicativo."
            />
            <Button type="submit" loading={loading} disabled={!query.trim()}>
              <Search size={19} aria-hidden="true" />
              Procurar nas obras
            </Button>
          </form>
        </section>

        <section aria-labelledby="topics-heading">
          <p className="ves-eyebrow">Explore por tema</p>
          <h2 id="topics-heading" className="ves-heading mt-1 text-[1.75rem]">Escolha um caminho</h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => runSearch(topic.query)}
                className="min-h-28 rounded-vesMd border border-line bg-surface p-5 text-left transition-colors hover:border-sage-400 hover:bg-sage-50 dark:border-night-line dark:bg-night-surface dark:hover:bg-sage-950/35"
              >
                <span className="flex items-center gap-2 font-semibold text-ink dark:text-night-ink">
                  <Compass size={19} className="text-sage-700 dark:text-sage-300" aria-hidden="true" />
                  {topic.label}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-muted dark:text-night-muted">
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

                  return (
                    <Card
                      key={section.id}
                      as="a"
                      href={`/ler/${section.book_id}?revisit=1&section=${section.sec_position}`}
                      className="group block p-5 transition-shadow hover:shadow-editorial"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-vesSm bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                          <BookOpen size={20} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">
                            {book?.title || 'Obra fundamental'}
                          </p>
                          <h3 className="mt-1 font-semibold leading-snug text-ink dark:text-night-ink">{heading}</h3>
                          <p className="mt-2 text-sm text-muted dark:text-night-muted">
                            {section.chapter_label ? `${section.chapter_label} · ` : ''}Abrir este trecho na obra
                          </p>
                        </div>
                        <ArrowRight size={18} className="mt-1 shrink-0 text-sage-700 transition-transform group-hover:translate-x-1 dark:text-sage-300" aria-hidden="true" />
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
                Tente uma palavra mais simples, como “oração”, “morte”, “reencarnação” ou “mediunidade”.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
