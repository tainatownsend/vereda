import { GUIDED_STUDY_PATHS, normalizeGuidedTitle } from '../src/features/guidedStudy/catalog.js'

const SELECT = 'id,book_id,sec_position,title,kind,part_title,chapter_label,chapter_title,section_title'
const SEARCH_COLUMNS = ['title', 'section_title', 'chapter_title', 'chapter_label', 'content']

function json(res, status, body) {
  res.status(status)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function restHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  }
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

async function candidatesForTerm(baseUrl, key, bookId, term) {
  const clean = safeTerm(term)
  if (!clean) return []
  const wildcard = `*${clean}*`
  const or = `(${SEARCH_COLUMNS.map((column) => `${column}.ilike.${wildcard}`).join(',')})`
  return restGet(baseUrl, key, 'sections', {
    select: SELECT,
    book_id: `eq.${bookId}`,
    or,
    order: 'sec_position.asc',
    limit: '8',
  })
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

    const paths = []
    for (const path of GUIDED_STUDY_PATHS) {
      const book = matchBook(path, books)
      const sessions = []

      for (const session of path.sessions) {
        let matchedTerm = null
        let candidates = []
        for (const term of session.sourceTerms) {
          candidates = await candidatesForTerm(baseUrl, key, book?.id, term)
          if (candidates.length) {
            matchedTerm = term
            break
          }
        }
        sessions.push({
          id: session.id,
          title: session.title,
          sourceTerms: session.sourceTerms,
          matchedTerm,
          candidateCount: candidates.length,
          candidates: candidates.slice(0, 5),
        })
      }

      paths.push({
        key: path.key,
        title: path.title,
        book: book ? { id: book.id, title: book.title, display_order: book.display_order } : null,
        sessions,
      })
    }

    const allSessions = paths.flatMap((path) => path.sessions)
    return json(res, 200, {
      ok: true,
      environment: { projectHost: new URL(baseUrl).host },
      books,
      summary: {
        paths: paths.length,
        sessions: allSessions.length,
        withCandidate: allSessions.filter((session) => session.candidateCount > 0).length,
        withoutCandidate: allSessions.filter((session) => session.candidateCount === 0).length,
      },
      paths,
    })
  } catch (error) {
    return json(res, 500, { ok: false, error: String(error?.message || error) })
  }
}
