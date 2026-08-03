import { describe, expect, it } from 'vitest'

import {
  validateComparisonSummary,
} from '../../scripts/content_pipeline/comparison_validation.mjs'

const validSummary = {
  schema_version: 1,
  book_count: 5,
  books: Array.from({ length: 5 }, (_, index) => ({
    book: {
      book_id: index + 1,
      title: `Book ${index + 1}`,
    },
    summary: {
      current_record_count: 10,
    },
  })),
}

describe('comparison summary validation', () => {
  it('accepts five structural summaries', () => {
    expect(
      validateComparisonSummary(validSummary),
    ).toEqual([])
  })

  it('rejects duplicate book identifiers', () => {
    const summary = structuredClone(validSummary)
    summary.books[1].book.book_id = 1

    expect(
      validateComparisonSummary(summary),
    ).toContain('duplicate book_id: 1')
  })

  it('rejects full-text fields', () => {
    const summary = structuredClone(validSummary)
    summary.books[0].content = 'Forbidden'

    expect(
      validateComparisonSummary(summary),
    ).toContain('forbidden key: content')
  })

  it('rejects user data fields', () => {
    const summary = structuredClone(validSummary)
    summary.books[0].user_id = 'user'

    expect(
      validateComparisonSummary(summary),
    ).toContain('forbidden key: user_id')
  })
})
