import { GUIDED_STUDY_PATHS, normalizeGuidedTitle } from '../src/features/guidedStudy/catalog.js'
import { getGuidedSourceIds } from '../src/features/guidedStudy/sourceMap.js'

const SELECT = 'id,book_id,part_title,chapter_label,chapter_title,section_title,title'

function json(res, status, body) {
  res.status(status)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
}

async function getRows(baseUrl, key, table, params) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  const response = await fetch(url, { headers: headers(key) })
  const text = await response.text()
  if (!response.ok) throw new Error(`${table}:${response.status}`)
  return text ? JSON.parse(text) : []
}

function matchBook(path, books) {
  return books.find((book) => {
    const title = normalizeGuidedTitle(book.title)
    return path.aliases.some((alias) => title.includes(normalizeGuidedTitle(alias)))
  }) || null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' })
  const baseUrl = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!baseUrl || !key) return json(res, 500, { ok: false, error: 'missing_environment' })

  try {
    const books = await getRows(baseUrl, key, 'books', { select: 'id,title,display_order', order: 'display_order.asc' })
    const checks = []
    for (const path of GUIDED_STUDY_PATHS) {
      const book = matchBook(path, books)
      for (const session of path.sessions) {
        const ids = getGuidedSourceIds(session.id)
        const rows = book && ids.length ? await getRows(baseUrl, key, 'sections', {
          select: SELECT,
          book_id: `eq.${book.id}`,
          id: `in.(${ids.join(',')})`,
        }) : []
        const found = new Set(rows.map((row) => Number(row.id)))
        checks.push({
          session: session.id,
          work: path.title,
          valid: Boolean(book && ids.length && ids.every((id) => found.has(Number(id)))),
          ids,
          references: ids.map((id) => {
            const row = rows.find((item) => Number(item.id) === Number(id))
            return row ? {
              id,
              heading: row.section_title || row.chapter_title || row.title,
              chapter: [row.chapter_label, row.chapter_title].filter(Boolean).join(' · '),
            } : { id, missing: true }
          }),
        })
      }
    }
    const invalid = checks.filter((check) => !check.valid)
    return json(res, invalid.length ? 409 : 200, {
      ok: invalid.length === 0,
      projectHost: new URL(baseUrl).host,
      summary: { works: GUIDED_STUDY_PATHS.length, sessions: checks.length, verified: checks.length - invalid.length, invalid: invalid.length },
      invalid,
      checks,
    })
  } catch (error) {
    return json(res, 500, { ok: false, error: String(error?.message || error) })
  }
}
