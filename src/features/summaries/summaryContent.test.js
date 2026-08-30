import { describe, expect, it } from 'vitest'
import { BOOK_SUMMARIES, getBookSummary } from './summaryContent'

describe('Vereda study summaries', () => {
  it('covers all five basic works', () => {
    expect(Object.keys(BOOK_SUMMARIES)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('keeps every guide substantive but source-oriented', () => {
    for (const bookId of [1, 2, 3, 4, 5]) {
      const summary = getBookSummary(bookId)
      expect(summary.overview.length).toBeGreaterThan(120)
      expect(summary.themes.length).toBeGreaterThanOrEqual(5)
      expect(summary.questions.length).toBeGreaterThanOrEqual(3)
      expect(summary.note.length).toBeGreaterThan(70)
    }
  })

  it('returns null for unsupported works', () => {
    expect(getBookSummary(99)).toBeNull()
  })
})
