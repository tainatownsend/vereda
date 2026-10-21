// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listStudyJournalEntries, saveSectionNote } from '@/features/studyJournal/studyJournal'

// A self-contained, in-memory Supabase double. No hosted database or user
// credentials are read, even when tests execute in CI.
const fake = vi.hoisted(() => ({
  rows: [], upserts: [], responseLost: false, failRead: false,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (key, value) => ({
          order: async () => fake.failRead
            ? { data: null, error: new Error('Network offline') }
            : { data: fake.rows.filter(row => row[key] === value), error: null },
        }),
      }),
      upsert: async (row) => {
        fake.upserts.push(row)
        fake.rows = [row, ...fake.rows.filter(
          existing => !(existing.user_id === row.user_id && existing.entry_key === row.entry_key),
        )]
        return fake.responseLost
          ? { error: new Error('Response lost after database commit') }
          : { error: null }
      },
    }),
  },
}))

beforeEach(() => {
  fake.rows = []
  fake.upserts = []
  fake.responseLost = false
  fake.failRead = false
  window.localStorage.clear()
})

const userId = 'fixture-user-a'
const sectionId = 33
const noteArgs = { bookId: 2, sectionId, sourceTitle: 'O Livro dos Médiuns', text: 'Estudo em andamento.' }

describe('Vereda study notes: persistence and recovery', () => {
  it('reconciles a lost Supabase response with its already-saved remote note', async () => {
    fake.responseLost = true
    const pending = await saveSectionNote(userId, noteArgs)
    expect(pending.synced).toBe(false)
    expect(pending.localSaved).toBe(true)
    expect(fake.rows).toHaveLength(1) // Server committed despite missing acknowledgement.

    fake.responseLost = false
    const entries = await listStudyJournalEntries(userId)
    expect(entries).toHaveLength(1)
    expect(entries[0].text).toBe(noteArgs.text)
    expect(entries[0].synced).toBe(true)
    expect(fake.upserts).toHaveLength(1) // Never replay a confirmed write.

    const cached = JSON.parse(localStorage.getItem('vereda-study-journal:' + userId))
    expect(cached[0].synced).toBe(true)
  })

  it('prefers a newer server note after the other device updated the same entry', async () => {
    fake.responseLost = true
    await saveSectionNote(userId, noteArgs)
    const previous = fake.rows[0]
    fake.rows = [{
      ...previous,
      text: 'Nota editada no segundo dispositivo.',
      updated_at: '2099-01-01T00:00:00.000Z',
    }]
    fake.responseLost = false

    const entries = await listStudyJournalEntries(userId)
    expect(entries[0].text).toBe('Nota editada no segundo dispositivo.')
    expect(entries[0].synced).toBe(true)
    expect(fake.upserts).toHaveLength(1)
  })

  it('retries only a pending local edit that is newer than the last server copy', async () => {
    fake.responseLost = true
    await saveSectionNote(userId, noteArgs)
    const draft = fake.rows[0]
    fake.rows = [{
      ...draft,
      text: 'Texto remoto anterior',
      updated_at: '2001-01-01T00:00:00.000Z',
    }]
    fake.responseLost = false

    const entries = await listStudyJournalEntries(userId)
    expect(entries[0].text).toBe(noteArgs.text)
    expect(entries[0].synced).toBe(true)
    expect(fake.rows[0].text).toBe(noteArgs.text)
    expect(fake.upserts).toHaveLength(2)
  })

  it('preserves a pending local note while offline without exposing it to another account', async () => {
    fake.responseLost = true
    await saveSectionNote(userId, noteArgs)
    fake.failRead = true
    const own = await listStudyJournalEntries(userId)
    const other = await listStudyJournalEntries('fixture-user-b')
    expect(own[0].synced).toBe(false)
    expect(own[0].text).toBe(noteArgs.text)
    expect(other).toEqual([])
  })
})
