import {
  getReaderIndexFallbackLabel,
  READER_COPY,
} from '@/features/reader/readerCopy'

const DEFAULT_PART = 'Conteúdo'
const DEFAULT_CHAPTER = READER_COPY.defaultIndexGroup

export function buildBookIndex(sections) {
  const parts = []
  const partMap = new Map()

  for (const section of sections) {
    const partKey = section.part_title || DEFAULT_PART
    const chapterKey =
      section.chapter_label ||
      section.chapter_title ||
      DEFAULT_CHAPTER

    if (!partMap.has(partKey)) {
      const part = {
        id: `part-${parts.length + 1}`,
        title: partKey,
        chapters: [],
      }

      parts.push(part)
      partMap.set(partKey, {
        part,
        chapters: new Map(),
      })
    }

    const partEntry = partMap.get(partKey)

    if (!partEntry.chapters.has(chapterKey)) {
      const chapter = {
        id: `${partEntry.part.id}-chapter-${partEntry.part.chapters.length + 1}`,
        label: section.chapter_label || '',
        title:
          section.chapter_title ||
          (chapterKey === DEFAULT_CHAPTER ? DEFAULT_CHAPTER : chapterKey),
        sections: [],
      }

      partEntry.part.chapters.push(chapter)
      partEntry.chapters.set(chapterKey, chapter)
    }

    partEntry.chapters.get(chapterKey).sections.push(section)
  }

  return parts
}

export function getIndexSectionLabel(section) {
  if (section.section_title) return section.section_title
  if (section.kind === 'part_intro') return section.title || 'Abertura da parte'
  if (section.kind === 'chapter_intro') {
    return section.chapter_title || section.title || 'Abertura do capítulo'
  }
  return section.title || getReaderIndexFallbackLabel(section.sec_position)
}

export function getIndexItemState({
  sectionPosition,
  viewedPosition,
  persistedPosition,
  bookCompleted,
}) {
  if (Number(sectionPosition) === Number(viewedPosition)) {
    return 'current'
  }

  if (
    bookCompleted ||
    Number(sectionPosition) < Number(persistedPosition)
  ) {
    return 'read'
  }

  return 'unread'
}
