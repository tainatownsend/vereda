import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Check } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { useBooks } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useReadingStore } from '@/store'
import { Button, PageLoader } from '@/components/ui'
import { normalizeStructuralRomanNumerals } from '@/features/content/structuralLabels'
import { isPassageSaved } from '@/features/savedPassages/savedPassages'

export default function PassagePage() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const books = useBooks()
  const { user, savePassage, removeSavedPassage } = useAuthStore()
  const { progress } = useReadingStore()
  const [section, setSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const numericSectionId = Number(sectionId)
  const book = books.find((item) => item.id === section?.book_id)
  const saved = isPassageSaved(user, numericSectionId)

  const paragraphs = useMemo(
    () => String(section?.content || '')
      .split(/\n\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    [section?.content],
  )

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!Number.isInteger(numericSectionId) || numericSectionId <= 0) {
        setError('Este trecho não foi encontrado.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('sections')
        .select('id, book_id, sec_position, title, content, kind, part_title, chapter_label, chapter_title, section_title')
        .eq('id', numericSectionId)
        .maybeSingle()

      if (!active) return

      if (loadError || !data) {
        setError('Não foi possível abrir este trecho agora.')
        setSection(null)
      } else {
        setSection(data)
      }

      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [numericSectionId])

  const toggleSaved = async () => {
    if (!section || saving) return
    setSaving(true)
    setStatus('')

    try {
      if (saved) {
        await removeSavedPassage(section.id)
        setStatus('Trecho removido dos salvos.')
      } else {
        await savePassage(section.id)
        setStatus('Trecho salvo para consultar depois.')
      }
    } catch {
      setStatus('Não foi possível alterar este trecho salvo agora.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !books.length) return <PageLoader label="Abrindo o trecho" />

  if (error || !section || !book) {
    return (
      <main className="ves-page ves-brand-page flex min-h-screen items-center px-6 py-12">
        <div className="mx-auto w-full max-w-xl text-center">
          <p className="ves-eyebrow">Trecho das obras</p>
          <h1 className="ves-heading mt-3 text-[2.2rem]">Não conseguimos abrir este trecho.</h1>
          <p role="alert" className="mt-4 text-base leading-relaxed text-muted dark:text-night-muted">
            {error || 'Tente voltar à busca e escolher outro resultado.'}
          </p>
          <Button className="mt-7" onClick={() => navigate('/descobrir')}>
            <ArrowLeft size={19} aria-hidden="true" />
            Voltar a Descobrir
          </Button>
        </div>
      </main>
    )
  }

  const heading = normalizeStructuralRomanNumerals(
    section.section_title || section.chapter_title || section.title || `Trecho ${section.sec_position}`,
  )
  const contextLabel = [section.chapter_label, section.chapter_title]
    .filter(Boolean)
    .map(normalizeStructuralRomanNumerals)
    .join(' · ')
  const readingStarted = Boolean(progress[book.id])

  return (
    <main className="ves-page ves-brand-page min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-md dark:border-night-line dark:bg-night/95">
        <div className="mx-auto flex max-w-[68ch] items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/descobrir')}
            className="flex min-h-12 items-center gap-2 rounded-vesSm px-2 text-sm font-semibold text-sage-800 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-950"
          >
            <ArrowLeft size={19} aria-hidden="true" />
            Descobrir
          </button>

          <button
            type="button"
            onClick={toggleSaved}
            disabled={saving}
            aria-pressed={saved}
            className={`flex min-h-12 items-center gap-2 rounded-vesSm border px-3 text-sm font-semibold ${
              saved
                ? 'border-sage-700 bg-sage-100 text-sage-900 dark:border-sage-300 dark:bg-sage-950 dark:text-sage-200'
                : 'border-line bg-surface text-sage-800 hover:border-sage-400 dark:border-night-line dark:bg-night-surface dark:text-sage-300'
            }`}
          >
            {saved ? <Check size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
            {saving ? 'Salvando…' : saved ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[68ch] px-5 pb-12 pt-9 sm:px-8 sm:pt-12">
        <p className="ves-eyebrow">{book.title}</p>
        <h1 className="ves-heading mt-2 text-[2rem] leading-[1.12] sm:text-[2.3rem]">{heading}</h1>
        {contextLabel && (
          <p className="mt-3 text-sm leading-relaxed text-muted dark:text-night-muted">
            {contextLabel}
          </p>
        )}

        {status && (
          <p role="status" aria-live="polite" className="mt-5 rounded-vesMd border border-sage-200 bg-sage-50 p-4 text-sm text-sage-900 dark:border-sage-900 dark:bg-sage-950/35 dark:text-sage-200">
            {status}
          </p>
        )}

        <article className="mt-8 font-display text-[20px] leading-[1.85] text-ink dark:text-night-ink">
          {paragraphs.map((paragraph, index) => (
            <p key={`${section.id}-${index}`} className="mb-7 last:mb-0">
              {paragraph}
            </p>
          ))}
        </article>

        <aside className="ves-warm-panel mt-10 rounded-vesLg border border-line/80 p-5 shadow-sm dark:border-night-line">
          <p className="font-display text-lg font-semibold text-ink dark:text-night-ink">
            Este trecho faz parte de {book.title}.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">
            Ler um resultado de busca não muda sua leitura atual. Você decide se quer começar ou continuar esta obra.
          </p>
          <Button
            className="mt-5 w-full sm:w-auto"
            onClick={() => navigate(readingStarted ? `/ler/${book.id}?revisit=1&section=${section.sec_position}` : `/livro/${book.id}`)}
          >
            {readingStarted ? 'Abrir este trecho na minha leitura' : 'Conhecer esta obra'}
            <ArrowRight size={19} aria-hidden="true" />
          </Button>
        </aside>
      </div>
    </main>
  )
}
