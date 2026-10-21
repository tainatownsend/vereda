import { describe, expect, it } from 'vitest'
import { mergeConfirmedReaderProgress, resolveReaderStartPosition } from '@/features/reader/readerPersistence'

describe('Vereda reading position across devices', () => {
  it('prioritizes confirmed remote progress over an outdated local tab', () => {
    expect(resolveReaderStartPosition({
      serverPosition: 22, storedPosition: 12, lastPosition: 84,
    })).toBe(22)
  })
  it('retains an in-tab forward visit when it does not conflict with saved progress', () => {
    expect(resolveReaderStartPosition({
      serverPosition: 12, storedPosition: 17, lastPosition: 84,
    })).toBe(17)
  })
  it('ignores invalid and out-of-range browser positions', () => {
    expect(resolveReaderStartPosition({
      serverPosition: 22, storedPosition: 999, lastPosition: 84,
    })).toBe(22)
    expect(resolveReaderStartPosition({
      serverPosition: 9, storedPosition: -5, lastPosition: 84,
    })).toBe(9)
  })
  it('starts a completed book at its beginning only in explicit revisit mode', () => {
    expect(resolveReaderStartPosition({
      serverPosition: 84, storedPosition: 64, lastPosition: 84,
      bookCompleted: true, revisitMode: true,
    })).toBe(1)
  })
  it('keeps the last canonical position when sessionStorage is empty', () => {
    expect(resolveReaderStartPosition({
      serverPosition: 34, storedPosition: 0, lastPosition: 84,
    })).toBe(34)
  })
  it('refreshes in-memory Home progress only after a confirmed successful RPC', () => {
    const prior = { current_section: 21, pace_mode: 'minutes', pace_minutes: 10 }
    const next = mergeConfirmedReaderProgress(prior, {
      nextPosition: 22,
      completedAt: '2026-10-21T10:00:00Z',
    })
    expect(next).toMatchObject({
      current_section: 22,
      pace_mode: 'minutes',
      pace_minutes: 10,
      last_read_at: '2026-10-21T10:00:00Z',
    })
    expect(prior.current_section).toBe(21)
  })
  it('does not regress an already-newer shared position', () => {
    expect(mergeConfirmedReaderProgress({current_section: 30}, {nextPosition: 22}).current_section).toBe(30)
  })
  it('marks book completion without losing earlier settings', () => {
    const progress = mergeConfirmedReaderProgress({current_section: 74, pace_mode: 'free'}, {
      nextPosition: 75, bookCompleted: true, completedAt: '2026-10-21T12:00:00Z',
    })
    expect(progress).toMatchObject({
      current_section: 75, pace_mode: 'free', completed_at: '2026-10-21T12:00:00Z',
    })
  })
});
