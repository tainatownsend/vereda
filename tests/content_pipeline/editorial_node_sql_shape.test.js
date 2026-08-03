import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(
  readFileSync(
    'content/migration/editorial-node-load-manifest.json',
    'utf8',
  ),
)
const loadSql = readFileSync(
  manifest.artifacts.load_sql,
  'utf8',
)
const verificationSql = readFileSync(
  manifest.artifacts.verification_sql,
  'utf8',
)

describe('editorial-node load SQL', () => {
  it('loads only the migration run and editorial metadata', () => {
    expect(loadSql).toContain(
      'insert into content_staging.migration_runs',
    )
    expect(loadSql).toContain(
      'insert into content_staging.editorial_nodes',
    )

    for (const table of [
      'reading_segments',
      'current_successor_mappings',
      'dependency_snapshots',
      'dry_run_results',
    ]) {
      expect(loadSql).not.toMatch(
        new RegExp(
          `insert\\s+into\\s+content_staging\\.${table}\\b`,
          'i',
        ),
      )
    }
  })

  it('does not mutate production tables', () => {
    expect(loadSql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\s+public\./i,
    )
  })

  it('keeps rights and cutover blocked', () => {
    expect(loadSql).toContain(
      "'blocked'",
    )
    expect(loadSql).toContain(
      "'cutover_enabled',\n    false",
    )
  })
})

describe('editorial-node verification SQL', () => {
  it('orders an outer UNION result safely', () => {
    expect(verificationSql).toContain(
      'from (\n',
    )
    expect(verificationSql).toContain(
      ') checks\norder by checks.check_key;',
    )
  })

  it('is read-only', () => {
    expect(verificationSql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\b/i,
    )
  })
})
