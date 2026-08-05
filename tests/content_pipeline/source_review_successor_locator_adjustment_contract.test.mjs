import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { buildArtifacts, deriveLocatorAdjustmentContract, paths } from '../../scripts/content_pipeline/build_source_review_successor_locator_adjustment_contract.mjs'
import { validateArtifacts } from '../../scripts/content_pipeline/validate_source_review_successor_locator_adjustment_contract.mjs'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
const clone = (v) => JSON.parse(JSON.stringify(v))
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'))
const fixture = async () => ({ contract: await readJson(paths.contract), plan: await readJson(paths.plan), evidence: await readJson(paths.evidence), missing: await readJson(paths.missingAuthority), summary: await readFile(paths.summary, 'utf8'), docs: await readFile(paths.docs, 'utf8') })
const rejects = async (base, mutate) => { const bad = clone(base); mutate(bad); await expect(validateArtifacts(bad)).rejects.toThrow() }

describe('PR-0050 successor locator adjustment contract', () => {
  it('derives exactly six adjust-successor-start decisions and excludes all other outcomes', async () => {
    const d = await deriveLocatorAdjustmentContract()
    expect(d.records.map((r) => r.decision_id)).toEqual(['e473600ca608d57db6a3ea23','e5017ea69081bdcd0c70da11','df9c53a270eea25a6c52bab4','aae34d255521a908694e178e','1961a13f1508773d5a7a233c','06af1c2475d97f65669d306a'])
    expect(d.incomplete).toHaveLength(6); expect(d.complete).toHaveLength(0)
  })
  it('validates generated artifacts, order-independent set equality, and recomputed totals', async () => {
    await buildArtifacts()
    const args = await fixture()
    await expect(validateArtifacts(args)).resolves.toMatchObject({ decision_count: 6, approved: false, exact_set_equality: true, incomplete: 6 })
    const reordered = clone(args); reordered.plan.records.reverse(); reordered.evidence.artifact_hashes.plan_sha256 = canonicalJsonSha256FromValue(reordered.plan)
    await expect(validateArtifacts(reordered)).resolves.toMatchObject({ exact_set_equality: true })
  })
  it('rejects decision-set and target-row problems without depending on array order', async () => {
    const args = await fixture()
    await rejects(args, (a) => { a.plan.records[1].decision_id = a.plan.records[0].decision_id })
    await rejects(args, (a) => { a.plan.records.pop() })
    await rejects(args, (a) => { a.plan.records[0].decision_id = 'extra' })
    await rejects(args, (a) => { a.plan.records[1].successor_segment_key = a.plan.records[0].successor_segment_key; a.plan.records[1].book_id = a.plan.records[0].book_id; a.plan.records[1].successor_segment_order = a.plan.records[0].successor_segment_order })
  })
  it('rejects per-record field drift from independent derivation', async () => {
    const args = await fixture(); const i = 0
    for (const mutate of [
      (r) => { r.book_id = 99 }, (r) => { r.packet_id = 'changed' }, (r) => { r.current_segment_key = 'changed' },
      (r) => { r.successor_segment_key = 'changed' }, (r) => { r.successor_segment_order = r.current_segment_order },
      (r) => { r.target.table = 'other' }, (r) => { r.contract_completeness_status = 'complete' }, (r) => { r.application_ready = true },
      (r) => { r.expected_current_locator = { source_pdf_page: 1, char_start: 1, char_end: 2 } }, (r) => { r.approved_replacement_locator = { source_pdf_page: 1, char_start: 1, char_end: 2 } },
      (r) => { r.target.target_column = 'start_locator' },
    ]) await rejects(args, (a) => mutate(a.plan.records[i]))
  })
  it('rejects missing-authority register mismatches exactly', async () => {
    const args = await fixture()
    await rejects(args, (a) => { a.missing.records[1] = clone(a.missing.records[0]) })
    await rejects(args, (a) => { a.missing.records[0].missing_authority.pop() })
    await rejects(args, (a) => { a.missing.records[0].missing_authority.push('unsupported_reason') })
    await rejects(args, (a) => { a.missing.records[0].packet_id = 'changed' })
    await rejects(args, (a) => { a.missing.records[0].decision_id = 'changed' })
  })
  it('rejects hash key-set and value integrity problems', async () => {
    const args = await fixture(); const keys = Object.keys(args.evidence.input_hashes)
    await rejects(args, (a) => { delete a.evidence.input_hashes[keys[0]] })
    await rejects(args, (a) => { a.evidence.input_hashes.extra_hash = '0'.repeat(64) })
    await rejects(args, (a) => { a.evidence.input_hashes[`${keys[0]}_renamed`] = a.evidence.input_hashes[keys[0]]; delete a.evidence.input_hashes[keys[0]] })
    await rejects(args, (a) => { const x=a.evidence.input_hashes[keys[0]]; a.evidence.input_hashes[keys[0]]=a.evidence.input_hashes[keys[1]]; a.evidence.input_hashes[keys[1]]=x })
    await rejects(args, (a) => { a.evidence.input_hashes.source_inspection_packets_sha256 = '0'.repeat(64) })
    await rejects(args, (a) => { a.evidence.input_hashes.staging_schema_sha256 = '0'.repeat(64) })
    await rejects(args, (a) => { a.evidence.input_hashes.pr0049_status_only_contract_sha256 = '0'.repeat(64) })
    await rejects(args, (a) => { a.evidence.artifact_hashes.contract_sha256 = '0'.repeat(64) })
  })
  it('rejects contract-result semantic drift, mutating SQL, leakage flags, and stale totals', async () => {
    const args = await fixture()
    for (const mutate of [
      (a) => { a.evidence.totals.public_decision_count = 143 }, (a) => { a.evidence.outcome_distribution.unresolved = 10 },
      (a) => { a.contract.authorized_mutation = {} }, (a) => { a.contract.target_contract.target_locator_column = 'start_locator' },
      (a) => { a.contract.preconditions = ['x'] }, (a) => { a.contract.idempotency.approved = true }, (a) => { a.contract.rollback.approved = true },
      (a) => { a.contract.rights_status = 'blocked' }, (a) => { a.contract.safety_assertions.database_modified = true },
      (a) => { a.summary += '\nupdate reading_segments set start_locator = null;' }, (a) => { a.contract.source_text_included = true },
    ]) await rejects(args, mutate)
  })
  it('canonical hashes change on semantic JSON changes but not formatting-only rewrites', async () => {
    const plan = await readJson(paths.plan)
    expect(canonicalJsonSha256FromValue(plan)).toEqual(canonicalJsonSha256FromValue(JSON.parse(JSON.stringify(plan, null, 8))))
    const changed = clone(plan); changed.records[0].packet_id = 'changed'
    expect(canonicalJsonSha256FromValue(changed)).not.toEqual(canonicalJsonSha256FromValue(plan))
  })
})
