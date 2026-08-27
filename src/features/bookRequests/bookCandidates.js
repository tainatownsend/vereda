const LEADING_ARTICLE = /^(o|a|os|as|um|uma)\s+/

export function normalizeCandidateTitle(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(LEADING_ARTICLE, '')
}

export function candidateSimilarity(left, right) {
  const a = normalizeCandidateTitle(left)
  const b = normalizeCandidateTitle(right)

  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) {
    const shorter = Math.min(a.length, b.length)
    const longer = Math.max(a.length, b.length)
    return 0.86 + 0.14 * (shorter / longer)
  }

  const aPairs = bigrams(a)
  const bPairs = bigrams(b)
  if (!aPairs.length || !bPairs.length) return 0

  const counts = new Map()
  for (const pair of aPairs) counts.set(pair, (counts.get(pair) || 0) + 1)

  let overlap = 0
  for (const pair of bPairs) {
    const available = counts.get(pair) || 0
    if (!available) continue
    overlap += 1
    counts.set(pair, available - 1)
  }

  return (2 * overlap) / (aPairs.length + bPairs.length)
}

export function findCandidateMatch(candidates, query, threshold = 0.78) {
  const normalizedQuery = normalizeCandidateTitle(query)
  if (normalizedQuery.length < 2) return null

  let best = null

  for (const candidate of candidates || []) {
    const normalizedCandidate = normalizeCandidateTitle(candidate.title)
    const exact = normalizedCandidate === normalizedQuery
    const score = exact ? 1 : candidateSimilarity(normalizedCandidate, normalizedQuery)

    if (!best || score > best.score) {
      best = { candidate, score, exact }
    }
  }

  return best && (best.exact || best.score >= threshold) ? best : null
}

export function voteLabel(count) {
  const votes = Number(count) || 0
  return `${votes} ${votes === 1 ? 'voto' : 'votos'}`
}

function bigrams(value) {
  const compact = value.replace(/\s+/g, ' ')
  if (compact.length < 2) return compact ? [compact] : []

  const result = []
  for (let index = 0; index < compact.length - 1; index += 1) {
    result.push(compact.slice(index, index + 2))
  }
  return result
}
