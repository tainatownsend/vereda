function json(res, status, body) {
  res.status(status)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function restHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' })
  const baseUrl = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!baseUrl || !key) return json(res, 500, { ok: false, error: 'missing_public_supabase_environment' })

  try {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/sections`)
    url.searchParams.set('select', 'id,book_id,sec_position,title,kind,part_title,chapter_label,chapter_title,section_title')
    url.searchParams.set('book_id', 'eq.4')
    url.searchParams.set('kind', 'eq.content')
    url.searchParams.set('order', 'sec_position.asc')
    const response = await fetch(url, { headers: restHeaders(key) })
    const text = await response.text()
    if (!response.ok) return json(res, response.status, { ok: false, error: text.slice(0, 240) })
    const sections = text ? JSON.parse(text) : []
    return json(res, 200, {
      ok: true,
      count: sections.length,
      sections: sections.map((section) => ({
        id: section.id,
        heading: section.section_title || section.chapter_title || section.title,
        part: section.part_title,
        chapter: [section.chapter_label, section.chapter_title].filter(Boolean).join(' · '),
      })),
    })
  } catch (error) {
    return json(res, 500, { ok: false, error: String(error?.message || error) })
  }
}
