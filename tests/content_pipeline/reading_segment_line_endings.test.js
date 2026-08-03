import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const normalizeNewlines = (value) =>
  value.replace(/\r\n?/g, '\n')

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const manifest = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-design-manifest.json',
    'utf8',
  ),
)

describe('reading-segment artifact portability', () => {
  it('validates generated checksums independently of Windows line endings', () => {
    const loadSql = normalizeNewlines(
      readFileSync(
        manifest.artifacts.draft_load_sql,
        'utf8',
      ),
    )
    const verificationSql = normalizeNewlines(
      readFileSync(
        manifest.artifacts.future_verification_sql,
        'utf8',
      ),
    )

    expect(sha256(loadSql)).toBe(
      manifest.artifacts.draft_load_sql_sha256,
    )
    expect(sha256(verificationSql)).toBe(
      manifest.artifacts
        .future_verification_sql_sha256,
    )
  })

  it('recognizes content-null insertion after normalization', () => {
    const loadSql = normalizeNewlines(
      readFileSync(
        manifest.artifacts.draft_load_sql,
        'utf8',
      ),
    )

    expect(loadSql).toContain(
      '  null,\n  null,\n  null,\n  payload.approval_status',
    )
  })

  it('recognizes the outer verification query after normalization', () => {
    const verificationSql = normalizeNewlines(
      readFileSync(
        manifest.artifacts.future_verification_sql,
        'utf8',
      ),
    )

    expect(verificationSql).toContain('from (\n')
    expect(verificationSql).toContain(
      ') checks\norder by checks.check_key;',
    )
  })
})
