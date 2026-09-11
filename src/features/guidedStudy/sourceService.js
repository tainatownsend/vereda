import { supabase } from '@/lib/supabase'
import { getGuidedSourceIds } from '@/features/guidedStudy/sourceMap'

const SOURCE_COLUMNS = 'id, book_id, sec_position, title, kind, part_title, chapter_label, chapter_title, section_title'

function orderPinnedSections(sections, pinnedIds) {
  const byId = new Map((sections || []).map((section) => [Number(section.id), section]))
  return pinnedIds.map((id) => byId.get(Number(id))).filter(Boolean)
}

export async function fetchGuidedSource(bookId, session) {
  if (!bookId || !session?.id) return { sections: [], matchedBy: 'none' }

  const pinnedIds = getGuidedSourceIds(session.id)
  if (!pinnedIds.length) return { sections: [], matchedBy: 'none' }

  const { data, error } = await supabase
    .from('sections')
    .select(SOURCE_COLUMNS)
    .eq('book_id', bookId)
    .in('id', pinnedIds)

  if (error) throw error

  const ordered = orderPinnedSections(data, pinnedIds)
  // Fail closed if even one curated anchor is absent or belongs to another book.
  if (ordered.length !== pinnedIds.length) return { sections: [], matchedBy: 'none' }

  return {
    sections: ordered,
    matchedBy: 'pinned',
  }
}

export function sourceHeading(section) {
  return section?.section_title || section?.chapter_title || section?.title || section?.chapter_label || 'Leitura indicada'
}

export function sourceMeta(section, bookTitle) {
  const parts = [bookTitle, section?.part_title, section?.chapter_label, section?.chapter_title]
  const uniqueParts = parts.filter(Boolean).filter((value, index, values) => values.indexOf(value) === index)
  return uniqueParts.join(' · ')
}
