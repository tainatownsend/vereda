import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  expectedReadingSegmentChecks,
  expectedReadingSegmentValues,
  validateReadingSegmentApplication,
} from '../../scripts/content_pipeline/reading_segment_application_validation.mjs'

const manifest = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-design-manifest.json',
    'utf8',
  ),
)

const expected =
  expectedReadingSegmentValues(manifest)

const validRows =
  expectedReadingSegmentChecks(manifest).map(
    (checkKey) => ({
      check_key: checkKey,
      severity: 'blocking',
      passed: true,
      actual_value: expected[checkKey],
      details: {},
    }),
  )

describe('reading-segment application validation', () => {
  it('accepts all expected passing checks', () => {
    expect(
      validateReadingSegmentApplication({
        rows: validRows,
        manifest,
      }),
    ).toEqual([])
  })

  it('expects 23 application checks', () => {
    expect(
      expectedReadingSegmentChecks(manifest),
    ).toHaveLength(23)
  })

  it('blocks a failed check', () => {
    const rows = structuredClone(validRows)
    rows[0].passed = false

    expect(
      validateReadingSegmentApplication({
        rows,
        manifest,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Blocking check failed',
        ),
      ]),
    )
  })

  it('blocks segment-count drift', () => {
    const rows = structuredClone(validRows)
    const total = rows.find(
      (row) =>
        row.check_key ===
        'reading-segment-total',
    )
    total.actual_value = '811'

    expect(
      validateReadingSegmentApplication({
        rows,
        manifest,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Unexpected actual value for reading-segment-total',
        ),
      ]),
    )
  })

  it('blocks a missing check', () => {
    expect(
      validateReadingSegmentApplication({
        rows: validRows.slice(1),
        manifest,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Missing required application check',
        ),
      ]),
    )
  })
})
