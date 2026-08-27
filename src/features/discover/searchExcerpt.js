export function buildSearchExcerpt(content, term, maxLength = 220) {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''

  const normalizedTerm = String(term || '').trim().toLocaleLowerCase('pt-BR')
  const haystack = text.toLocaleLowerCase('pt-BR')
  const index = normalizedTerm ? haystack.indexOf(normalizedTerm) : -1

  if (text.length <= maxLength) return text

  const half = Math.floor(maxLength / 2)
  const start = index >= 0
    ? Math.max(0, Math.min(index - half, text.length - maxLength))
    : 0
  const excerpt = text.slice(start, start + maxLength).trim()

  return `${start > 0 ? '…' : ''}${excerpt}${start + maxLength < text.length ? '…' : ''}`
}
