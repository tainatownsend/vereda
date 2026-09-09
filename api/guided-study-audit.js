import { GUIDED_STUDY_PATHS, normalizeGuidedTitle } from '../src/features/guidedStudy/catalog.js'
import { getGuidedSourceIds } from '../src/features/guidedStudy/sourceMap.js'

const SELECT = 'id,book_id,sec_position,title,kind,part_title,chapter_label,chapter_title,section_title'

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

function readableReference(section, bookTitle) {
  const meta = [bookTitle, section.part_title, section.chapter_label, section.chapter_title]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
  return {
    id: section.id,
    heading: section.section_title || section.chapter_title || section.title,
    meta: meta.join(' · '),
    kind: section.kind,
  }
}

async function fetchPinned(baseUrl, key, bookId, ids) {
  if (!bookId || !ids.length) return []
  const rows = await restGet(baseUrl, key, 'sections', {
    select: SELECT,
    book_id: `eq.${bookId}`,
    id: `in.(${ids.join(',')})`,
  })
  const byId = new Map(rows.map((row) => [Number(row.id), row]))
  return ids.map((id) => byId.get(Number(id))).filter(Boolean)
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

    const inspectBook = Number(req.query?.inspectBook || 0)
    if (inspectBook) {
      const book = books.find((item) => Number(item.id) === inspectBook)
      if (!book) return json(res, 404, { ok: false, error: 'book_not_found' })
      const sections = await restGet(baseUrl, key, 'sections', {
        select: SELECT,
        book_id: `eq.${inspectBook}`,
        kind: 'eq.content',
        order: 'sec_position.asc',
      })
      return json(res, 200, {
        ok: true,
        book: { id: book.id, title: book.title },
        count: sections.length,
        references: sections.map((section) => readableReference(section, book.title)),
      })
    }

    const requestedSession = String(req.query?.session || '').trim()
    const paths = []

    for (const path of GUIDED_STUDY_PATHS) {
      const book = matchBook(path, books)
      const sessions = []

      for (const session of path.sessions) {
        if (requestedSession && session.id !== requestedSession) continue
        const pinnedIds = getGuidedSourceIds(session.id)
        const sections = await fetchPinned(baseUrl, key, book?.id, pinnedIds)
        const valid = Boolean(book && pinnedIds.length && sections.length === pinnedIds.length)
        sessions.push({
          id: session.id,
          title: session.title,
          valid,
          expectedIds: pinnedIds,
          references: sections.map((section) => readableReference(section, book?.title || path.title)),
        })
      }

      if (sessions.length) {
        paths.push({
          key: path.key,
          title: path.title,
          book: book ? { id: book.id, title: book.title } : null,
          sessions,
        })
      }
    }

    const allSessions = paths.flatMap((path) => path.sessions)
    const invalid = allSessions.filter((session) => !session.valid)

    return json(res, invalid.length ? 409 : 200, {
      ok: invalid.length === 0,
      environment: { projectHost: new URL(baseUrl).host },
      summary: {
        paths: requestedSession ? paths.length : GUIDED_STUDY_PATHS.length,
        sessions: allSessions.length,
        verified: allSessions.length - invalid.length,
        invalid: invalid.length,
      },
      paths,
    })
  } catch (error) {
    return json(res, 500, { ok: false, error: String(error?.message || error) })
  }
}
