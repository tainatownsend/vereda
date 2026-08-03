import { describe, expect, it } from 'vitest'

import {
  validateStructureMap,
} from '../../scripts/content_pipeline/structure_map.mjs'

const validMap = {
  schema_version: 1,
  counts: {
    divisions: 1,
    chapters: 1,
  },
  review_flags: [],
  nodes: [
    {
      id: 'book:division:1',
      source_key: '1111111111111111',
      parent_id: null,
      order: 1,
      depth: 0,
      type: 'division',
      title: 'Parte primeira',
      source_pdf_page: 6,
      printed_page: null,
      locator: null,
      label: null,
    },
    {
      id: 'book:chapter:1',
      source_key: '2222222222222222',
      parent_id: 'book:division:1',
      order: 2,
      depth: 1,
      type: 'chapter',
      title: 'Capítulo de teste',
      source_pdf_page: 6,
      printed_page: 17,
      locator: null,
      label: 'Capítulo I',
    },
  ],
}

describe('structure maps', () => {
  it('accepts a valid hierarchy', () => {
    expect(
      validateStructureMap(validMap, {
        divisions: 1,
        chapters: 1,
      }),
    ).toEqual([])
  })

  it('rejects missing parent references', () => {
    const map = structuredClone(validMap)
    map.nodes[1].parent_id = 'missing'

    expect(
      validateStructureMap(map),
    ).toContain('missing parent: missing')
  })

  it('rejects full-text fields', () => {
    const map = structuredClone(validMap)
    map.nodes[1].content = 'Full text'

    expect(
      validateStructureMap(map),
    ).toContain(
      'forbidden full-text key: content',
    )
  })

  it('rejects unresolved review flags', () => {
    const map = structuredClone(validMap)
    map.review_flags = ['Needs review']

    expect(
      validateStructureMap(map),
    ).toContain('1 review flags remain')
  })
})
