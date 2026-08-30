const CHAPTER_LABEL = /Cap[ií]tulo\s+([IVXLCDM]+)\b/giu

export function extractChapterTopics(content) {
  const text = String(content || '').trim()
  if (!text) return []

  const bulletItems = text
    .split(/\n|•/)
    .map(cleanTopic)
    .filter(Boolean)

  if (bulletItems.length > 1) return bulletItems

  const numberedItems = []
  const numberedPattern = /(?:^|\s)(\d{1,2})[.)]\s+(.+?)(?=(?:\s+\d{1,2}[.)]\s+)|$)/g
  let match

  while ((match = numberedPattern.exec(text)) !== null) {
    const topic = cleanTopic(match[2])
    if (topic) numberedItems.push(topic)
  }

  return numberedItems.length > 1 ? numberedItems : bulletItems
}

export function extractChapterOverview(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (!text) return []

  const matches = [...text.matchAll(CHAPTER_LABEL)]
  if (!matches.length) return []

  return matches.map((match, index) => {
    const start = match.index + match[0].length
    const end = matches[index + 1]?.index ?? text.length
    const title = text.slice(start, end).trim().replace(/^[—–\-:]+\s*/, '')

    return {
      label: `Capítulo ${String(match[1]).toUpperCase()}`,
      title,
    }
  }).filter((chapter) => chapter.title)
}

export function isUsefulChapterOverview(section) {
  return section?.kind === 'chapter_intro' && extractChapterTopics(section.content).length > 1
}

export function shouldSkipChapterIntro(section) {
  return section?.kind === 'chapter_intro' && !isUsefulChapterOverview(section)
}

export function isPartOverview(section) {
  if (!section) return false
  if (section.kind === 'part_intro') return true

  const structuralTitle = [section.title, section.part_title, section.section_title]
    .filter(Boolean)
    .join(' ')

  return /\bparte\b/i.test(structuralTitle) && extractChapterOverview(section.content).length > 1
}

export function classifyReaderKind(section) {
  const kind = section?.kind || 'content'

  if (kind === 'chapter_intro' && shouldSkipChapterIntro(section)) {
    return 'chapter_intro_skip'
  }

  if (isPartOverview({ ...section, kind })) {
    return 'part_intro'
  }

  return kind
}

export function isReaderDisplayable(section) {
  return section?.kind !== 'chapter_intro_skip'
}

function cleanTopic(value) {
  return String(value || '')
    .replace(/^[-–—•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim()
}
