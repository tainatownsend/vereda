import { describe, expect, it } from 'vitest'

import { getActiveBooksByLastRead } from '@/features/home/readingOrder'

describe('home next-step reading order', () => {
  const books = [
    { id: 'book-a', title: 'A' },
    { id: 'book-b', title: 'B' },
    { id: 'book-c', title: 'C' },
    { id: 'book-d', title: 'D' },
  ]

  it('puts the most recently read active book first', () => {
    const progress = {
      'book-a': { last_read_at: '2026-08-18T10:00:00.000Z' },
      'book-b': { last_read_at: '2026-08-21T10:00:00.000Z' },
      'book-c': { last_read_at: '2026-08-20T10:00:00.000Z' },
    }

    expect(
      getActiveBooksByLastRead(books, progress).map((book) => book.id),
    ).toEqual(['book-b', 'book-c', 'book-a'])
  })

  it('excludes books without progress and completed books', () => {
    const progress = {
      'book-a': { last_read_at: '2026-08-18T10:00:00.000Z' },
      'book-b': {
        last_read_at: '2026-08-21T10:00:00.000Z',
        completed_at: '2026-08-21T11:00:00.000Z',
      },
    }

    expect(
      getActiveBooksByLastRead(books, progress).map((book) => book.id),
    ).toEqual(['book-a'])
  })

  it('preserves the editorial order when recency is missing or invalid', () => {
    const progress = {
      'book-a': {},
      'book-b': { last_read_at: 'not-a-date' },
      'book-c': {},
    }

    expect(
      getActiveBooksByLastRead(books, progress).map((book) => book.id),
    ).toEqual(['book-a', 'book-b', 'book-c'])
  })
})
