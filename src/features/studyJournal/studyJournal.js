import { supabase } from '@/lib/supabase'

const LOCAL_PREFIX = 'vereda-study-journal:'
const JOURNAL_COLUMNS = 'entry_key, entry_type, text, entry_date, book_id, section_id, source_title, created_at, updated_at'

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function localKey(userId) {
  return `${LOCAL_PREFIX}${userId || 'guest'}`
}

function readLocalEntries(userId) {
  if (!storageAvailable()) return []
  try {
    const raw = window.localStorage.getItem(localKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalEntries(userId, entries) {
  if (!storageAvailable()) return false
  try {
    window.localStorage.setItem(localKey(userId), JSON.stringify(entries))
    return true
  } catch {
    return false
  }
}

function upsertLocalEntry(userId, entry) {
  const existing = readLocalEntries(userId)
  const next = [entry, ...existing.filter((item) => item.entryKey !== entry.entryKey)]
  return writeLocalEntries(userId, next)
}

function toDbEntry(userId, entry) {
  return {
    user_id: userId,
    entry_key: entry.entryKey,
    entry_type: entry.entryType,
    text: entry.text,
    entry_date: entry.entryDate || null,
    book_id: entry.bookId || null,
    section_id: entry.sectionId || null,
    source_title: entry.sourceTitle || null,
    updated_at: entry.updatedAt,
  }
}

function fromDbEntry(row) {
  return {
    entryKey: row.entry_key,
    entryType: row.entry_type,
    text: row.text,
    entryDate: row.entry_date,
    bookId: row.book_id,
    sectionId: row.section_id,
    sourceTitle: row.source_title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: true,
  }
}

function isNewer(left, right) {
  return String(left?.updatedAt || '') > String(right?.updatedAt || '')
}

function mergeEntries(remote, local) {
  const byKey = new Map()
  for (const entry of [...remote, ...local]) {
    const current = byKey.get(entry.entryKey)
    if (!current || isNewer(entry, current) || String(entry.updatedAt || '') === String(current.updatedAt || '')) {
      byKey.set(entry.entryKey, entry)
    }
  }
  return Array.from(byKey.values()).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

async function uploadEntry(userId, entry) {
  const { error } = await supabase
    .from('study_journal_entries')
    .upsert(toDbEntry(userId, entry), { onConflict: 'user_id,entry_key' })

  if (error) throw error
  const synced = { ...entry, synced: true }
  upsertLocalEntry(userId, synced)
  return synced
}

async function retryUnsyncedEntries(userId, local, remote) {
  if (!userId) return local

  const remoteByKey = new Map(remote.map((entry) => [entry.entryKey, entry]))
  const pending = local.filter((entry) => {
    const serverEntry = remoteByKey.get(entry.entryKey)
    return entry.synced === false && (!serverEntry || isNewer(entry, serverEntry))
  })

  if (!pending.length) return local

  const syncedByKey = new Map()
  for (const entry of pending) {
    try {
      const synced = await uploadEntry(userId, entry)
      syncedByKey.set(entry.entryKey, synced)
    } catch {
      // Keep the local entry pending. A later journal read will retry safely.
    }
  }

  return local.map((entry) => syncedByKey.get(entry.entryKey) || entry)
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function listStudyJournalEntries(userId) {
  const local = readLocalEntries(userId)
  if (!userId) return local

  try {
    const { data, error } = await supabase
      .from('study_journal_entries')
      .select(JOURNAL_COLUMNS)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    const remote = (data || []).map(fromDbEntry)
    const retriedLocal = await retryUnsyncedEntries(userId, local, remote)
    const merged = mergeEntries(remote, retriedLocal)
    writeLocalEntries(userId, merged)
    return merged
  } catch {
    return local
  }
}

async function persistEntry(userId, entry) {
  const pending = { ...entry, synced: false }
  const localSaved = upsertLocalEntry(userId, pending)

  if (!userId) return { ...pending, localSaved }

  try {
    return await uploadEntry(userId, pending)
  } catch {
    return { ...pending, localSaved }
  }
}

export async function saveDailyReflection(userId, text, date = new Date()) {
  const value = String(text || '').trim()
  if (!value) return null
  const entryDate = getLocalDateKey(date)
  const entryKey = `reflection:${entryDate}`
  const existing = readLocalEntries(userId).find((entry) => entry.entryKey === entryKey)
  const now = new Date().toISOString()

  return persistEntry(userId, {
    entryKey,
    entryType: 'reflection',
    text: value,
    entryDate,
    bookId: null,
    sectionId: null,
    sourceTitle: 'Reflexão do dia',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  })
}

export async function saveSectionNote(userId, { bookId, sectionId, sourceTitle, text }) {
  const value = String(text || '').trim()
  if (!value || !sectionId) return null
  const entryKey = `note:section:${sectionId}`
  const existing = readLocalEntries(userId).find((entry) => entry.entryKey === entryKey)
  const now = new Date().toISOString()

  return persistEntry(userId, {
    entryKey,
    entryType: 'note',
    text: value,
    entryDate: getLocalDateKey(),
    bookId: Number(bookId) || null,
    sectionId: Number(sectionId),
    sourceTitle: sourceTitle || 'Nota de estudo',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  })
}

export function getLocalSectionNote(userId, sectionId) {
  return readLocalEntries(userId).find((entry) => entry.entryKey === `note:section:${sectionId}`) || null
}

export async function getSectionNote(userId, sectionId) {
  const local = getLocalSectionNote(userId, sectionId)
  if (!userId || !sectionId) return local

  try {
    const { data, error } = await supabase
      .from('study_journal_entries')
      .select(JOURNAL_COLUMNS)
      .eq('user_id', userId)
      .eq('entry_key', `note:section:${sectionId}`)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      if (local?.synced === false) return persistEntry(userId, local)
      return local
    }

    const remote = fromDbEntry(data)
    if (local && isNewer(local, remote)) {
      return persistEntry(userId, local)
    }

    upsertLocalEntry(userId, remote)
    return remote
  } catch {
    return local
  }
}

export function countJournalEntries(entries, type) {
  return (entries || []).filter((entry) => entry.entryType === type).length
}

export function formatJournalDate(dateKey) {
  if (!dateKey) return ''
  const [year, month, day] = String(dateKey).split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}
