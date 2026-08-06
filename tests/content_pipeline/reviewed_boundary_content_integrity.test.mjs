import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { build, deriveContentIntegrity } from '../../scripts/content_pipeline/build_reviewed_boundary_content_integrity.mjs'
import { validate } from '../../scripts/content_pipeline/validate_reviewed_boundary_content_integrity.mjs'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { paths, artifactOrder } from '../../scripts/content_pipeline/reviewed_boundary_content_integrity_constants.mjs'
import { normalizeReviewedBoundaryContent, recomputeNormalizedContentSha256, measureReviewedBoundaryContent } from '../../scripts/content_pipeline/reviewed_boundary_content_normalization.mjs'

const clone = value => structuredClone(value)
const loadArtifacts = async () => {
  const artifacts = {}
  for (const key of [...artifactOrder, 'manifest']) artifacts[key] = JSON.parse(await readFile(paths[key], 'utf8'))
  return artifacts
}
const refresh = (artifacts, key) => { artifacts.manifest.artifact_hashes[`${key}_sha256`] = canonicalJsonSha256FromValue(artifacts[key]) }
const rejectedAfterRefresh = async mutate => {
  const artifacts = await loadArtifacts()
  const keys = mutate(artifacts)
  for (const key of keys) refresh(artifacts, key)
  await expect(validate({ artifacts })).rejects.toThrow()
}

describe('PR-0056 independent content normalization', () => {
  it('is deterministic and makes LF equivalent to CRLF', () => {
    const lf = ' Alpha  beta\n\nGamma\n'
    const crlf = ' Alpha  beta\r\n\r\nGamma\r\n'
    expect(normalizeReviewedBoundaryContent(lf)).toBe('Alpha beta\n\nGamma\n')
    expect(recomputeNormalizedContentSha256(lf)).toBe(recomputeNormalizedContentSha256(crlf))
  })
  it('normalizes Unicode to NFC and non-breaking spaces to spaces', () => {
    expect(normalizeReviewedBoundaryContent('Cafe\u0301\u00a0texto')).toBe('Café texto\n')
    expect(recomputeNormalizedContentSha256('Cafe\u0301')).toBe(recomputeNormalizedContentSha256('Café'))
  })
  it('defines trailing whitespace and blank-line behavior', () => {
    expect(normalizeReviewedBoundaryContent('\n A  \n\n\n\n B\t \n\n')).toBe('A\n\nB\n')
  })
  it('detects changed content with identical byte length and word count', () => {
    const first = measureReviewedBoundaryContent('red fox')
    const second = measureReviewedBoundaryContent('red box')
    expect(first.content_byte_length).toBe(second.content_byte_length)
    expect(first.word_count).toBe(second.word_count)
    expect(first.recomputed_normalized_content_sha256).not.toBe(second.recomputed_normalized_content_sha256)
  })
  it('detects a stale stored digest', () => {
    const stale = recomputeNormalizedContentSha256('old value')
    expect(measureReviewedBoundaryContent('new value', stale).stored_digest_matches_recomputed).toBe(false)
    expect(measureReviewedBoundaryContent('old value', stale).stored_digest_matches_recomputed).toBe(true)
  })
  it('keeps unavailable content and verification null', () => {
    expect(measureReviewedBoundaryContent(null, 'a'.repeat(64))).toEqual({recomputed_normalized_content_sha256:null,stored_normalized_content_sha256:'a'.repeat(64),stored_digest_matches_recomputed:null,content_byte_length:null,normalized_content_length:null,word_count:null})
  })
})

describe('PR-0056 closed-world integrity validation', () => {
  it('independently validates 74 targets and blocked readiness', async () => {
    await expect(validate()).resolves.toMatchObject({ valid: true, target_count: 74, validator_imports_builder_functions: false })
    const { evidence, targets, drift } = await deriveContentIntegrity()
    expect(targets.records).toHaveLength(74)
    expect(targets.records.every(record => record.recomputed_normalized_content_sha256 === null && record.stored_digest_matches_recomputed === null && !record.baseline_complete)).toBe(true)
    expect(drift.classifications.STORED_CONTENT_DIGEST_MISMATCH).toMatchObject({ blocks_execution: true, blocks_rollback: true })
    expect(evidence).toMatchObject({ source_snapshot_complete:false, source_snapshot_verified:false, application_preflight_ready:false, rollback_baseline_ready:false, content_integrity_authority_approved:false })
  })
  for (const [name, mutate] of [
    ['segment_order', a => { a.targets.records[0].segment_order++; return ['targets'] }],
    ['previous status', a => { a.targets.records[0].current_approval_status='draft'; return ['targets'] }],
    ['intended status', a => { a.targets.records[0].intended_resulting_approval_status='approved'; return ['targets'] }],
    ['decision_id', a => { a.targets.records[0].decision_id='unauthorized-decision'; return ['targets'] }],
    ['target identity', a => { a.targets.records[0].segment_key='f'.repeat(24); return ['targets'] }],
    ['removed target', a => { a.targets.records.pop(); a.targets.target_count--; return ['targets'] }],
    ['unauthorized extra target', a => { a.targets.records.push({...clone(a.targets.records[0]),decision_id:'unauthorized-extra'}); a.targets.target_count++; return ['targets'] }],
    ['targets/snapshot disagreement', a => { a.snapshot.records[0].segment_order++; return ['snapshot'] }],
    ['targets/rollback disagreement', a => { a.rollback.records[0].original_approval_status='draft'; return ['rollback'] }],
    ['targets/audit disagreement', a => { a.compatibility.records[0].application_event_key='0'.repeat(64); return ['compatibility'] }],
  ]) it(`rejects refreshed hashes after ${name} corruption`, async () => rejectedAfterRefresh(mutate))
  it('produces no diff on a repeated build', async () => {
    await build(); const first = await Promise.all(Object.values(paths).filter(path => path.endsWith('.json')).map(path => readFile(path,'utf8')))
    await build(); const second = await Promise.all(Object.values(paths).filter(path => path.endsWith('.json')).map(path => readFile(path,'utf8')))
    expect(second).toEqual(first)
  })
})
