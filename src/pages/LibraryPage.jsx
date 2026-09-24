import PageBackButton from '@/components/ui/PageBackButton'
import BookLoadState from '@/components/ui/BookLoadState'
import { useState } from 'react'
import { ChevronRight, Compass, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBooks, useUserData } from '@/hooks'
import { PageLoader } from '@/components/ui'
import { BookCover, EditorialCard, ProgressLine } from '@/components/northstar/NorthStarUI'
import { getBookProgress } from '@/features/home/bookProgress'

export default function LibraryPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { progress, dataLoading } = useUserData()
  const [tab, setTab] = useState('all')
  if (!books.length) return <BookLoadState />
  if (dataLoading) return <PageLoader label="Carregando estudos" />
  const visibleBooks = books.filter(book => {
    const state = getBookProgress(progress[book.id], book.total_sections)
    return tab === 'all' || (tab === 'active' ? state.started && !state.completed : state.completed)
  })
  return <main className="northstar-page pb-28">
    <div className="northstar-container pt-8">
      <header className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><PageBackButton /><h1 className="min-w-0 font-display text-[2rem]">Estudos</h1></div>
        <button type="button" onClick={() => navigate('/descobrir')} className="northstar-icon-button" aria-label="Pesquisar nas obras"><Search size={22} /></button></header>
      <div className="editorial-tabs mt-5" role="group" aria-label="Filtrar estudos">
        {[['all', 'Todos'], ['active', 'Em andamento'], ['complete', 'Concluídos']].map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <ol className="mt-5 space-y-3" aria-label="Obras fundamentais">
        {visibleBooks.map(book => {
          const state = getBookProgress(progress[book.id], book.total_sections)
          return <li key={book.id}><EditorialCard as="button" type="button" className="study-book-row w-full text-left"
            onClick={() => navigate(state.started ? `/ler/${book.id}${state.completed ? '?revisit=1' : ''}` : `/livro/${book.id}`)}>
            <BookCover book={book} size="sm" />
            <div className="min-w-0 flex-1"><h2 className="font-display text-base font-semibold leading-snug sm:text-lg">{book.title}</h2>
              <p className="mt-1 text-sm text-muted dark:text-night-muted">{book.author || 'Allan Kardec'}</p>
              <ProgressLine value={state.percent} className="mt-3" />
              <p className="mt-2 text-sm text-muted dark:text-night-muted">{state.completed ? 'Leitura concluída' : state.total ? `${state.read} de ${state.total} trechos` : 'Pronto para começar'}</p>
            </div><ChevronRight size={23} className="shrink-0 text-sage-700 dark:text-sage-300" aria-hidden="true" />
          </EditorialCard></li>
        })}
      </ol>
      {!visibleBooks.length && <p role="status" className="py-8 text-base leading-relaxed text-muted dark:text-night-muted">{!books.length ? 'Não foi possível carregar as obras. Tente recarregar a página.' : tab === 'complete' ? 'Cada leitura tem seu tempo. Suas obras concluídas aparecerão aqui.' : 'Seu próximo estudo começa em Todos. Escolha uma obra para começar.'}</p>}
      <section className="mt-7 border-t border-line pt-5 dark:border-night-line" aria-label="Outras formas de estudar">
        <button type="button" onClick={() => navigate('/estudo-guiado')} className="flex min-h-14 w-full items-center gap-3 text-left"><Compass size={22} className="shrink-0 text-sage-700 dark:text-sage-300" /><span className="min-w-0 flex-1"><span className="block font-display text-lg">Estudo guiado</span><span className="mt-1 block text-sm text-muted dark:text-night-muted">Leitura passo a passo, com tempo para refletir.</span></span><ChevronRight size={20} /></button>
        <button type="button" onClick={() => navigate('/sugerir-obra')} className="northstar-text-action mt-3">Sugerir uma obra complementar</button>
      </section>
    </div>
  </main>
}
