import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  'supabase/audits/reading_segment_staging_application_verification.sql',
  'utf8',
).replace(/\r\n?/g, '\n')

describe('reading-segment application verification SQL', () => {
  it('contains 23 blocking checks', () => {
    expect(
      sql.match(
        /'blocking'::text as severity/g,
      ),
    ).toHaveLength(23)
  })

  it('orders the UNION through an outer query', () => {
    expect(sql).toContain('from (\n')
    expect(sql).toContain(
      ') checks\norder by checks.check_key;',
    )
  })

  it('checks content and migration boundaries', () => {
    for (const checkKey of [
      'reading-segment-total',
      'boundary-review-only',
      'content-remains-null',
      'successor-mapping-count',
      'dependency-snapshot-count',
      'production-section-count',
      'application-roles-denied',
    ]) {
      expect(sql).toContain(`'${checkKey}'`)
    }
  })

  it('is read-only', () => {
    expect(sql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\b/i,
    )
  })
})
