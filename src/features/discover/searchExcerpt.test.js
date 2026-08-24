import { describe, expect, it } from 'vitest'

import { buildSearchExcerpt } from './searchExcerpt'

describe('search excerpt', () => {
  it('returns short passages without decoration', () => {
    expect(buildSearchExcerpt('Uma passagem curta sobre oração.', 'oração')).toBe(
      'Uma passagem curta sobre oração.',
    )
  })

  it('centers a long excerpt around the matching term', () => {
    const content = `${'Antes '.repeat(30)}reencarnação ${'depois '.repeat(30)}`
    const excerpt = buildSearchExcerpt(content, 'reencarnação', 120)

    expect(excerpt).toContain('reencarnação')
    expect(excerpt.startsWith('…')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
  })

  it('falls back to the start when the term is not present', () => {
    const content = 'abcdef '.repeat(50)
    const excerpt = buildSearchExcerpt(content, 'oração', 60)

    expect(excerpt.startsWith('abcdef')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
