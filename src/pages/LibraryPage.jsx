import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useReadingStore } from '@/store'
import { useBooks, useProgress } from '@/hooks'
import { Card, Badge } from '@/components/ui'

export default function LibraryPage() {
  const navigate  = useNavigate()
  const books     = useBooks()
  const { progress, streak } = useReadingStore()

  const booksStarted   = books.filter(b => progress[b.id]).length
  const booksCompleted = books.filter(b => progress[b.id]?.completed_at).length

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-slate-900 pb-24">

      <header className="bg-white dark:bg-slate-800 border-b border-primary-100 dark:border-slate-700 px-5 pt-12 pb-4">
        <h1 className="font-display text-2xl text-forest-900 dark:text-slate-50">Biblioteca</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Os cinco livros da codificação espírita</p>
      </header>

      {booksStarted > 0 && (
        <div className="px-4 mt-4 flex gap-2 flex-wrap">
          <StatPill label="Em leitura" value={booksStarted} />
          {booksCompleted > 0 && (
            <StatPill label="Concluídos" value={booksCompleted} icon={<CheckCircle size={13} />} />
          )}
          {streak > 0 && <StatPill label="Dias seguidos" value={streak} />}
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {books.map(book => (
          <BookCard key={book.id} book={book} prog={progress[book.id]} navigate={navigate} />
        ))}
      </div>

      <div className="mx-4 mt-6 mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #DDD6F3' }}>
        <div style={{ background: 'linear-gradient(135deg, #EEE9F8, #F4F1FA)', padding: '16px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#5A3F88', marginBottom: 6 }}>
            Sequência recomendada pela FEB
          </p>
          <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.7 }}>
            Os livros acima seguem a ordem de estudo recomendada pela{' '}
            <span style={{ fontWeight: 600, color: '#5A3F88' }}>Federação Espírita Brasileira</span>.
            Os textos são as obras originais de Kardec, disponibilizadas gratuitamente pela FEB.
          </p>
        </div>
        <div style={{ background: 'white', padding: '14px 20px', borderTop: '1px solid #DDD6F3' }}>
          <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.75 }}>
            O Vereda não substitui os cursos mediúnicos das casas espíritas — é uma ferramenta complementar para ajudar na leitura diária das obras de Kardec.
          </p>
        </div>
      </div>
    </div>
  )
}

function BookCard({ book, prog, navigate }) {
  const pct       = useProgress(book.id, book.total_sections)
  const completed = prog?.completed_at

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(prog ? `/ler/${book.id}` : `/livro/${book.id}`)}
    >
      <div className="h-1" style={{ background: book.cover_color }} />
      <div className="p-4 flex items-start gap-3">
        <div
          className="w-2.5 h-14 rounded-full shrink-0 mt-0.5"
          style={{ background: book.cover_color }}
        />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-base text-forest-900 dark:text-slate-100 leading-snug">{book.title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{book.author} · {book.year}</p>
            </div>
            {completed && <Badge color="violet">✓ Concluído</Badge>}
            {!prog && !completed && (
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5 shrink-0">Iniciar →</span>
            )}
          </div>

          {prog && !completed && (
            <div className="mt-3">
              <div style={{ height: 6, borderRadius: 100, background: '#EEE9F8', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 100, background: `linear-gradient(90deg, ${book.cover_color}99, ${book.cover_color})`, transition: 'width 0.7s' }} />
              </div>
              <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                <span>Seção {prog.current_section} de {book.total_sections || '?'}</span>
                <span className="text-primary-600 dark:text-primary-400 font-semibold">{pct}%</span>
              </div>
            </div>
          )}

          {!prog && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2">{book.description}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function StatPill({ label, value, icon }) {
  return (
    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
      {icon && <span className="text-primary-500">{icon}</span>}
      <span className="text-sm font-bold text-forest-900 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500">{label}</span>
    </div>
  )
}