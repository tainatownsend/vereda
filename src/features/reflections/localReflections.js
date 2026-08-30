const PREFIX = 'vereda-reflection:'

function getTodayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function keyFor(userId, dateKey) {
  return `${PREFIX}${userId || 'guest'}:${dateKey}`
}

export function getTodayReflection(userId) {
  if (!storageAvailable()) return null
  const dateKey = getTodayKey()

  try {
    const raw = window.localStorage.getItem(keyFor(userId, dateKey))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveTodayReflection(userId, text) {
  if (!storageAvailable()) return null
  const value = String(text || '').trim()
  if (!value) return null

  const record = {
    text: value,
    dateKey: getTodayKey(),
    savedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(keyFor(userId, record.dateKey), JSON.stringify(record))
  return record
}

export function getSavedReflections(userId) {
  if (!storageAvailable()) return []
  const userPrefix = `${PREFIX}${userId || 'guest'}:`
  const items = []

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(userPrefix)) continue

    try {
      const record = JSON.parse(window.localStorage.getItem(key))
      if (record?.text) items.push(record)
    } catch {
      // Ignore malformed local-only records without interrupting the experience.
    }
  }

  return items.sort((left, right) => String(right.savedAt).localeCompare(String(left.savedAt)))
}

export function formatReflectionDate(dateKey) {
  if (!dateKey) return ''
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}
