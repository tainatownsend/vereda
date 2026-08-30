import { normalizeStructuralRomanNumerals } from '@/features/content/structuralLabels'
import { READER_COPY } from '@/features/reader/readerCopy'
import {
  classifyReaderKind,
  cleanReaderContent,
  cleanReaderStructuralTitle,
  isReaderDisplayable,
} from '@/features/reader/readerStructure'
import { supabase } from '@/lib/supabase'

export const SECTION_COLUMNS =
  'id, sec_position, title, content, word_count, kind, part_title, chapter_label, chapter_title, section_title'

const INDEX_METADATA_COLUMNS =
  'id, sec_position, title, kind, part_title, chapter_label, chapter_title, section_title'
const SECTION_PAGE_SIZE = 20
const INDEX_CONTENT_BATCH_SIZE = 100

export function getLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeSection(section) {
  const rawPartTitle = section.raw_part_title ?? section.part_title
  const rawChapterLabel = section.raw_chapter_label ?? section.chapter_label
  const kind = classifyReaderKind(section)

  return {
    section_id: section.section_id ?? section.id,
    sec_position: section.sec_position,
    title: normalizeStructuralRomanNumerals(cleanReaderStructuralTitle(section.title)),
    content: cleanReaderContent(section.content, kind),
    word_count: section.word_count,
    kind,
    raw_part_title: rawPartTitle,
    raw_chapter_label: rawChapterLabel,
    part_title: normalizeStructuralRomanNumerals(cleanReaderStructuralTitle(rawPartTitle)),
    chapter_label: normalizeStructuralRomanNumerals(rawChapterLabel),
    chapter_title: normalizeStructuralRomanNumerals(cleanReaderStructuralTitle(section.chapter_title)),
    section_title: normalizeStructuralRomanNumerals(cleanReaderStructuralTitle(section.section_title)),
  }
}

function normalizeDisplayableSections(data, limit) {
  const sections = (data || []).map(normalizeSection).filter(isReaderDisplayable)
  return limit ? sections.slice(0, limit) : sections
}

function throwIfError(error, fallback) {
  if (!error) return

  // Keep provider/database details in the cause for debugging while presenting
  // only calm, actionable language to the reader.
  const wrapped = new Error(fallback || 'Não foi possível concluir esta ação agora.')
  wrapped.cause = error
  throw wrapped
}

function needsIndexContent(section) {
  if (section.kind === 'chapter_intro' || section.kind === 'part_intro') return true
  if (section.kind !== 'content') return false

  const ownTitle = [section.title, section.section_title].filter(Boolean).join(' ')
  return /\bparte\b/i.test(ownTitle) || (
    Boolean(section.part_title) &&
    !section.title &&
    !section.chapter_label &&
    !section.chapter_title &&
    !section.section_title
  )
}

async function getDisplayableSectionWindow({
  bookId,
  position,
  limit,
  direction = 'forward',
  inclusive = false,
  errorMessage,
}) {
  const collected = []
  let cursor = Number(position)
  let firstPage = true

  while (collected.length < limit) {
    let query = supabase
      .from('sections')
      .select(SECTION_COLUMNS)
      .eq('book_id', bookId)

    if (direction === 'backward') {
      query = query.lt('sec_position', cursor).order('sec_position', { ascending: false })
    } else {
      query = firstPage && inclusive
        ? query.gte('sec_position', cursor)
        : query.gt('sec_position', cursor)
      query = query.order('sec_position')
    }

    const { data, error } = await query.limit(SECTION_PAGE_SIZE)
    throwIfError(error, errorMessage)

    if (!data?.length) break

    collected.push(...normalizeDisplayableSections(data))

    const nextCursor = Number(data[data.length - 1]?.sec_position)
    if (!Number.isFinite(nextCursor) || nextCursor === cursor || data.length < SECTION_PAGE_SIZE) break

    cursor = nextCursor
    firstPage = false
  }

  return collected.slice(0, limit)
}

export async function getBookIndexSections(bookId) {
  const { data: metadata, error } = await supabase
    .from('sections')
    .select(INDEX_METADATA_COLUMNS)
    .eq('book_id', bookId)
    .order('sec_position')

  throwIfError(error, 'Não foi possível carregar o índice da obra.')

  const candidateIds = (metadata || [])
    .filter(needsIndexContent)
    .map((section) => section.id)
  const contentById = new Map()

  for (let offset = 0; offset < candidateIds.length; offset += INDEX_CONTENT_BATCH_SIZE) {
    const ids = candidateIds.slice(offset, offset + INDEX_CONTENT_BATCH_SIZE)
    const { data: candidates, error: contentError } = await supabase
      .from('sections')
      .select('id, content')
      .in('id', ids)

    throwIfError(contentError, 'Não foi possível completar o índice da obra.')

    for (const candidate of candidates || []) {
      contentById.set(candidate.id, candidate.content)
    }
  }

  const hydrated = (metadata || []).map((section) => (
    contentById.has(section.id)
      ? { ...section, content: contentById.get(section.id) }
      : section
  ))

  return normalizeDisplayableSections(hydrated)
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

  const initial = normalizeDisplayableSections(data)
  if (!data?.length || data.length < 15 || initial.length >= 15) return initial

  const lastRawPosition = Number(data[data.length - 1]?.sec_position)
  if (!Number.isFinite(lastRawPosition)) return initial

  const continuation = await getDisplayableSectionWindow({
    bookId,
    position: lastRawPosition,
    limit: 15 - initial.length,
    errorMessage: READER_COPY.errors.loadContinuation,
  })

  return [...initial, ...continuation].slice(0, 15)
}

export async function getSectionsFromPosition({
  bookId,
  position,
  limit = 15,
}) {
  return getDisplayableSectionWindow({
    bookId,
    position,
    limit,
    inclusive: true,
    errorMessage: READER_COPY.errors.loadContinuation,
  })
}

export async function getNextSection({ bookId, position }) {
  const sections = await getDisplayableSectionWindow({
    bookId,
    position,
    limit: 1,
    errorMessage: READER_COPY.errors.loadContinuation,
  })

  return sections[0] || null
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
  const sections = await getDisplayableSectionWindow({
    bookId,
    position,
    limit: 1,
    direction: 'backward',
    errorMessage: READER_COPY.errors.loadPrevious,
  })

  return sections[0] || null
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
    section_title: normalizeStructuralRomanNumerals(cleanReaderStructuralTitle(section.section_title)),
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
