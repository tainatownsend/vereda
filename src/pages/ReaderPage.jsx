import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, Check, ChevronRight, MoreHorizontal } from 'lucide-react'

import { useAuthStore, useUIStore } from '@/store'
import { useBooks } from '@/hooks'
import { READER_PHASE } from '@/features/reader/readerMachine'
import { useReadingSession } from '@/features/reader/useReadingSession'
import { Button, PageLoader } from '@/components/ui'

const FONT_SIZES = {
  sm: 'text-[17px]',
  md: 'text-[20px]',
  lg: 'text-[23px]',
  xl: 'text-[27px]',
}

export default function ReaderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const books = useBooks()
  const { user } = useAuthStore()
  const { fontSize, setFontSize } = useUIStore()
  const [bookmarked, setBookmarked] = useState(false)

  const bookId = Number(id)
  const revisitMode = searchParams.get('revisit') === '1'
  const book = books.find((item) => item.id === bookId)
  const session = useReadingSession({ userId: user?.id, bookId: book?.id, revisitMode })
  const section = session.currentSection

  const paragraphs = useMemo(
    () => (section?.content || '').split(/\n\n/).map((item) => item.trim()).filter(Boolean),
    [section?.content],
  )

  if (!book || session.phase === READER_PHASE.LOADING) {
    return <PageLoader label="Preparando sua leitura" />
  }

  if (session.phase === READER_PHASE.ERROR) {
    return <ReaderState title="Não foi possível abrir esta leitura." description={session.error?.message} onAction={session.reload} action="Tentar novamente" />
  }

  if (session.phase === READER_PHASE.BOOK_COMPLETE) {
    return <ReaderState title="Você chegou ao fim desta obra." description={`Seu percurso em ${book.title} está salvo para quando quiser revisitar.`} onAction={() => navigate('/home')} action="Voltar ao início" />
  }

  if (session.phase === READER_PHASE.DAILY_GOAL_COMPLETE) {
    return (
      <ReaderState
        title="Seu momento de estudo está concluído."
        description="Seu progresso foi salvo. Você pode encerrar por aqui ou seguir lendo, sem pressão."
        onAction={() => navigate('/home')}
        action="Voltar ao início"
        secondary="Continuar lendo"
        onSecondary={session.continueAfterGoal}
      />
    )
  }

  if (!section) {
    return <ReaderState title="Não encontramos o próximo trecho." description="Tente carregar a leitura novamente." onAction={session.reload} action="Recarregar" />
  }

  const chapterLabel = section.chapter_label || (section.kind === 'chapter_intro' ? section.title : '')
  const heading = section.section_title || section.chapter_title || section.title
  const fontClass = FONT_SIZES[fontSize] || FONT_SIZES.md

  return (
    <main className="min-h-screen bg-[#f8f5ee] text-[#202b22] dark:bg-night dark:text-night-ink">
      <div className="mx-auto min-h-screen w-full max-w-[44rem] px-5 pb-32 pt-6 sm:px-8">
        <header className="flex min-h-14 items-start gap-3">
          <button type="button" onClick={() => navigate('/home')} className="northstar-icon-button -ml-2" aria-label="Voltar ao início">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1 pt-2">
            <p className="font-display text-[1.05rem] font-medium leading-snug text-[#2c382e] dark:text-night-ink">{book.title}</p>
          </div>
          <button type="button" className="northstar-icon-button -mr-2" aria-label="Mais opções">
            <MoreHorizontal size={21} />
          </button>
        </header>

        <article className="mx-auto max-w-[38rem] pt-10">
          {chapterLabel && <p className="text-sm font-medium text-[#38463a] dark:text-night-muted">{chapterLabel}</p>}
          {heading && (
            <h1 className="mt-2 font-display text-[2.25rem] font-medium leading-[1.12] tracking-[-0.025em] text-[#1f2921] dark:text-night-ink">
              {heading}
            </h1>
          )}

          <div className={`mt-9 font-display leading-[1.82] text-[#263027] dark:text-night-ink ${fontClass}`}>
            {paragraphs.length ? paragraphs.map((paragraph, index) => (
              <p key={`${section.section_id}-${index}`} className="mb-7 last:mb-0">{paragraph}</p>
            )) : (
              <p className="text-[#4d574e] dark:text-night-muted">
                {section.part_title || section.chapter_title || section.title}
              </p>
            )}
          </div>

          <div className="mt-12 border-t border-[#e2dbd1] pt-6 dark:border-night-line">
            <Button onClick={session.completeCurrentSection} loading={session.saving} className="w-full sm:w-auto">
              {section.sec_position === session.lastPosition ? 'Concluir obra' : 'Continuar leitura'}
              {!session.saving && (section.sec_position === session.lastPosition ? <Check size={19} /> : <ChevronRight size={19} />)}
            </Button>
          </div>
        </article>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e3dcd1] bg-[#fffdf8]/96 pb-safe backdrop-blur-xl dark:border-night-line dark:bg-night/96">
        <div className="mx-auto flex h-[4.4rem] max-w-[44rem] items-center justify-center gap-10 px-5">
          <button type="button" onClick={() => stepFont(fontSize, setFontSize, -1)} className="northstar-reader-control" aria-label="Diminuir tamanho do texto">A−</button>
          <button type="button" onClick={() => stepFont(fontSize, setFontSize, 1)} className="northstar-reader-control" aria-label="Aumentar tamanho do texto">A+</button>
          <button type="button" onClick={() => setBookmarked((value) => !value)} className="northstar-reader-control" aria-label="Salvar trecho">
            <Bookmark size={21} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </footer>
    </main>
  )
}

function stepFont(current, setter, direction) {
  const order = ['sm', 'md', 'lg', 'xl']
  const currentIndex = Math.max(0, order.indexOf(current))
  const nextIndex = Math.max(0, Math.min(order.length - 1, currentIndex + direction))
  setter(order[nextIndex])
}

function ReaderState({ title, description, action, onAction, secondary, onSecondary }) {
  return (
    <main className="northstar-page flex min-h-screen items-center px-6">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="font-display text-[2.2rem] font-medium leading-tight text-[#253328] dark:text-night-ink">{title}</h1>
        {description && <p className="mt-4 text-sm leading-relaxed text-[#72796f] dark:text-night-muted">{description}</p>}
        <Button onClick={onAction} className="mt-7 w-full">{action}</Button>
        {secondary && <button type="button" onClick={onSecondary} className="northstar-text-action mt-3">{secondary}</button>}
      </div>
    </main>
  )
}
