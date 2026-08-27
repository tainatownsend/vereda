import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookPlus, Check, Heart, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button, Card, Input, PageLoader } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import {
  findCandidateMatch,
  normalizeCandidateTitle,
  voteLabel,
} from '@/features/bookRequests/bookCandidates'

export default function BookRequestsPage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const loadCandidates = async () => {
    setError('')
    const { data, error: loadError } = await supabase.rpc('get_book_candidates')

    if (loadError) {
      setCandidates([])
      setError('Não foi possível carregar as sugestões agora. Tente novamente.')
    } else {
      setCandidates(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadCandidates()
  }, [])

  const normalizedTitle = normalizeCandidateTitle(title)
  const match = useMemo(
    () => findCandidateMatch(candidates, title),
    [candidates, title],
  )

  const submitCandidate = async (event) => {
    event.preventDefault()
    if (normalizedTitle.length < 2 || submitting) return

    setSubmitting(true)
    setError('')
    setStatus('')

    const { data, error: submitError } = await supabase.rpc('submit_book_candidate', {
      p_title: title.trim(),
      p_author: author.trim() || null,
    })

    if (submitError) {
      setError('Não foi possível enviar esta sugestão agora. Tente novamente.')
      setSubmitting(false)
      return
    }

    const result = Array.isArray(data) ? data[0] : data
    await loadCandidates()

    if (result?.created) {
      setStatus('Sugestão adicionada. Seu voto já foi contado.')
      setTitle('')
      setAuthor('')
    } else {
      setStatus('Esta obra já estava entre as sugestões. Você pode votar nela abaixo.')
    }

    setSubmitting(false)
  }

  const setVote = async (candidate, vote) => {
    if (votingId) return

    setVotingId(candidate.id)
    setError('')
    setStatus('')

    const { error: voteError } = await supabase.rpc('set_book_candidate_vote', {
      p_candidate_id: candidate.id,
      p_vote: vote,
    })

    if (voteError) {
      setError('Não foi possível atualizar seu voto agora. Tente novamente.')
      setVotingId(null)
      return
    }

    setCandidates((current) => current
      .map((item) => item.id === candidate.id
        ? {
            ...item,
            user_has_voted: vote,
            vote_count: Math.max(0, Number(item.vote_count || 0) + (vote ? 1 : -1)),
          }
        : item)
      .sort((left, right) => Number(right.vote_count || 0) - Number(left.vote_count || 0)))

    setStatus(vote ? `Seu voto em “${candidate.title}” foi registrado.` : `Seu voto em “${candidate.title}” foi removido.`)
    setVotingId(null)
  }

  if (loading) return <PageLoader label="Carregando sugestões de obras" />

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container max-w-3xl pb-7 pt-7 sm:pt-9">
        <button
          type="button"
          onClick={() => navigate('/biblioteca')}
          className="flex min-h-12 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Voltar para Obras
        </button>

        <p className="ves-eyebrow mt-6">Ajude a biblioteca a crescer</p>
        <h1 className="ves-heading mt-2 max-w-2xl text-[2.35rem] leading-[1.06] sm:text-[2.7rem]">
          Qual obra você gostaria de ver no Vereda?
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted dark:text-night-muted">
          As sugestões e votos ajudam a mostrar o interesse da comunidade. Eles orientam prioridades, mas não garantem inclusão: cada obra ainda precisa passar por revisão de fonte, direitos e preparação editorial.
        </p>
      </header>

      <div className="ves-container max-w-3xl space-y-8 pb-10">
        {status && (
          <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-vesMd border border-sage-200 bg-sage-50 p-4 text-sm text-sage-900 dark:border-sage-900 dark:bg-sage-950/35 dark:text-sage-200">
            <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            {status}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-vesMd border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <p>{error}</p>
            {!candidates.length && (
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  loadCandidates()
                }}
                className="mt-3 min-h-11 rounded-vesSm px-2 font-semibold underline underline-offset-4"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        <section aria-labelledby="suggest-heading" className="ves-warm-panel rounded-vesLg border border-line/80 p-5 shadow-sm sm:p-6 dark:border-night-line">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface/85 text-clay-700 shadow-sm dark:bg-night-surface dark:text-clay-300">
              <BookPlus size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="ves-eyebrow">Primeiro procure</p>
              <h2 id="suggest-heading" className="font-display text-xl font-semibold text-ink dark:text-night-ink">Digite o nome da obra</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">O Vereda compara o título com sugestões já existentes antes de criar uma nova.</p>
            </div>
          </div>

          <form onSubmit={submitCandidate} className="mt-6 space-y-4">
            <Input
              label="Nome do livro"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setStatus('')
              }}
              placeholder="Ex.: Obras Póstumas"
              autoComplete="off"
            />

            {match ? (
              <CandidateMatchCard
                match={match}
                votingId={votingId}
                onVote={setVote}
              />
            ) : normalizedTitle.length >= 2 ? (
              <div className="rounded-vesMd border border-sage-200 bg-sage-50/70 p-4 dark:border-sage-900 dark:bg-sage-950/25">
                <div className="flex items-start gap-3">
                  <Search size={19} className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink dark:text-night-ink">Não encontramos esta obra na lista.</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">Se você confirmar a sugestão, ela será criada e seu primeiro voto será contado automaticamente.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Input
                    label="Autor (opcional)"
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    placeholder="Nome do autor"
                    autoComplete="off"
                  />
                </div>

                <Button type="submit" loading={submitting} className="mt-4 w-full sm:w-auto">
                  <BookPlus size={18} aria-hidden="true" />
                  Sugerir esta obra e votar
                </Button>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted dark:text-night-muted">Comece digitando pelo menos duas letras do título.</p>
            )}
          </form>
        </section>

        <section aria-labelledby="candidate-list-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="ves-eyebrow">Pedidos da comunidade</p>
              <h2 id="candidate-list-heading" className="ves-heading mt-1 text-[1.75rem]">Obras sugeridas</h2>
            </div>
            <span className="text-sm text-muted dark:text-night-muted">{candidates.length} {candidates.length === 1 ? 'obra' : 'obras'}</span>
          </div>

          {candidates.length ? (
            <div className="mt-5 space-y-3">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  voting={votingId === candidate.id}
                  onVote={setVote}
                />
              ))}
            </div>
          ) : (
            <Card className="mt-5 p-5 text-center sm:p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                <BookPlus size={21} aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-ink dark:text-night-ink">Ainda não há sugestões.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted dark:text-night-muted">Digite uma obra acima para iniciar a lista de pedidos da comunidade.</p>
            </Card>
          )}
        </section>
      </div>
    </main>
  )
}

function CandidateMatchCard({ match, votingId, onVote }) {
  const { candidate, exact } = match

  return (
    <div className="rounded-vesMd border border-gold-300 bg-gold-50/70 p-4 dark:border-gold-800 dark:bg-gold-950/15">
      <p className="text-sm font-semibold text-gold-800 dark:text-gold-300">
        {exact ? 'Esta obra já está na lista.' : 'Encontramos uma sugestão parecida.'}
      </p>
      <p className="mt-2 font-display text-lg font-semibold text-ink dark:text-night-ink">{candidate.title}</p>
      {candidate.author && <p className="mt-1 text-sm text-muted dark:text-night-muted">{candidate.author}</p>}
      <p className="mt-2 text-sm text-muted dark:text-night-muted">Ela já tem {voteLabel(candidate.vote_count)}.</p>

      {candidate.user_has_voted ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-vesSm bg-sage-100 px-3 text-sm font-semibold text-sage-800 dark:bg-sage-950 dark:text-sage-300">
            <Check size={17} aria-hidden="true" />
            Você já votou nesta obra
          </span>
          <Button variant="ghost" size="sm" onClick={() => onVote(candidate, false)} loading={votingId === candidate.id}>
            <X size={17} aria-hidden="true" />
            Remover meu voto
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => onVote(candidate, true)} loading={votingId === candidate.id} className="mt-4">
          <Heart size={17} aria-hidden="true" />
          Quero dar meu voto também
        </Button>
      )}
    </div>
  )
}

function CandidateCard({ candidate, voting, onVote }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold leading-tight text-ink dark:text-night-ink">{candidate.title}</p>
          {candidate.author && <p className="mt-1 text-sm text-muted dark:text-night-muted">{candidate.author}</p>}
          <p className="mt-2 text-sm font-semibold text-sage-700 dark:text-sage-300">{voteLabel(candidate.vote_count)}</p>
        </div>

        {candidate.user_has_voted ? (
          <Button variant="ghost" size="sm" onClick={() => onVote(candidate, false)} loading={voting} className="shrink-0">
            <Check size={17} aria-hidden="true" />
            Voto registrado · remover
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onVote(candidate, true)} loading={voting} className="shrink-0">
            <Heart size={17} aria-hidden="true" />
            Votar nesta obra
          </Button>
        )}
      </div>
    </Card>
  )
}
