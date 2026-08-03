import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  'supabase/audits/content_staging_post_apply_verification.sql',
  'utf8',
)

describe('post-application verification SQL shape', () => {
  it('is not empty', () => {
    expect(sql.trim().length).toBeGreaterThan(1000)
  })

  it('orders the UNION result through an outer query', () => {
    expect(sql).toMatch(
      /select\s+checks\.check_key,[\s\S]*from\s*\(\s*select\s+'staging-schema-exists'/i,
    )
    expect(sql).toMatch(
      /\)\s+checks\s+order\s+by\s+case\s+checks\.severity/i,
    )
  })

  it('does not order the UNION directly by an expression', () => {
    expect(sql).not.toMatch(
      /from\s+production_counts\s+pc\s+order\s+by\s+case\s+severity/i,
    )
  })

  it('contains all eight required verification checks', () => {
    for (const check of [
      'staging-schema-exists',
      'staging-table-count',
      'staging-function-count',
      'staging-view-count',
      'application-roles-denied',
      'service-role-has-usage',
      'staging-is-empty',
      'production-section-count',
    ]) {
      expect(sql).toContain(`'${check}'`)
    }
  })

  it('remains read-only', () => {
    expect(sql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\b/i,
    )
  })
})
