import BookLoadState from '@/components/ui/BookLoadState'
import { getGreeting } from '@/features/home/greeting'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Leaf, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store'
import { useBooks, useUserData } from '@/hooks'
import { Button, PageLoader, VeredaLogo } from '@/components/ui'
import { getActiveBooksByLastRead } from '@/features/home/readingOrder'
import { getBookProgress } from '@/features/home/bookProgress'
import { EditorialCard, ProgressLine } from '@/components/northstar/NorthStarUI'
import { getDailyReflection } from '@/features/reflections/dailyReflections'
import landscape from '@/assets/vereda-sunrise.webp'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const books = useBooks()
  const { progress, dataLoading } = useUserData()
  const activeBooks = useMemo(() => getActiveBooksByLastRead(books, progress), [books, progress])
  const dailyReflection = getDailyReflection()
  if (!user || dataLoading) return <PageLoader />
  if (!books.length) return <BookLoadState />
  const primaryBook = activeBooks[0]
  const greeting = getGreeting(profile?.name || user.user_metadata?.full_name)
  const reading = primaryBook ? getBookProgress(progress[primaryBook.id], primaryBook.total_sections) : null

  return <main className="northstar-page northstar-home pb-28">
    <div className="northstar-container pt-5 sm:pt-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5"><VeredaLogo size={36} /><p className="font-display text-2xl text-ink dark:text-night-ink">Vereda</p></div>
        <button type="button" onClick={() => navigate('/configuracoes')} aria-label="Abrir meu perfil" className="northstar-icon-button bg-surface-soft dark:bg-night-surface"><UserRound size={21} /></button>
      </header>
      <section className="home-welcome" aria-labelledby="home-greeting">
        <div className="home-greeting"><h1 id="home-greeting" className="font-display text-[1.8rem] leading-tight">{greeting}</h1>
          <p className="mt-2 max-w-sm text-base leading-relaxed text-muted dark:text-night-muted">Que a paz do bem te acompanhe nesta jornada.</p></div>
        <img src={landscape} alt="" className="home-landscape" fetchPriority="high" />
      </section>
      <section className="home-continue" aria-labelledby="next-study-heading">
        <EditorialCard className="p-3 sm:p-4">
          <h2 id="next-study-heading" className="mb-3 flex items-center gap-2 px-1 text-base font-medium"><BookOpen size={18} aria-hidden="true" />{primaryBook ? 'Continuar estudo' : 'Seu primeiro estudo'}</h2>
          {primaryBook ? <button type="button" onClick={() => navigate(`/ler/${primaryBook.id}`)} className="continue-study-button">
            <div className="min-w-0 flex-1"><h3 className="font-display text-xl leading-snug">{primaryBook.title}</h3>
              <p className="mt-2 text-sm">Trecho {progress[primaryBook.id]?.current_section || 1} · seu lugar está salvo</p>
              <ProgressLine value={reading.percent} className="mt-5" />
              <p className="mt-2 text-sm">{reading.total ? `${reading.read} de ${reading.total} trechos lidos` : 'No seu ritmo, sem pressa.'}</p>
            </div><ChevronRight size={27} className="shrink-0" aria-hidden="true" />
          </button> : <div className="px-2 pb-2"><h3 className="font-display text-2xl leading-snug">Uma primeira leitura, com companhia.</h3>
            <p className="mt-3 text-base leading-relaxed text-muted dark:text-night-muted">Vamos encontrar um caminho para você começar, no seu ritmo.</p>
            <Button onClick={() => navigate('/comecar')} className="mt-5 w-full">Começar estudo <ChevronRight size={19} /></Button>
            <button type="button" onClick={() => navigate('/biblioteca')} className="northstar-text-action mt-2 min-h-11 w-full">Conhecer os estudos</button>
          </div>}
        </EditorialCard>
      </section>
      <section className="mt-5" aria-labelledby="home-reflection-heading">
        <EditorialCard as="button" type="button" onClick={() => navigate('/reflexoes')} className="home-reflection w-full p-5 text-left sm:p-6">
          <h2 id="home-reflection-heading" className="flex items-center gap-2 text-sm font-medium"><Leaf size={18} aria-hidden="true" />Reflexão do dia</h2>
          <blockquote className="mt-4 font-display text-xl leading-relaxed">“{dailyReflection.text}”</blockquote>
          <p className="mt-3 text-sm text-muted dark:text-night-muted">{dailyReflection.author}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">Ler e refletir <ChevronRight size={16} aria-hidden="true" /></span>
        </EditorialCard>
      </section>
    </div>
  </main>
}
