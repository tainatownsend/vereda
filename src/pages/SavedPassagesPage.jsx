import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Button, Card, PageLoader } from '@/components/ui'
import { getSavedPassageIds } from '@/features/savedPassages/savedPassages'

export default function SavedPassagesPage() {
  const navigate = useNavigate()
  const books = useBooks()
  const { user, removeSavedPassage } = useAuthStore()
  const savedIds = useMemo(() => getSavedPassageIds(user), [user])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const booksById = useMemo(
    () => Object.fromEntries(books.map((book) => [book.id, book])),
    [books],
  )

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!savedIds.length) {
        setSections([])
        setLoading(false)
        return
      }

      setLoading(true)
      const { data } = await supabase
        .from('sections')
        .select('id, book_id, sec_position, title, chapter_label, chapter_title, section_title, content')
        .in('id', savedIds)

      if (!active) return

      const byId = Object.fromEntries((data || []).map((section) => [section.id, section]))
      setSections(savedIds.map((id) => byId[id]).filter(Boolean))
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [savedIds])

  const remove = async (sectionId) => {
    setStatus('')
    try {
      await removeSavedPassage(sectionId)
      setStatus('Trecho removido dos salvos.')
    } catch {
      setStatus('Não foi possível remover este trecho agora.')
    }
  }

  if (loading || !books.length) return <PageLoader label="Abrindo seus trechos salvos" />

  return (
    <main className="ves-page ves-brand-page pb-28">
      <header className="ves-container pb-7 pt-8">
        <button
          type="button"
          onClick={() => navigate('/biblioteca')}
          className="flex min-h-12 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950"
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Voltar para Obras
        </button>

        <p className="ves-eyebrow mt-7">Para consultar depois</p>
        <h1 className="ves-heading mt-2 text-[2.35rem]">Trechos salvos</h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted dark:text-night-muted">
          Aqui ficam as passagens que você quis guardar. Salvar um trecho não altera sua leitura atual.
        </p>
      </header>

      <div className="ves-container pb-10">
        {status && (
          <p role="status" aria-live="polite" className="mb-5 rounded-vesMd border border-sage-200 bg-sage-50 p-4 text-sm text-sage-900 dark:border-sage-900 dark:bg-sage-950/35 dark:text-sage-200">
            {status}
          </p>
        )}

        {sections.length ? (
          <div className="space-y-4">
            {sections.map((section) => {
              const book = booksById[section.book_id]
              const heading = section.section_title || section.chapter_title || section.title || `Trecho ${section.sec_position}`
              const excerpt = String(section.content || '').replace(/\s+/g, ' ').trim().slice(0, 180)

              return (
                <Card key={section.id} className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sage-700 dark:text-sage-300">
                    {book?.title || 'Obra fundamental'}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-ink dark:text-night-ink">
                    {heading}
                  </h2>
                  {excerpt && (
                    <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
                      {excerpt}{section.content?.length > 180 ? '…' : ''}
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button onClick={() => navigate(`/trecho/${section.id}`)} className="sm:flex-1">
                      Ler este trecho
                      <ArrowRight size={18} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => remove(section.id)}
                      className="sm:flex-1"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                      Remover dos salvos
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <section className="ves-horizon-panel rounded-vesLg border border-line p-6 text-center shadow-editorial sm:p-8 dark:border-night-line">
            <div className="relative z-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface/75 text-sage-800 shadow-sm dark:bg-night-surface dark:text-sage-300">
                <Bookmark size={24} aria-hidden="true" />
              </div>
              <h2 className="ves-heading mt-5 text-[1.8rem]">Você ainda não salvou nenhum trecho.</h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted dark:text-night-muted">
                Ao encontrar uma passagem importante, toque em Salvar. Ela aparecerá aqui para você consultar depois.
              </p>
              <Button className="mt-6" onClick={() => navigate('/descobrir')}>
                Descobrir um tema
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
