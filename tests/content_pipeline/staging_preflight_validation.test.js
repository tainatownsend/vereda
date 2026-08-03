import { describe, expect, it } from 'vitest'

import {
  normalizePreflightRows,
  parseCsv,
  validatePreflight,
} from '../../scripts/content_pipeline/staging_preflight_validation.mjs'

const validCsv = `check_key,severity,passed,actual_value,details
section-total,info,true,908,"{""represented_books"":5}"
duplicate-section-positions,blocking,true,0,{}
orphan-reading-sessions,blocking,true,0,{}
reading-session-book-mismatches,blocking,true,0,{}
progress-position-out-of-range,blocking,true,0,{}
aggregate-dependencies,info,true,1,"{""progress_rows"":1,""reading_sessions"":8,""users_with_sessions"":1,""contains_user_identifiers"":false}"
`

describe('staging preflight CSV parsing', () => {
  it('parses quoted JSON details', () => {
    const rows = normalizePreflightRows(
      parseCsv(validCsv),
    )

    expect(rows).toHaveLength(6)
    expect(
      rows[5].details.reading_sessions,
    ).toBe(8)
  })

  it('rejects malformed row widths', () => {
    expect(() =>
      parseCsv(
        'check_key,severity\none,blocking,extra\n',
      ),
    ).toThrow(/expected 2/)
  })
})

describe('staging preflight validation', () => {
  it('accepts the expected production state', () => {
    const rows = normalizePreflightRows(
      parseCsv(validCsv),
    )
    const result = validatePreflight({
      rows,
      expectedSectionCount: 908,
    })

    expect(result.errors).toEqual([])
    expect(
      result.snapshotRowCountMatches,
    ).toBe(true)
  })

  it('blocks section-count drift', () => {
    const rows = normalizePreflightRows(
      parseCsv(
        validCsv.replace(
          'section-total,info,true,908',
          'section-total,info,true,909',
        ),
      ),
    )
    const result = validatePreflight({
      rows,
      expectedSectionCount: 908,
    })

    expect(result.errors).toContain(
      'Production section count drifted: expected 908, received 909.',
    )
  })

  it('blocks failed production checks', () => {
    const rows = normalizePreflightRows(
      parseCsv(
        validCsv.replace(
          'orphan-reading-sessions,blocking,true,0',
          'orphan-reading-sessions,blocking,false,2',
        ),
      ),
    )
    const result = validatePreflight({
      rows,
      expectedSectionCount: 908,
    })

    expect(result.errors).toContain(
      'Blocking check failed: orphan-reading-sessions (2)',
    )
  })

  it('requires aggregate evidence without identifiers', () => {
    const rows = normalizePreflightRows(
      parseCsv(
        validCsv.replace(
          '"contains_user_identifiers"":false',
          '"contains_user_identifiers"":true',
        ),
      ),
    )
    const result = validatePreflight({
      rows,
      expectedSectionCount: 908,
    })

    expect(result.errors).toContain(
      'Aggregate dependency evidence must confirm that user identifiers are absent.',
    )
  })
})
