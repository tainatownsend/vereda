import { supabase } from '@/lib/supabase'
import { listStudyJournalEntries } from '@/features/studyJournal/studyJournal'

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getStudyWindowStart(days = 28, now = new Date()) {
  const start = new Date(now)
  start.setDate(start.getDate() - Math.max(0, days - 1))
  start.setHours(0, 0, 0, 0)
  return localDateKey(start)
}

export async function getStudyProgressSummary(userId) {
  const windowStart = getStudyWindowStart()
  const journal = await listStudyJournalEntries(userId)
  const journalInWindow = journal.filter((entry) => entry.entryDate && String(entry.entryDate) >= windowStart)
  const reflections = journalInWindow.filter((entry) => entry.entryType === 'reflection')
  const notes = journalInWindow.filter((entry) => entry.entryType === 'note')

  const fallback = {
    studyDays: 0,
    minutes: 0,
    sectionsVisited: 0,
    reflections: reflections.length,
    notes: notes.length,
    recentJournal: journal.slice(0, 4),
  }

  if (!userId) return fallback

  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .select('read_at, duration_s, section_id')
      .eq('user_id', userId)
      .gte('read_at', windowStart)
      .order('read_at', { ascending: false })

    if (error) throw error

    const sessions = data || []
    const studyDays = new Set(sessions.map((row) => row.read_at).filter(Boolean)).size
    const sectionsVisited = new Set(sessions.map((row) => row.section_id).filter(Boolean)).size
    const seconds = sessions.reduce((total, row) => total + Math.max(0, Number(row.duration_s) || 0), 0)

    return {
      studyDays,
      minutes: Math.round(seconds / 60),
      sectionsVisited,
      reflections: reflections.length,
      notes: notes.length,
      recentJournal: journal.slice(0, 4),
    }
  } catch {
    return fallback
  }
}

export function formatStudyMinutes(minutes) {
  const value = Math.max(0, Number(minutes) || 0)
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}
