import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Link2, NotebookPen, RefreshCw } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { EditorialCard } from '@/components/northstar/NorthStarUI'
import { PageLoader } from '@/components/ui'
import { useBooks } from '@/hooks'
import { useAuthStore } from '@/store'
import { getGuidedPath, getGuidedSession, getNextGuidedSession, matchGuidedPath } from '@/features/guidedStudy/catalog'
import { isGuidedSessionComplete } from '@/features/guidedStudy/progress'
import { fetchGuidedSource, sourceHeading, sourceMeta } from '@/features/guidedStudy/sourceService'
import { listStudyJournalEntries, saveGuidedReflection } from '@/features/studyJournal/studyJournal'

export default function GuidedStudySessionPage() {
  const { pathKey, sessionId } = useParams()
  const navigate = useNavigate()
  const books = useBooks()
  const { user, completeGuidedStudySession } = useAuthStore()
  const path = getGuidedPath(pathKey)
  const session = getGuidedSession(pathKey, sessionId)
  const book = books.find((item) => matchGuidedPath(item)?.key === pathKey) || null
  const sessionIndex = path?.sessions.findIndex((item) => item.id === sessionId) ?? -1
  const nextSession = getNextGuidedSession(pathKey, sessionId)

  const [sourceSections, setSourceSections] = useState([])
  const [sourceLoading, setSourceLoading] = useState(true)
  const [sourceError, setSourceError] = useState('')
  const [sourceAttempt, setSourceAttempt] = useState(0)
  const [reflection, setReflection] = useState('')
  const [reflectionSaving, setReflectionSaving] = useState(false)
  const [reflectionStatus, setReflectionStatus] = useState('')
  const [completing, setCompleting] = useState(false)
  const [completionStatus, setCompletionStatus] = useState('')

  const complete = Boolean(path && session && isGuidedSessionComplete(user, path.key, session.id))

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!path || !session || !book) {
        if (books.length) setSourceLoading(false)
        return
      }

      setSourceLoading(true)
      setSourceError('')
      try {
        const result = await fetchGuidedSource(book.id, session)
        if (!active) return
        setSourceSections(result.sections)
        if (!result.sections.length) {
          setSourceError('Não localizamos com segurança o trecho correspondente a este encontro. Para manter o estudo fiel à obra, não vamos substituir a fonte por um trecho aproximado.')
        }
      } catch {
        if (!active) return
        setSourceSections([])
        setSourceError('Não foi possível consultar o texto da obra agora. Tente novamente.')
      } finally {
        if (active) setSourceLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [path, session, book, books.length, sourceAttempt])

  useEffect(() => {
    let active = true
    const loadReflection = async () => {
      if (!user?.id || !path || !session) return
      const entries = await listStudyJournalEntries(user.id)
      if (!active) return
      const entry = entries.find((item) => item.entryKey === `reflection:guided:${path.key}:${session.id}`)
      if (entry?.text) setReflection(entry.text)
    }
    loadReflection()
    return () => { active = false }
  }, [user?.id, path, session])

  const sourceAvailable = sourceSections.length > 0

  const saveReflection = async () => {
    const value = reflection.trim()
    if (!value || !path || !session) return
    setReflectionSaving(true)
    setReflectionStatus('')
    try {
      const entry = await saveGuidedReflection(user?.id, {
        pathKey: path.key,
        sessionId: session.id,
        bookId: book?.id,
        sectionId: sourceSections[0]?.id,
        sourceTitle: `${path.title} · ${session.title}`,
        text: value,
      })
      setReflectionStatus(entry?.synced === false ? 'Reflexão guardada neste dispositivo. O Vereda tentará sincronizar quando a conexão voltar.' : 'Reflexão guardada no seu estudo.')
    } catch {
      setReflectionStatus('Não foi possível guardar esta reflexão agora.')
    } finally {
      setReflectionSaving(false)
    }
  }

  const finishSession = async () => {
    if (!path || !session || completing || complete) return
    setCompleting(true)
    setCompletionStatus('')
    try {
      await completeGuidedStudySession(path.key, session.id)
      setCompletionStatus('Encontro concluído. Seu progresso foi salvo na sua conta.')
    } catch {
      setCompletionStatus('Não foi possível salvar a conclusão deste encontro. Tente novamente.')
    } finally {
      setCompleting(false)
    }
  }

  if (!path || !session) {
    return (
      <main className="northstar-page flex min-h-[70vh] items-center px-5 py-12">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Estudo guiado</p>
          <h1 className="mt-3 font-display text-[2rem] font-semibold text-ink dark:text-night-ink">Este encontro não foi encontrado.</h1>
          <button type="button" onClick={() => navigate('/estudo-guiado')} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-vesMd bg-sage-700 px-5 text-sm font-semibold text-white">
            <ArrowLeft size={18} aria-hidden="true" /> Voltar aos estudos guiados
          </button>
        </div>
      </main>
    )
  }

  if (!books.length) return <PageLoader label="Preparando seu estudo" />

  return (
    <main className="northstar-page pb-28">
      <div className="mx-auto w-full max-w-[760px] px-5 pb-12 pt-7 sm:px-8 sm:pt-10">
        <button
          type="button"
          onClick={() => navigate(`/estudo-guiado/${path.key}`)}
          className="inline-flex min-h-11 items-center gap-2 rounded-vesSm px-1 text-sm font-semibold text-sage-800 dark:text-sage-300"
        >
          <ArrowLeft size={18} aria-hidden="true" /> {path.title}
        </button>

        <header className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">
            Encontro {sessionIndex + 1} de {path.sessions.length} · cerca de {session.minutes} min
          </p>
          <h1 className="mt-2 font-display text-[2.2rem] font-semibold leading-tight text-ink dark:text-night-ink sm:text-[2.55rem]">{session.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
            {path.title} · a leitura da obra é sempre a referência principal deste encontro.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="before-reading-title">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">1 · Antes de ler</p>
          <EditorialCard className="mt-3 p-5 sm:p-6">
            <h2 id="before-reading-title" className="font-display text-xl font-semibold text-ink dark:text-night-ink">O que observar</h2>
            <p className="mt-2 text-base leading-relaxed text-muted dark:text-night-muted">{session.beforeReading}</p>
          </EditorialCard>
        </section>

        <section className="mt-9" aria-labelledby="source-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">2 · Na fonte</p>
              <h2 id="source-title" className="mt-1 font-display text-[1.65rem] font-semibold text-ink dark:text-night-ink">Leia na obra</h2>
            </div>
            <span className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sage-800 dark:border-sage-900 dark:bg-sage-950 dark:text-sage-300">Texto da obra</span>
          </div>

          {sourceLoading ? (
            <EditorialCard className="mt-3 p-6 text-center">
              <RefreshCw className="mx-auto animate-spin text-sage-700 dark:text-sage-300" size={21} aria-hidden="true" />
              <p className="mt-3 text-sm text-muted dark:text-night-muted">Localizando o trecho correspondente na obra…</p>
            </EditorialCard>
          ) : sourceError || !sourceAvailable ? (
            <EditorialCard className="mt-3 border-clay-200 bg-clay-50 p-5 dark:border-clay-900 dark:bg-clay-950/20 sm:p-6">
              <p role="alert" className="text-sm leading-relaxed text-clay-800 dark:text-clay-200">{sourceError || 'A fonte deste encontro não está disponível agora.'}</p>
              <button type="button" onClick={() => setSourceAttempt((value) => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-vesSm border border-clay-300 px-4 text-sm font-semibold text-clay-800 dark:border-clay-800 dark:text-clay-200">
                <RefreshCw size={16} aria-hidden="true" /> Tentar localizar novamente
              </button>
            </EditorialCard>
          ) : (
            <div className="mt-3 space-y-4">
              {sourceSections.map((section) => (
                <SourcePassage key={section.id} section={section} bookTitle={book.title} onOpen={() => navigate(`/trecho/${section.id}?from=estudo-guiado&path=${encodeURIComponent(path.key)}&session=${encodeURIComponent(session.id)}`)} />
              ))}
            </div>
          )}
        </section>

        {sourceAvailable && !sourceLoading && (
          <>
            <section className="mt-9" aria-labelledby="understand-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">3 · Entenda melhor</p>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-700 dark:bg-night-surface dark:text-gold-400">Orientação de estudo · Vereda</span>
              </div>
              <EditorialCard className="mt-3 border-gold-100 bg-amber-50/40 p-5 dark:border-night-line dark:bg-night-surface/60 sm:p-6">
                <h2 id="understand-title" className="font-display text-xl font-semibold text-ink dark:text-night-ink">Uma lente para a leitura</h2>
                <p className="mt-2 text-base leading-relaxed text-muted dark:text-night-muted">{session.understand}</p>
                <p className="mt-4 border-t border-gold-100 pt-4 text-xs leading-relaxed text-muted dark:border-night-line dark:text-night-muted">
                  Esta é uma orientação editorial do Vereda. Ela não faz parte do texto da obra e não substitui a fonte acima.
                </p>
              </EditorialCard>
            </section>

            <section className="mt-9" aria-labelledby="connection-title">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">4 · Faça a conexão</p>
              <EditorialCard className="mt-3 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300"><Link2 size={18} aria-hidden="true" /></div>
                  <div>
                    <h2 id="connection-title" className="font-display text-xl font-semibold text-ink dark:text-night-ink">{session.connection.work}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">Este tema também pode ser aprofundado em <strong>{session.connection.theme}</strong>.</p>
                  </div>
                </div>
              </EditorialCard>
            </section>

            <section className="mt-9" aria-labelledby="reflection-title">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">5 · Reflita</p>
              <EditorialCard className="mt-3 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <NotebookPen className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" size={20} aria-hidden="true" />
                  <div>
                    <h2 id="reflection-title" className="font-display text-xl font-semibold text-ink dark:text-night-ink">Com suas próprias palavras</h2>
                    <p className="mt-2 text-base leading-relaxed text-muted dark:text-night-muted">{session.reflectionPrompt}</p>
                  </div>
                </div>
                <textarea
                  value={reflection}
                  onChange={(event) => setReflection(event.target.value)}
                  rows={5}
                  maxLength={6000}
                  placeholder="Escreva apenas se fizer sentido para você…"
                  className="mt-5 w-full resize-y rounded-vesMd border border-line bg-white p-4 text-base leading-relaxed text-ink outline-none transition focus:border-sage-500 focus:ring-2 focus:ring-sage-200 dark:border-night-line dark:bg-night dark:text-night-ink dark:focus:border-sage-500 dark:focus:ring-sage-900"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted dark:text-night-muted">A reflexão é opcional e fica junto do seu diário de estudo.</p>
                  <button type="button" onClick={saveReflection} disabled={reflectionSaving || !reflection.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-vesSm border border-sage-300 px-4 text-sm font-semibold text-sage-800 disabled:opacity-50 dark:border-sage-800 dark:text-sage-300">
                    <NotebookPen size={16} aria-hidden="true" /> {reflectionSaving ? 'Guardando…' : 'Guardar reflexão'}
                  </button>
                </div>
                {reflectionStatus && <p role="status" aria-live="polite" className="mt-3 text-sm text-sage-800 dark:text-sage-300">{reflectionStatus}</p>}
              </EditorialCard>
            </section>

            <section className="mt-9" aria-labelledby="concepts-title">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Ideias deste encontro</p>
              <h2 id="concepts-title" className="sr-only">Conceitos relacionados</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.concepts.map((concept) => <span key={concept} className="rounded-full bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-800 dark:bg-sage-950 dark:text-sage-300">{concept}</span>)}
              </div>
            </section>

            <section className="mt-10 border-t border-line pt-7 dark:border-night-line">
              <button
                type="button"
                onClick={finishSession}
                disabled={completing || complete}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-vesMd px-5 text-base font-semibold transition sm:w-auto ${complete ? 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300' : 'bg-sage-700 text-white hover:bg-sage-800 disabled:opacity-60'}`}
              >
                {complete ? <Check size={19} aria-hidden="true" /> : <BookOpen size={19} aria-hidden="true" />}
                {complete ? 'Encontro concluído' : completing ? 'Salvando…' : 'Concluir encontro'}
              </button>
              {completionStatus && <p role="status" aria-live="polite" className="mt-3 text-sm text-sage-800 dark:text-sage-300">{completionStatus}</p>}

              {nextSession ? (
                <button type="button" onClick={() => navigate(`/estudo-guiado/${path.key}/${nextSession.id}`)} className="mt-6 flex w-full items-center justify-between gap-4 rounded-vesMd border border-line bg-surface p-4 text-left dark:border-night-line dark:bg-night-surface">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">Próximo encontro</p>
                    <p className="mt-1 font-display text-lg font-semibold text-ink dark:text-night-ink">{nextSession.title}</p>
                  </div>
                  <ArrowRight className="shrink-0 text-sage-700 dark:text-sage-300" size={20} aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={() => navigate(`/estudo-guiado/${path.key}`)} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">
                  Ver jornada completa <ArrowRight size={17} aria-hidden="true" />
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function SourcePassage({ section, bookTitle, onOpen }) {
  const paragraphs = useMemo(() => String(section.content || '').split(/\n\n/).map((item) => item.trim()).filter(Boolean), [section.content])

  return (
    <EditorialCard className="overflow-hidden">
      <div className="border-b border-line bg-sage-50/60 px-5 py-4 dark:border-night-line dark:bg-sage-950/20 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Texto original no corpus do Vereda</p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink dark:text-night-ink">{sourceHeading(section)}</h3>
        <p className="mt-1 text-xs text-muted dark:text-night-muted">{sourceMeta(section, bookTitle)}</p>
      </div>
      <article className="px-5 py-6 font-display text-[19px] leading-[1.8] text-ink dark:text-night-ink sm:px-7">
        {paragraphs.map((paragraph, index) => <p key={`${section.id}-${index}`} className="mb-6 last:mb-0">{paragraph}</p>)}
      </article>
      <div className="border-t border-line px-5 py-4 dark:border-night-line sm:px-6">
        <button type="button" onClick={onOpen} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">
          Abrir trecho na obra <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </EditorialCard>
  )
}
