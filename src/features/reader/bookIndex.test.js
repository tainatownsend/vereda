import { describe, expect, it } from 'vitest'

import {
  buildBookIndex,
  getIndexItemState,
  getIndexSectionLabel,
} from '@/features/reader/bookIndex'

describe('bookIndex', () => {
  it('groups sections by part and chapter while preserving order', () => {
    const index = buildBookIndex([
      {
        sec_position: 1,
        part_title: 'Parte primeira',
        chapter_label: 'Capítulo I',
        chapter_title: 'Introdução',
        section_title: 'Questão 1',
      },
      {
        sec_position: 2,
        part_title: 'Parte primeira',
        chapter_label: 'Capítulo I',
        chapter_title: 'Introdução',
        section_title: 'Questão 2',
      },
      {
        sec_position: 3,
        part_title: 'Parte primeira',
        chapter_label: 'Capítulo II',
        chapter_title: 'Princípios',
        section_title: 'Questão 3',
      },
    ])

    expect(index).toHaveLength(1)
    expect(index[0].chapters).toHaveLength(2)
    expect(index[0].chapters[0].sections).toHaveLength(2)
    expect(index[0].chapters[1].sections[0].sec_position).toBe(3)
  })

  it('marks the viewed item before applying read status', () => {
    expect(
      getIndexItemState({
        sectionPosition: 5,
        viewedPosition: 5,
        persistedPosition: 10,
        bookCompleted: false,
      }),
    ).toBe('current')
  })

  it('marks earlier positions as read for an in-progress work', () => {
    expect(
      getIndexItemState({
        sectionPosition: 5,
        viewedPosition: 8,
        persistedPosition: 7,
        bookCompleted: false,
      }),
    ).toBe('read')
  })

  it('marks every non-current item as read for a completed work', () => {
    expect(
      getIndexItemState({
        sectionPosition: 50,
        viewedPosition: 10,
        persistedPosition: 10,
        bookCompleted: true,
      }),
    ).toBe('read')
  })

  it('uses a meaningful fallback label', () => {
    expect(
      getIndexSectionLabel({
        kind: 'content',
        sec_position: 12,
      }),
    ).toBe('Seção 12')
  })
})
