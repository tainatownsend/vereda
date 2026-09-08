import { supabase } from '@/lib/supabase'

const SOURCE_COLUMNS = 'id, book_id, sec_position, title, content, kind, part_title, chapter_label, chapter_title, section_title'

function usableSection(section) {
  return Boolean(String(section?.content || '').trim().length >= 80)
}

function uniqueSections(sections) {
  const byId = new Map()
  for (const section of sections || []) {
    if (section?.id && usableSection(section)) byId.set(section.id, section)
  }
  return Array.from(byId.values()).sort((a, b) => Number(a.sec_position || 0) - Number(b.sec_position || 0))
}

async function searchColumn(bookId, column, term) {
  const { data, error } = await supabase
    .from('sections')
    .select(SOURCE_COLUMNS)
    .eq('book_id', bookId)
    .ilike(column, `%${term}%`)
    .order('sec_position', { ascending: true })
    .limit(4)

  if (error) throw error
  return uniqueSections(data)
}

async function searchByTerms(bookId, terms) {
  for (const term of terms || []) {
    const clean = String(term || '').trim()
    if (!clean) continue

    for (const column of ['title', 'section_title', 'chapter_title', 'chapter_label', 'content']) {
      const found = await searchColumn(bookId, column, clean)
      if (found.length) return found.slice(0, 2)
    }
  }
  return []
}

export async function fetchGuidedSource(bookId, session) {
  if (!bookId || !session) return { sections: [], matchedBy: 'none' }

  const matched = await searchByTerms(bookId, session.sourceTerms)
  return {
    sections: matched,
    matchedBy: matched.length ? 'topic' : 'none',
  }
}

export function sourceHeading(section) {
  return section?.section_title || section?.chapter_title || section?.title || section?.chapter_label || `Trecho ${section?.sec_position || ''}`.trim()
}

export function sourceMeta(section, bookTitle) {
  const parts = [bookTitle, section?.chapter_label, section?.chapter_title]
  return parts.filter(Boolean).join(' · ')
}
