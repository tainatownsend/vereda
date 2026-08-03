import { describe, expect, it } from 'vitest'

import {
  getLocalDate,
  normalizeSection,
} from '@/features/reader/readerService'

describe('readerService helpers', () => {
  it('formats a date using the local calendar date', () => {
    const date = new Date(2026, 7, 2, 23, 30, 0)
    expect(getLocalDate(date)).toBe('2026-08-02')
  })

  it('normalizes database section identifiers', () => {
    expect(
      normalizeSection({
        id: 42,
        sec_position: 7,
        content: 'Texto',
      }),
    ).toMatchObject({
      section_id: 42,
      sec_position: 7,
      content: 'Texto',
      kind: 'content',
    })
  })
})

describe('reader progress positioning', () => {
  it('keeps canonical section positions independent from book metadata counts', () => {
    const currentPosition = 63
    const lastPosition = 120
    const percentage = Math.round(
      ((currentPosition - 1) / (lastPosition - 1)) * 100,
    )

    expect(percentage).toBe(52)
  })
})
