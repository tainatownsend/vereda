import { normalizeStructuralRomanNumerals } from '@/features/content/structuralLabels'
import { READER_COPY } from '@/features/reader/readerCopy'
import { supabase } from '@/lib/supabase'

export const SECTION_COLUMNS =
  'id, sec_position, title, content, word_count, kind, part_title, chapter_label, chapter_title, section_title'

export function getLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeSection(section) {
  const rawPartTitle = section.raw_part_title ?? section.part_title
  const rawChapterLabel = section.raw_chapter_label ?? section.chapter_label

  return {
    section_id: section.section_id ?? section.id,
    sec_position: section.sec_position,
    title: normalizeStructuralRomanNumerals(section.title),
    content: section.content,
    word_count: section.word_count,
    kind: section.kind || 'content',
    raw_part_title: rawPartTitle,
    raw_chapter_label: rawChapterLabel,
    part_title: normalizeStructuralRomanNumerals(rawPartTitle),
    chapter_label: normalizeStructuralRomanNumerals(rawChapterLabel),
    chapter_title: normalizeStructuralRomanNumerals(section.chapter_title),
    section_title: normalizeStructuralRomanNumerals(section.section_title),
  }
}

function throwIfError(error, fallback) {
  if (!error) return

  // Keep provider/database details in the cause for debugging while presenting
  // only calm, actionable language to the reader.
  const wrapped = new Error(fallback || 'Não foi possível concluir esta ação agora.')
  wrapped.cause = error
  throw wrapped
}

export async function getBookIndexSections(bookId) {
  const { data, error } = await supabase
    .from('sections')
    .select(
      'id, sec_position, title, kind, part_title, chapter_label, chapter_title, section_title',
    )
    .eq('book_id', bookId)
    .order('sec_position')

  throwIfError(error, 'Não foi possível carregar o índice da obra.')

  return (data || []).map(normalizeSection)
}

export async function getReaderState({ userId, bookId, readDate }) {
  const { data, error } = await supabase.rpc('get_reader_state', {
    p_user_id: userId,
    p_book_id: bookId,
    p_read_date: readDate,
  })

  throwIfError(error, 'Não foi possível carregar o ponto onde você parou.')

  const state = data?.[0]

  if (!state) {
    throw new Error('Não encontramos o ponto salvo desta leitura. Tente novamente.')
  }

  return state
}

export async function getReaderSections({ userId, bookId }) {
  const { data, error } = await supabase.rpc('get_todays_sections', {
    p_user_id: userId,
    p_book_id: bookId,
  })

  throwIfError(error, READER_COPY.errors.loadReading)

  return (data || []).map(normalizeSection)
}

export async function getSectionsFromPosition({
  bookId,
  position,
  limit = 15,
}) {
  const { data, error } = await supabase
    .from('sections')
    .select(SECTION_COLUMNS)
    .eq('book_id', bookId)
    .gte('sec_position', position)
    .order('sec_position')
    .limit(limit)

  throwIfError(error, 'Não foi possível carregar a continuação desta leitura.')

  return (data || []).map(normalizeSection)
}

export async function getNextSection({ bookId, position }) {
  const { data, error } = await supabase
    .from('sections')
    .select(SECTION_COLUMNS)
    .eq('book_id', bookId)
    .gt('sec_position', position)
    .order('sec_position')
    .limit(1)
    .maybeSingle()

  throwIfError(error, READER_COPY.errors.loadContinuation)

  return data ? normalizeSection(data) : null
}

export async function getBookLastPosition(bookId) {
  const { data, error } = await supabase
    .from('sections')
    .select('sec_position')
    .eq('book_id', bookId)
    .order('sec_position', { ascending: false })
    .limit(1)
    .maybeSingle()

  throwIfError(error, 'Não foi possível preparar a posição desta obra.')

  return Number(data?.sec_position || 0)
}

export async function getPreviousSection({ bookId, position }) {
  const { data, error } = await supabase
    .from('sections')
    .select(SECTION_COLUMNS)
    .eq('book_id', bookId)
    .lt('sec_position', position)
    .order('sec_position', { ascending: false })
    .limit(1)
    .maybeSingle()

  throwIfError(error, READER_COPY.errors.loadPrevious)

  return data ? normalizeSection(data) : null
}

export async function getChapterSections({
  bookId,
  chapterLabel,
  partTitle,
}) {
  if (!chapterLabel) return []

  let query = supabase
    .from('sections')
    .select('sec_position, section_title')
    .eq('book_id', bookId)
    .eq('chapter_label', chapterLabel)
    .eq('kind', 'content')

  query = partTitle
    ? query.eq('part_title', partTitle)
    : query.is('part_title', null)

  const { data, error } = await query.order('sec_position')

  throwIfError(error, 'Não foi possível carregar a posição neste capítulo.')

  return (data || []).map((section) => ({
    ...section,
    section_title: normalizeStructuralRomanNumerals(section.section_title),
  }))
}

export async function completeSection({
  userId,
  bookId,
  sectionId,
  durationSeconds,
  readDate,
}) {
  const { data, error } = await supabase.rpc('complete_reading_section', {
    p_user_id: userId,
    p_book_id: bookId,
    p_section_id: sectionId,
    p_duration_s: Math.max(0, Math.round(durationSeconds || 0)),
    p_read_date: readDate,
  })

  throwIfError(error, 'Não foi possível salvar onde você parou.')

  const result = data?.[0]

  if (!result) {
    throw new Error('Não foi possível confirmar o novo ponto da leitura. Tente novamente.')
  }

  return result
}
