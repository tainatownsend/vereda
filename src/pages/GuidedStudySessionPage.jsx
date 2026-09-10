import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  NotebookPen,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { EditorialCard } from '@/components/northstar/NorthStarUI'
import { PageLoader } from '@/components/ui'
import { useBooks } from '@/hooks'
import { useAuthStore } from '@/store'
import { getGuidedPath, getGuidedSession, getNextGuidedSession, matchGuidedPath } from '@/features/guidedStudy/catalog'
import { getGuidedIntegrationPrompt } from '@/features/guidedStudy/integrationPrompts'
import { isGuidedSessionComplete } from '@/features/guidedStudy/progress'
import { fetchGuidedSource, sourceHeading, sourceMeta } from '@/features/guidedStudy/sourceService'
import { shareReflectionAsImage } from '@/features/share/reflectionCard'
import { listStudyJournalEntries, saveGuidedReflection } from '@/features/studyJournal/studyJournal'

const STEP_LABELS = ['Orientação', 'Leitura', 'Assimile', 'Reflexão', 'Integração', 'Fechamento']

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
  const [reflectionPromptIndex, setReflectionPromptIndex] = useState(0)
  const [shareStatus, setShareStatus] = useState('')
  const [completing, setCompleting] = useState(false)
  const [completionStatus, setCompletionStatus] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [readSections, setReadSections] = useState([])

  const complete = Boolean(path && session && isGuidedSessionComplete(user, path.key, session.id))
  const progressKey = path && session ? `vereda:guided-step:${path.key}:${session.id}` : ''
  const readingKey = path && session ? `vereda:guided-read:${path.key}:${session.id}` : ''

  useEffect(() => {
    if (!progressKey) return
    const stored = Number(window.sessionStorage.getItem(progressKey))
    setActiveStep(Number.isInteger(stored) && stored >= 0 && stored < STEP_LABELS.length ? stored : 0)
    setReflectionPromptIndex(0)
    setShareStatus('')
    if (readingKey) {
      try {
        const storedReadSections = JSON.parse(window.sessionStorage.getItem(readingKey) || '[]')
        setReadSections(Array.isArray(storedReadSections) ? storedReadSections.map(Number).filter(Number.isFinite) : [])
      } catch {
        setReadSections([])
      }
    }
  }, [progressKey, readingKey])

  useEffect(() => {
    if (!progressKey) return
    window.sessionStorage.setItem(progressKey, String(activeStep))
  }, [activeStep, progressKey])

  useEffect(() => {
    if (!readingKey) return
    window.sessionStorage.setItem(readingKey, JSON.stringify(readSections))
  }, [readSections, readingKey])

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
          setSourceError('A referência deste encontro não pôde ser confirmada no corpus. Para manter o estudo fiel à obra, o Vereda não vai indicar uma leitura aproximada.')
        }
      } catch {
        if (!active) return
        setSourceSections([])
        setSourceError('Não foi possível consultar a referência da obra agora. Tente novamente.')
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
  const readingComplete = sourceAvailable && sourceSections.every((section) => readSections.includes(Number(section.id)))
  const reflectionPrompts = session ? [
    session.reflectionPrompt,
    `Se você explicasse “${session.title}” para alguém querido em poucas palavras, o que diria?`,
    'Onde essa ideia encontra a sua vida hoje? Pense em uma situação simples e concreta.',
  ] : []

  const openSource = (section) => {
    if (progressKey) window.sessionStorage.setItem(progressKey, String(activeStep))
    navigate(`/trecho/${section.id}?from=estudo-guiado&path=${encodeURIComponent(path.key)}&session=${encodeURIComponent(session.id)}`)
  }

  const markReadingComplete = () => {
    if (!sourceAvailable) return
    setReadSections(sourceSections.map((section) => Number(section.id)))
    if (progressKey) window.sessionStorage.setItem(progressKey, '1')
  }

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

  const shareReflection = async () => {
    if (!reflection.trim() || !session) return
    setShareStatus('')
    try {
      const result = await shareReflectionAsImage({
        text: reflection,
        title: 'Minha reflexão',
        attribution: `${path.title} · ${session.title}`,
      })
      if (result === 'shared') {
        setShareStatus('Compartilhamento aberto com a arte da sua reflexão.')
      } else if (result === 'copied') {
        setShareStatus('Imagem copiada. Cole diretamente onde quiser compartilhar.')
      } else if (result === 'downloaded') {
        setShareStatus('A imagem foi salva porque o navegador não oferece compartilhamento direto.')
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
      setShareStatus('Não foi possível criar a imagem agora. Tente novamente.')
    }
  }

  const finishSession = async () => {
    if (!path || !session || completing || complete) return
    setCompleting(true)
    setCompletionStatus('')
    try {
      await completeGuidedStudySession(path.key, session.id)
      setCompletionStatus('Encontro concluído. Seu progresso foi salvo na sua conta.')
      if (progressKey) window.sessionStorage.removeItem(progressKey)
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

  const nextStepBlocked = activeStep === 1 && (sourceLoading || !sourceAvailable || !readingComplete)

  return (
    <main className="northstar-page pb-28">
      <div className="mx-auto w-full max-w-[760px] px-5 pb-12 pt-7 sm:px-8 sm:pt-10">
        <button type="button" onClick={() => navigate(`/estudo-guiado/${path.key}`)} className="inline-flex min-h-11 items-center gap-2 rounded-vesSm px-1 text-sm font-semibold text-sage-800 dark:text-sage-300">
          <ArrowLeft size={18} aria-hidden="true" /> {path.title}
        </button>

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">Encontro {sessionIndex + 1} de {path.sessions.length} · cerca de {session.minutes} min</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight text-ink dark:text-night-ink sm:text-[2.45rem]">{session.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted dark:text-night-muted">
            Vamos juntos. Você só precisa olhar para uma etapa de cada vez.
          </p>
        </header>

        <StepProgress activeStep={activeStep} />

        <div className="mt-7 min-h-[25rem]">
          {activeStep === 0 && (
            <StepPanel number="1" label="Orientação" title="Antes de começar, saiba o que observar">
              <EditorialCard className="mt-4 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">Objetivo deste encontro</p>
                <p className="mt-2 text-base leading-relaxed text-muted dark:text-night-muted">{session.beforeReading}</p>
                <div className="mt-5 border-t border-line pt-4 dark:border-night-line">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">Durante a leitura, observe também</p>
                  <p className="mt-2 text-base leading-relaxed text-muted dark:text-night-muted">{session.understand}</p>
                </div>
                <p className="mt-5 rounded-vesSm bg-sage-50 px-4 py-3 text-sm leading-relaxed text-muted dark:bg-sage-950/30 dark:text-night-muted">
                  Não tente memorizar. Leia procurando essas ideias e volte para o encontro quando terminar.
                </p>
              </EditorialCard>
            </StepPanel>
          )}

          {activeStep === 1 && (
            <StepPanel number="2" label="Leitura" title="Leia a referência indicada">
              <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">Abra a referência, leia com calma e volte para cá. O Vereda guarda este ponto do encontro.</p>
              {sourceLoading ? (
                <EditorialCard className="mt-4 p-6 text-center">
                  <RefreshCw className="mx-auto animate-spin text-sage-700 dark:text-sage-300" size={21} aria-hidden="true" />
                  <p className="mt-3 text-sm text-muted dark:text-night-muted">Confirmando a referência no corpus…</p>
                </EditorialCard>
              ) : sourceError || !sourceAvailable ? (
                <EditorialCard className="mt-4 border-clay-200 bg-clay-50 p-5 dark:border-clay-900 dark:bg-clay-950/20 sm:p-6">
                  <p role="alert" className="text-sm leading-relaxed text-clay-800 dark:text-clay-200">{sourceError || 'A referência deste encontro não está disponível agora.'}</p>
                  <button type="button" onClick={() => setSourceAttempt((value) => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-vesSm border border-clay-300 px-4 text-sm font-semibold text-clay-800 dark:border-clay-800 dark:text-clay-200"><RefreshCw size={16} aria-hidden="true" /> Tentar novamente</button>
                </EditorialCard>
              ) : (
                <>
                  <div className="mt-4 space-y-3">
                    {sourceSections.map((section) => (
                      <SourceReference
                        key={section.id}
                        section={section}
                        bookTitle={book.title}
                        read={readSections.includes(Number(section.id))}
                        onOpen={() => openSource(section)}
                      />
                    ))}
                  </div>
                  <EditorialCard className="mt-3 p-4 sm:p-5">
                    {readingComplete ? (
                      <div className="flex items-center gap-3 text-sage-800 dark:text-sage-300">
                        <Check size={19} aria-hidden="true" />
                        <p className="text-sm font-semibold">Leitura concluída. Você já pode continuar o encontro.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-relaxed text-muted dark:text-night-muted">Leu esta referência fora do Vereda ou já terminou por conta própria?</p>
                        <button type="button" onClick={markReadingComplete} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-vesSm border border-sage-300 px-4 text-sm font-semibold text-sage-800 dark:border-sage-800 dark:text-sage-300">
                          <Check size={16} aria-hidden="true" /> Já concluí a leitura
                        </button>
                      </div>
                    )}
                  </EditorialCard>
                </>
              )}
            </StepPanel>
          )}

          {activeStep === 2 && sourceAvailable && (
            <StepPanel number="3" label="Assimile" title="O que ficou da leitura?">
              <EditorialCard className="mt-4 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">Em suas palavras</p>
                <p className="mt-2 text-base leading-relaxed text-muted dark:text-night-muted">
                  Antes de seguir, tente resumir com suas próprias palavras, em uma ou duas frases, qual foi a ideia central da leitura. Pode ser mentalmente: o objetivo é perceber o que você realmente compreendeu.
                </p>
                <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-muted dark:border-night-line dark:text-night-muted">
                  Se algo ainda estiver nebuloso, não há problema. Você poderá voltar à fonte durante o exercício de integração.
                </p>
              </EditorialCard>
              <EditorialCard className="mt-3 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300"><Link2 size={18} aria-hidden="true" /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">Uma conexão para guardar</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-ink dark:text-night-ink">{session.connection.work}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted dark:text-night-muted">Mais adiante, você pode relacionar esta leitura a <strong>{session.connection.theme}</strong>.</p>
                  </div>
                </div>
              </EditorialCard>
            </StepPanel>
          )}

          {activeStep === 3 && sourceAvailable && (
            <StepPanel number="4" label="Reflexão" title="Agora é a sua vez de conversar com a ideia">
              <EditorialCard className="mt-4 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <NotebookPen className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" size={20} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">Pergunta {reflectionPromptIndex + 1} de {reflectionPrompts.length}</p>
                      <span className="text-xs text-muted dark:text-night-muted">Sem resposta certa</span>
                    </div>
                    <p className="mt-3 font-display text-xl leading-relaxed text-ink dark:text-night-ink">{reflectionPrompts[reflectionPromptIndex]}</p>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => setReflectionPromptIndex((value) => Math.max(0, value - 1))} disabled={reflectionPromptIndex === 0} className="inline-flex min-h-10 items-center gap-1 rounded-vesSm border border-line px-3 text-xs font-semibold text-sage-800 disabled:opacity-35 dark:border-night-line dark:text-sage-300"><ChevronLeft size={15} /> Anterior</button>
                      <button type="button" onClick={() => setReflectionPromptIndex((value) => Math.min(reflectionPrompts.length - 1, value + 1))} disabled={reflectionPromptIndex === reflectionPrompts.length - 1} className="inline-flex min-h-10 items-center gap-1 rounded-vesSm border border-line px-3 text-xs font-semibold text-sage-800 disabled:opacity-35 dark:border-night-line dark:text-sage-300">Outra pergunta <ChevronRight size={15} /></button>
                    </div>
                  </div>
                </div>

                <textarea value={reflection} onChange={(event) => { setReflection(event.target.value); setShareStatus('') }} rows={5} maxLength={6000} placeholder="Escreva do seu jeito. Pode ser uma frase, uma dúvida ou algo que tocou você…" className="mt-5 w-full resize-y rounded-vesMd border border-line bg-white p-4 text-base leading-relaxed text-ink outline-none transition focus:border-sage-500 focus:ring-2 focus:ring-sage-200 dark:border-night-line dark:bg-night dark:text-night-ink dark:focus:border-sage-500 dark:focus:ring-sage-900" />
                <p className="mt-2 text-xs leading-relaxed text-muted dark:text-night-muted">Você não precisa responder às três perguntas. Elas estão aqui apenas para ajudar a ideia a assentar.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button type="button" onClick={saveReflection} disabled={reflectionSaving || !reflection.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-vesSm border border-sage-300 px-4 text-sm font-semibold text-sage-800 disabled:opacity-50 dark:border-sage-800 dark:text-sage-300"><NotebookPen size={16} aria-hidden="true" /> {reflectionSaving ? 'Guardando…' : 'Guardar reflexão'}</button>
                  <button type="button" onClick={shareReflection} disabled={!reflection.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-vesSm border border-sage-300 px-4 text-sm font-semibold text-sage-800 disabled:opacity-50 dark:border-sage-800 dark:text-sage-300"><Share2 size={16} aria-hidden="true" /> Compartilhar como imagem</button>
                </div>
                {reflectionStatus && <p role="status" aria-live="polite" className="mt-3 text-sm text-sage-800 dark:text-sage-300">{reflectionStatus}</p>}
                {shareStatus && <p role="status" aria-live="polite" className="mt-2 text-sm text-sage-800 dark:text-sage-300">{shareStatus}</p>}
              </EditorialCard>
            </StepPanel>
          )}

          {activeStep === 4 && sourceAvailable && (
            <StepPanel number="5" label="Integração" title="Vamos assentar o ensinamento">
              <EditorialCard className="mt-4 p-5 sm:p-6">
                <div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-sage-700 dark:text-sage-300" size={20} aria-hidden="true" /><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-700 dark:text-sage-300">Um pequeno exercício</p><p className="mt-2 text-base leading-relaxed text-muted dark:text-night-muted">{getGuidedIntegrationPrompt(session.id)}</p></div></div>
                <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-muted dark:border-night-line dark:text-night-muted">Faça do seu jeito e só depois volte à fonte. Não é uma prova: perceber o que ainda ficou nebuloso também é aprender.</p>
                <button type="button" onClick={() => openSource(sourceSections[0])} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">Conferir novamente na fonte <ArrowRight size={17} aria-hidden="true" /></button>
              </EditorialCard>
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Ideias deste encontro">{session.concepts.map((concept) => <span key={concept} className="rounded-full bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-800 dark:bg-sage-950 dark:text-sage-300">{concept}</span>)}</div>
            </StepPanel>
          )}

          {activeStep === 5 && sourceAvailable && (
            <StepPanel number="6" label="Fechamento" title="Por hoje, isso já é suficiente">
              <EditorialCard className="mt-4 p-5 sm:p-6">
                <p className="text-base leading-relaxed text-muted dark:text-night-muted">Você leu a fonte, ganhou uma lente para compreendê-la e teve espaço para formar a sua própria reflexão. Pode encerrar aqui sem pressa.</p>
                <button type="button" onClick={finishSession} disabled={completing || complete} className={`mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-vesMd px-5 text-base font-semibold transition sm:w-auto ${complete ? 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300' : 'bg-sage-700 text-white hover:bg-sage-800 disabled:opacity-60'}`}>
                  {complete ? <Check size={19} aria-hidden="true" /> : <BookOpen size={19} aria-hidden="true" />}{complete ? 'Encontro concluído' : completing ? 'Salvando…' : 'Concluir encontro'}
                </button>
                {completionStatus && <p role="status" aria-live="polite" className="mt-3 text-sm text-sage-800 dark:text-sage-300">{completionStatus}</p>}
              </EditorialCard>
              {nextSession ? <button type="button" onClick={() => navigate(`/estudo-guiado/${path.key}/${nextSession.id}`)} className="mt-5 flex w-full items-center justify-between gap-4 rounded-vesMd border border-line bg-surface p-4 text-left dark:border-night-line dark:bg-night-surface"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted dark:text-night-muted">Quando quiser continuar</p><p className="mt-1 font-display text-lg font-semibold text-ink dark:text-night-ink">{nextSession.title}</p></div><ArrowRight className="shrink-0 text-sage-700 dark:text-sage-300" size={20} aria-hidden="true" /></button> : <button type="button" onClick={() => navigate(`/estudo-guiado/${path.key}`)} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-300">Ver jornada completa <ArrowRight size={17} aria-hidden="true" /></button>}
            </StepPanel>
          )}
        </div>

        <nav className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5 dark:border-night-line" aria-label="Etapas do encontro">
          <button
            type="button"
            onClick={() => setActiveStep((value) => Math.max(0, value - 1))}
            disabled={activeStep === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-vesSm border border-line px-4 text-sm font-semibold text-sage-800 disabled:opacity-30 dark:border-night-line dark:text-sage-300"
          >
            <ChevronLeft size={17} aria-hidden="true" /> Voltar
          </button>
          {activeStep < STEP_LABELS.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveStep((value) => Math.min(STEP_LABELS.length - 1, value + 1))}
              disabled={nextStepBlocked}
              className="inline-flex min-h-11 items-center gap-2 rounded-vesSm bg-sage-700 px-4 text-sm font-semibold text-white disabled:opacity-45"
            >
              {getNextStepActionLabel(activeStep, readingComplete)} <ChevronRight size={17} aria-hidden="true" />
            </button>
          )}
        </nav>
      </div>
    </main>
  )
}

function StepProgress({ activeStep }) {
  const percent = ((activeStep + 1) / STEP_LABELS.length) * 100
  return (
    <div className="mt-6" aria-label={`Etapa ${activeStep + 1} de ${STEP_LABELS.length}: ${STEP_LABELS[activeStep]}`}>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs font-semibold">
        <span className="text-sage-800 dark:text-sage-300">Etapa {activeStep + 1} de {STEP_LABELS.length}</span>
        <span className="text-muted dark:text-night-muted">{STEP_LABELS[activeStep]}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line/80 dark:bg-night-line">
        <div className="h-full rounded-full bg-sage-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function StepPanel({ number, label, title, children }) {
  return (
    <section aria-labelledby={`guided-step-${number}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-700 dark:text-sage-300">{number} · {label}</p>
      <h2 id={`guided-step-${number}`} className="mt-2 font-display text-[1.7rem] font-semibold leading-tight text-ink dark:text-night-ink sm:text-[1.95rem]">{title}</h2>
      {children}
    </section>
  )
}

function SourceReference({ section, bookTitle, read, onOpen }) {
  return (
    <EditorialCard className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300"><BookOpen size={20} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-700 dark:text-sage-300">Leitura indicada</p>
            {read && <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2 py-1 text-[10px] font-semibold text-sage-800 dark:bg-sage-950 dark:text-sage-300"><Check size={12} aria-hidden="true" /> Lida</span>}
          </div>
          <h3 className="mt-1 font-display text-lg font-semibold text-ink dark:text-night-ink">{sourceHeading(section)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">{sourceMeta(section, bookTitle)}</p>
          <button type="button" onClick={onOpen} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-vesSm bg-sage-700 px-4 text-sm font-semibold text-white hover:bg-sage-800">Abrir esta leitura <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      </div>
    </EditorialCard>
  )
}


function getNextStepActionLabel(activeStep, readingComplete) {
  if (activeStep === 0) return 'Ir para a leitura'
  if (activeStep === 1) return readingComplete ? 'Continuar após a leitura' : 'Conclua a leitura para continuar'
  if (activeStep === 2) return 'Ir para a reflexão'
  if (activeStep === 3) return 'Continuar para integrar'
  if (activeStep === 4) return 'Ir para o fechamento'
  return 'Continuar'
}
