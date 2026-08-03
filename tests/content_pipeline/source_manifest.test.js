import { describe, expect, it } from 'vitest'

import {
  validateManifest,
} from '../../scripts/content_pipeline/source_manifest.mjs'

const validManifest = {
  schema_version: 2,
  works: Array.from({ length: 5 }, (_, index) => ({
    book_id: index + 1,
    slug: `book-${index + 1}`,
    title: `Book ${index + 1}`,
    source_file: `book-${index + 1}.pdf`,
    source_sha256: String(index + 1).repeat(64),
    pdf_page_count: 100 + index,
  })),
}

describe('source manifest', () => {
  it('accepts five unique registered works', () => {
    expect(validateManifest(validManifest)).toEqual([])
  })

  it('rejects duplicate identifiers and slugs', () => {
    const manifest = structuredClone(validManifest)
    manifest.works[1].book_id = manifest.works[0].book_id
    manifest.works[1].slug = manifest.works[0].slug

    expect(validateManifest(manifest)).toEqual(
      expect.arrayContaining([
        'duplicate book_id: 1',
        'duplicate slug: book-1',
      ]),
    )
  })

  it('rejects duplicate files and checksums', () => {
    const manifest = structuredClone(validManifest)
    manifest.works[1].source_file =
      manifest.works[0].source_file
    manifest.works[1].source_sha256 =
      manifest.works[0].source_sha256

    expect(validateManifest(manifest)).toEqual(
      expect.arrayContaining([
        'duplicate source_file: book-1.pdf',
        `duplicate source_sha256: ${'1'.repeat(64)}`,
      ]),
    )
  })

  it('requires exactly five works', () => {
    expect(
      validateManifest({
        schema_version: 2,
        works: validManifest.works.slice(0, 4),
      }),
    ).toContain('manifest must contain exactly five works')
  })
})
