import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  'supabase/audits/content_migration_preflight.sql',
  'utf8',
)

describe('production preflight SQL shape', () => {
  it('is not empty', () => {
    expect(sql.trim().length).toBeGreaterThan(500)
  })

  it('orders the UNION result through an outer query', () => {
    expect(sql).toMatch(
      /select\s+checks\.check_key,[\s\S]*from\s*\(\s*select\s+'section-total'/i,
    )
    expect(sql).toMatch(
      /\)\s+checks\s+order\s+by\s+case\s+checks\.severity/i,
    )
  })

  it('contains all six required checks', () => {
    for (const check of [
      'section-total',
      'duplicate-section-positions',
      'orphan-reading-sessions',
      'reading-session-book-mismatches',
      'progress-position-out-of-range',
      'aggregate-dependencies',
    ]) {
      expect(sql).toContain(`'${check}'`)
    }
  })

  it('does not mutate production tables', () => {
    expect(sql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\s+public\./i,
    )
  })
})
