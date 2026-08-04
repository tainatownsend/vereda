import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { derivePackage, outcomeToOperationType, paths } from '../../scripts/content_pipeline/build_reviewed_boundary_application_package.mjs'
import { validateReviewedBoundaryApplicationPackage } from '../../scripts/content_pipeline/validate_reviewed_boundary_application_package.mjs'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'

const normalizedTextSha256 = (text) => createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex')

describe('PR-0048 reviewed boundary application package', () => {
  it('derives deterministic eligible and unresolved decision sets', async () => {
    const first = await derivePackage()
    const second = await derivePackage()
    expect(canonicalJsonSha256FromValue(first.operations)).toBe(canonicalJsonSha256FromValue(second.operations))
    expect(first.finalDecisions).toHaveLength(144)
    expect(first.resolved).toHaveLength(133)
    expect(first.unresolved).toHaveLength(11)
    expect(first.operations).toHaveLength(133)
  })

  it('maps every public outcome to the expected operation or exclusion', async () => {
    const { finalDecisions, operations, unresolved } = await derivePackage()
    const operationDistribution = operations.reduce((counts, operation) => ({
      ...counts,
      [operation.operation_type]: (counts[operation.operation_type] ?? 0) + 1,
    }), {})
    const outcomeDistribution = finalDecisions.reduce((counts, decision) => ({
      ...counts,
      [decision.final_outcome]: (counts[decision.final_outcome] ?? 0) + 1,
    }), {})

    expect(outcomeToOperationType['confirm-successor-start']).toBe('confirm_successor_start')
    expect(outcomeToOperationType['adjust-successor-start']).toBe('adjust_successor_start')
    expect(outcomeToOperationType['merge-with-successor']).toBe('merge_with_successor')
    expect(outcomeToOperationType['exclude-structural-heading']).toBe('merge_with_successor')
    expect(outcomeToOperationType['retain-intro-segment']).toBe('confirm_successor_start')
    expect(outcomeToOperationType['unknown-outcome']).toBeUndefined()

    expect(outcomeDistribution).toMatchObject({
      'confirm-successor-start': 73,
      'adjust-successor-start': 6,
      'exclude-structural-heading': 53,
      'retain-intro-segment': 1,
      unresolved: 11,
    })
    expect(operationDistribution).toEqual({
      adjust_successor_start: 6,
      confirm_successor_start: 74,
      merge_with_successor: 53,
    })
    expect(operations).toHaveLength(finalDecisions.length - unresolved.length)
  })

  it('has unique scoped operations with source and successor identities', async () => {
    const { operations } = await derivePackage()
    expect(new Set(operations.map((operation) => operation.operation_id)).size).toBe(operations.length)
    expect(new Set(operations.map((operation) => `${operation.book_id}:${operation.segment_key}`)).size).toBe(operations.length)
    for (const operation of operations) {
      expect(operation.segment_key).toBeTruthy()
      expect(operation.successor_segment_key).toBeTruthy()
      expect(operation.successor_segment_order).toBeGreaterThan(operation.segment_order)
    }
  })

  it('keeps unresolved decisions out of SQL and avoids production/Supabase/credential references', async () => {
    const [{ unresolved }, applicationSql, preApplySql, postApplySql] = await Promise.all([
      derivePackage(), readFile(paths.applicationSql, 'utf8'), readFile(paths.preApplySql, 'utf8'), readFile(paths.postApplySql, 'utf8'),
    ])
    for (const decision of unresolved) expect(applicationSql).not.toContain(decision.final_decision_id)
    for (const sql of [applicationSql, preApplySql, postApplySql]) {
      expect(sql).toContain('content_staging.reading_segments')
      expect(sql).not.toMatch(/production|prod_|supabase\.co|service_role|anon_key|password|secret/i)
    }
  })

  it('guards duplicate application and preserves line-ending-independent SQL hashes', async () => {
    const [applicationSql, evidenceText] = await Promise.all([readFile(paths.applicationSql, 'utf8'), readFile(paths.evidence, 'utf8')])
    const evidence = JSON.parse(evidenceText)
    expect(applicationSql).toContain('not-already-applied')
    expect(applicationSql).toContain('event_type = \'pr0048-reviewed-boundary-operation-applied\'')
    expect(evidence.artifact_hashes.generated_application_sql_sha256).toBe(normalizedTextSha256(applicationSql))
    expect(evidence.artifact_hashes.generated_application_sql_sha256).toBe(normalizedTextSha256(applicationSql.replace(/\n/g, '\r\n')))
  })

  it('validates independently without database or network access', async () => {
    const result = await validateReviewedBoundaryApplicationPackage()
    expect(result.publicDecisionCount).toBe(144)
    expect(result.expectedSqlOperationCount).toBe(133)
  })
})
