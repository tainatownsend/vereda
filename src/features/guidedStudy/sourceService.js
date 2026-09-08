import { supabase } from '@/lib/supabase'

const SOURCE_COLUMNS = 'id, book_id, position, chapter_label, title, content_text'

function usableSection(section) {
  return Boolean(String(section?.content_text || '').trim().length >= 80)
}

function uniqueSections(sections) {
  const byId = new Map()
  for (const section of sections || []) {
    if (section?.id && usableSection(section)) byId.set(section.id, section)
  }
  return Array.from(byId.values()).sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
}

async function searchColumn(bookId, column, term) {
  const { data, error } = await supabase
    .from('sections')
    .select(SOURCE_COLUMNS)
    .eq('book_id', bookId)
    .ilike(column, `%${term}%`)
    .order('position', { ascending: true })
    .limit(3)

  if (error) throw error
  return uniqueSections(data)
}

async function searchByTerms(bookId, terms) {
  for (const term of terms || []) {
    const clean = String(term || '').trim()
    if (!clean) continue

    for (const column of ['title', 'chapter_label', 'content_text']) {
      const found = await searchColumn(bookId, column, clean)
      if (found.length) return found.slice(0, 2)
    }
  }
  return []
}

async function fallbackByJourneyPosition(bookId, sessionIndex, totalSessions) {
  const { count, error: countError } = await supabase
    .from('sections')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId)

  if (countError) throw countError
  if (!count) return []

  const ratio = totalSessions > 1 ? sessionIndex / (totalSessions - 1) : 0
  const offset = Math.max(0, Math.min(count - 1, Math.floor(ratio * Math.max(0, count - 1))))
  const start = Math.max(0, offset - 2)
  const end = Math.min(count - 1, offset + 8)

  const { data, error } = await supabase
    .from('sections')
    .select(SOURCE_COLUMNS)
    .eq('book_id', bookId)
    .order('position', { ascending: true })
    .range(start, end)

  if (error) throw error
  return uniqueSections(data).slice(0, 2)
}

export async function fetchGuidedSource(bookId, session, sessionIndex, totalSessions) {
  if (!bookId || !session) return { sections: [], matchedBy: 'none' }

  const matched = await searchByTerms(bookId, session.sourceTerms)
  if (matched.length) return { sections: matched, matchedBy: 'topic' }

  const fallback = await fallbackByJourneyPosition(bookId, sessionIndex, totalSessions)
  return { sections: fallback, matchedBy: fallback.length ? 'journey' : 'none' }
}

export function sourceHeading(section) {
  return section?.title || section?.chapter_label || `Trecho ${section?.position || ''}`.trim()
}

export function sourceMeta(section, bookTitle) {
  const parts = [bookTitle, section?.chapter_label]
  return parts.filter(Boolean).join(' · ')
}
