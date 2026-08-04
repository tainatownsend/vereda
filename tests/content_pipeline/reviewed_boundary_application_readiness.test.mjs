import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { buildArtifacts, deriveReadiness, paths, readinessByOutcome } from '../../scripts/content_pipeline/classify_reviewed_boundary_application_readiness.mjs'
import { validateReadiness } from '../../scripts/content_pipeline/validate_reviewed_boundary_application_readiness.mjs'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'

const normalizedTextSha256 = (text) => createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex')

describe('PR-0048 reviewed boundary application readiness', () => {
  it('classifies all public decisions exactly once into readiness categories', async () => {
    const { records, categoryCounts, outcomeDistribution } = await deriveReadiness()
    expect(records).toHaveLength(144)
    expect(new Set(records.map((record) => record.decision_id)).size).toBe(144)
    expect(categoryCounts).toEqual({
      'locator-mutation-contract-required': 6,
      'merge-contract-required': 53,
      'status-only-candidate': 74,
      'unresolved-not-eligible': 11,
    })
    expect(outcomeDistribution).toEqual({
      'adjust-successor-start': 6,
      'confirm-successor-start': 73,
      'exclude-structural-heading': 53,
      'retain-intro-segment': 1,
      unresolved: 11,
    })
  })

  it('keeps application-ready operations at zero and excludes unresolved by final outcome', async () => {
    const { records } = await deriveReadiness()
    expect(records.every((record) => record.application_ready === false)).toBe(true)
    const unresolved = records.filter((record) => record.final_outcome === 'unresolved')
    expect(unresolved).toHaveLength(11)
    expect(unresolved.every((record) => record.readiness_category === 'unresolved-not-eligible')).toBe(true)
    expect({ review_status: 'reviewed', final_outcome: 'unresolved', readiness_category: readinessByOutcome.unresolved }.readiness_category).toBe('unresolved-not-eligible')
  })

  it('defines only the allowed outcome classifications and leaves unknown outcomes unmapped', () => {
    expect(readinessByOutcome['confirm-successor-start']).toBe('status-only-candidate')
    expect(readinessByOutcome['retain-intro-segment']).toBe('status-only-candidate')
    expect(readinessByOutcome['adjust-successor-start']).toBe('locator-mutation-contract-required')
    expect(readinessByOutcome['exclude-structural-heading']).toBe('merge-contract-required')
    expect(readinessByOutcome.unresolved).toBe('unresolved-not-eligible')
    expect(readinessByOutcome['unknown-outcome']).toBeUndefined()
  })

  it('generates no mutating SQL and no raise_exception reference', async () => {
    const sql = await readFile(paths.readinessSql, 'utf8')
    expect(sql).not.toMatch(/\b(update|insert|delete|merge|truncate|alter|drop|create\s+function|do\s+\$|raise_exception)\b/i)
    expect(sql).toMatch(/select 'public_decisions'/i)
  })

  it('is deterministic and line-ending-independent for readiness SQL hashes', async () => {
    const first = await buildArtifacts()
    const firstHash = canonicalJsonSha256FromValue(first.plan)
    const second = await buildArtifacts()
    expect(canonicalJsonSha256FromValue(second.plan)).toBe(firstHash)
    const sql = await readFile(paths.readinessSql, 'utf8')
    const evidence = JSON.parse(await readFile(paths.evidence, 'utf8'))
    expect(evidence.artifact_hashes.readiness_inspection_sql_sha256).toBe(normalizedTextSha256(sql))
    expect(evidence.artifact_hashes.readiness_inspection_sql_sha256).toBe(normalizedTextSha256(sql.replace(/\n/g, '\r\n')))
  })

  it('validates independently without database or Supabase access', async () => {
    const result = await validateReadiness()
    expect(result.totals.application_ready_operation_count).toBe(0)
    expect(result.totals.status_only_candidate_count).toBe(74)
  })
})
