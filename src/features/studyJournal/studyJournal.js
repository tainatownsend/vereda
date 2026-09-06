import { supabase } from '@/lib/supabase'

const LOCAL_PREFIX = 'vereda-study-journal:'

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
  if (!storageAvailable()) return
  window.localStorage.setItem(localKey(userId), JSON.stringify(entries))
}

function upsertLocalEntry(userId, entry) {
  const existing = readLocalEntries(userId)
  const next = [entry, ...existing.filter((item) => item.entryKey !== entry.entryKey)]
  writeLocalEntries(userId, next)
  return entry
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

function mergeEntries(remote, local) {
  const byKey = new Map()
  for (const entry of [...local, ...remote]) {
    const current = byKey.get(entry.entryKey)
    if (!current || String(entry.updatedAt || '') >= String(current.updatedAt || '')) {
      byKey.set(entry.entryKey, entry)
    }
  }
  return Array.from(byKey.values()).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
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
      .select('entry_key, entry_type, text, entry_date, book_id, section_id, source_title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    const remote = (data || []).map(fromDbEntry)
    const merged = mergeEntries(remote, local)
    writeLocalEntries(userId, merged)
    return merged
  } catch {
    return local
  }
}

async function persistEntry(userId, entry) {
  upsertLocalEntry(userId, entry)
  if (!userId) return { ...entry, synced: false }

  try {
    const { error } = await supabase
      .from('study_journal_entries')
      .upsert(toDbEntry(userId, entry), { onConflict: 'user_id,entry_key' })

    if (error) throw error
    return { ...entry, synced: true }
  } catch {
    return { ...entry, synced: false }
  }
}

export async function saveDailyReflection(userId, text, date = new Date()) {
  const value = String(text || '').trim()
  if (!value) return null
  const entryDate = getLocalDateKey(date)
  const now = new Date().toISOString()
  return persistEntry(userId, {
    entryKey: `reflection:${entryDate}`,
    entryType: 'reflection',
    text: value,
    entryDate,
    bookId: null,
    sectionId: null,
    sourceTitle: 'Reflexão do dia',
    createdAt: now,
    updatedAt: now,
  })
}

export async function saveSectionNote(userId, { bookId, sectionId, sourceTitle, text }) {
  const value = String(text || '').trim()
  if (!value || !sectionId) return null
  const now = new Date().toISOString()
  return persistEntry(userId, {
    entryKey: `note:section:${sectionId}`,
    entryType: 'note',
    text: value,
    entryDate: getLocalDateKey(),
    bookId: Number(bookId) || null,
    sectionId: Number(sectionId),
    sourceTitle: sourceTitle || 'Nota de estudo',
    createdAt: now,
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
      .select('entry_key, entry_type, text, entry_date, book_id, section_id, source_title, created_at, updated_at')
      .eq('user_id', userId)
      .eq('entry_key', `note:section:${sectionId}`)
      .maybeSingle()

    if (error) throw error
    if (!data) return local
    const remote = fromDbEntry(data)
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
