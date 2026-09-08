import { GUIDED_STUDY_PATHS, normalizeGuidedTitle } from '../src/features/guidedStudy/catalog.js'

const SELECT = 'id,book_id,sec_position,title,kind,part_title,chapter_label,chapter_title,section_title'
const META_COLUMNS = ['title', 'section_title', 'chapter_title', 'chapter_label']

function json(res, status, body) {
  res.status(status)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function restHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
}

async function restGet(baseUrl, key, table, params) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  const response = await fetch(url, { headers: restHeaders(key) })
  const text = await response.text()
  if (!response.ok) throw new Error(`${table} ${response.status}: ${text.slice(0, 240)}`)
  return text ? JSON.parse(text) : []
}

function matchBook(path, books) {
  return books.find((book) => {
    const title = normalizeGuidedTitle(book.title)
    return path.aliases.some((alias) => title.includes(normalizeGuidedTitle(alias)))
  }) || null
}

function safeTerm(term) {
  return String(term || '').replace(/[,*()]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function searchSections(baseUrl, key, bookId, term, columns, limit = 20) {
  const clean = safeTerm(term)
  if (!clean || !bookId) return []
  const wildcard = `*${clean}*`
  const or = `(${columns.map((column) => `${column}.ilike.${wildcard}`).join(',')})`
  return restGet(baseUrl, key, 'sections', {
    select: SELECT,
    book_id: `eq.${bookId}`,
    or,
    order: 'sec_position.asc',
    limit: String(limit),
  })
}

function scoreCandidate(candidate, sourceTerms) {
  const title = normalizeGuidedTitle(candidate.title)
  const section = normalizeGuidedTitle(candidate.section_title)
  const chapter = normalizeGuidedTitle(candidate.chapter_title)
  const label = normalizeGuidedTitle(candidate.chapter_label)
  let best = -1
  let reason = 'content'
  let matchedTerm = null

  sourceTerms.forEach((term, index) => {
    const needle = normalizeGuidedTitle(term)
    if (!needle) return
    const priority = Math.max(0, 8 - index * 2)
    const checks = [
      [section === needle, 120, 'section-title-exact'],
      [chapter === needle, 115, 'chapter-title-exact'],
      [title === needle, 110, 'title-exact'],
      [section.includes(needle), 95, 'section-title'],
      [chapter.includes(needle), 90, 'chapter-title'],
      [title.includes(needle), 85, 'title'],
      [label.includes(needle), 70, 'chapter-label'],
    ]
    for (const [matches, base, candidateReason] of checks) {
      const score = matches ? base + priority : -1
      if (score > best) {
        best = score
        reason = candidateReason
        matchedTerm = term
      }
    }
  })

  if (candidate.kind === 'content' && section) best += 3
  if (candidate.kind === 'chapter_intro') best += 1
  return { score: best, reason, matchedTerm }
}

async function candidatesForSession(baseUrl, key, bookId, sourceTerms) {
  const byId = new Map()
  for (const term of sourceTerms || []) {
    const metadataMatches = await searchSections(baseUrl, key, bookId, term, META_COLUMNS)
    for (const row of metadataMatches) byId.set(row.id, row)
  }

  // Only fall back to searching body text when no structural heading identifies the topic.
  if (!byId.size) {
    for (const term of sourceTerms || []) {
      const contentMatches = await searchSections(baseUrl, key, bookId, term, ['content'], 12)
      for (const row of contentMatches) byId.set(row.id, row)
    }
  }

  return Array.from(byId.values())
    .map((candidate) => ({ ...candidate, audit: scoreCandidate(candidate, sourceTerms) }))
    .sort((a, b) => b.audit.score - a.audit.score || Number(a.sec_position || 0) - Number(b.sec_position || 0))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' })

  const baseUrl = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!baseUrl || !key) {
    return json(res, 500, {
      ok: false,
      error: 'missing_public_supabase_environment',
      hasUrl: Boolean(baseUrl),
      hasAnonKey: Boolean(key),
    })
  }

  try {
    const books = await restGet(baseUrl, key, 'books', {
      select: 'id,title,display_order',
      order: 'display_order.asc',
    })

    const requestedSession = String(req.query?.session || '').trim()
    const paths = []
    for (const path of GUIDED_STUDY_PATHS) {
      const book = matchBook(path, books)
      const sessions = []

      for (const session of path.sessions) {
        if (requestedSession && session.id !== requestedSession) continue
        const candidates = await candidatesForSession(baseUrl, key, book?.id, session.sourceTerms)
        sessions.push({
          id: session.id,
          title: session.title,
          sourceTerms: session.sourceTerms,
          candidateCount: candidates.length,
          best: candidates[0] || null,
          alternatives: candidates.slice(1, 4),
        })
      }

      if (sessions.length) {
        paths.push({
          key: path.key,
          title: path.title,
          book: book ? { id: book.id, title: book.title, display_order: book.display_order } : null,
          sessions,
        })
      }
    }

    const allSessions = paths.flatMap((path) => path.sessions)
    return json(res, 200, {
      ok: true,
      environment: { projectHost: new URL(baseUrl).host },
      books: requestedSession ? undefined : books,
      summary: {
        paths: requestedSession ? paths.length : GUIDED_STUDY_PATHS.length,
        sessions: allSessions.length,
        withCandidate: allSessions.filter((session) => session.best).length,
        withoutCandidate: allSessions.filter((session) => !session.best).length,
      },
      paths,
    })
  } catch (error) {
    return json(res, 500, { ok: false, error: String(error?.message || error) })
  }
}
