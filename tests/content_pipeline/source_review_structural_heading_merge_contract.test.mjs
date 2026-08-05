import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { deriveStructuralHeadingMergeContract, paths, requiredMissing } from '../../scripts/content_pipeline/build_source_review_structural_heading_merge_contract.mjs'
import { inputHashFieldToPath, validateArtifacts } from '../../scripts/content_pipeline/validate_source_review_structural_heading_merge_contract.mjs'

const clone = (v) => JSON.parse(JSON.stringify(v))
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'))
const readArtifacts = async () => ({
  contract: await readJson(paths.contract),
  plan: await readJson(paths.plan),
  evidence: await readJson(paths.evidence),
  missing: await readJson(paths.missingAuthority),
  operationModels: await readJson(paths.operationModels),
  summary: await readFile(paths.summary, 'utf8'),
  docs: await readFile(paths.docs, 'utf8'),
})
const rehash = (a, keys = ['contract', 'plan', 'missing', 'operationModels']) => {
  if (keys.includes('contract')) a.evidence.artifact_hashes.contract_sha256 = canonicalJsonSha256FromValue(a.contract)
  if (keys.includes('plan')) a.evidence.artifact_hashes.plan_sha256 = canonicalJsonSha256FromValue(a.plan)
  if (keys.includes('missing')) a.evidence.artifact_hashes.missing_authority_sha256 = canonicalJsonSha256FromValue(a.missing)
  if (keys.includes('operationModels')) a.evidence.artifact_hashes.operation_models_sha256 = canonicalJsonSha256FromValue(a.operationModels)
}
const rejectMutation = async (mutate, rehashKeys = []) => { const a = await readArtifacts(); mutate(a); rehash(a, rehashKeys); await expect(validateArtifacts(a)).rejects.toThrow() }

describe('PR-0051 structural heading merge contract', () => {
  it('derives and validates exactly 53 incomplete exclude-structural-heading decisions', async () => {
    const d = await deriveStructuralHeadingMergeContract()
    expect(d.records).toHaveLength(53)
    expect(new Set(d.records.map(r=>r.decision_id)).size).toBe(53)
    expect(d.records.every(r=>r.final_outcome === 'exclude-structural-heading')).toBe(true)
    expect(d.records.every(r=>r.application_ready === false && r.operation_completeness_status === 'incomplete')).toBe(true)
    await expect(validateArtifacts(await readArtifacts())).resolves.toMatchObject({ exact_set_equality:true, missing_authority_exact_equality:true, operation_models_exact_equality:true, hash_mapping_exact_equality:true, successor_conflicts:false })
  })
  it('preserves semantic set equality for reordered valid records', async () => {
    const a = await readArtifacts(); a.plan.records = [...a.plan.records].reverse(); rehash(a, ['plan']); await expect(validateArtifacts(a)).resolves.toBeTruthy()
  })
  it('rejects exact missing-authority register drift', async () => {
    await rejectMutation(a=>{ a.missing.records[1] = clone(a.missing.records[0]) }, ['missing'])
    await rejectMutation(a=>{ a.missing.records.pop() }, ['missing'])
    await rejectMutation(a=>{ a.missing.records.push({ ...clone(a.missing.records[0]), decision_id:'extra' }) }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].book_id = 99 }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].packet_id = 'wrong' }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].heading_segment_key = 'wrong' }, ['missing'])
    await rejectMutation(a=>{ a.missing.records.find(r=>r.successor_segment_key).successor_segment_key = 'wrong' }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].missing_authority.pop() }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].missing_authority.push(a.missing.records[0].missing_authority[0]) }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].missing_authority.push('unexpected_reason') }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].application_ready = true }, ['missing'])
    await rejectMutation(a=>{ a.missing.records[0].operation_completeness_status = 'complete' }, ['missing'])
  })
  it('rejects exact operation-model drift', async () => {
    await rejectMutation(a=>{ a.operationModels.rejected_operation_models[1] = clone(a.operationModels.rejected_operation_models[0]) }, ['operationModels'])
    await rejectMutation(a=>{ a.operationModels.rejected_operation_models.pop() }, ['operationModels'])
    await rejectMutation(a=>{ a.operationModels.rejected_operation_models.push({ model:'extra-model', approved:false, reason:'not supported' }) }, ['operationModels'])
    await rejectMutation(a=>{ a.operationModels.rejected_operation_models[0].model = 'changed-model' }, ['operationModels'])
    await rejectMutation(a=>{ a.operationModels.rejected_operation_models[0].reason = '' }, ['operationModels'])
    await rejectMutation(a=>{ a.operationModels.supported_operation_models = ['A-soft-exclusion'] }, ['operationModels'])
    await rejectMutation(a=>{ a.operationModels.rejected_operation_models[0].approved = true }, ['operationModels'])
    await rejectMutation(a=>{ a.operationModels.rejected_operation_models[0].application_ready = true }, ['operationModels'])
  })
  it('rejects recorded hash field-to-path mapping drift and stale hashes', async () => {
    await rejectMutation(a=>{ delete a.evidence.input_hash_field_to_path.pr0050_locator_contract_sha256 })
    await rejectMutation(a=>{ a.evidence.input_hash_field_to_path.extra_sha256 = 'content/migration/reading-segment-source-review-progress.json' })
    await rejectMutation(a=>{ a.evidence.input_hash_field_to_path.renamed_pr0050_locator_contract_sha256 = a.evidence.input_hash_field_to_path.pr0050_locator_contract_sha256; delete a.evidence.input_hash_field_to_path.pr0050_locator_contract_sha256 })
    await rejectMutation(a=>{ const x=a.evidence.input_hash_field_to_path.pr0050_locator_contract_sha256; a.evidence.input_hash_field_to_path.pr0050_locator_contract_sha256=a.evidence.input_hash_field_to_path.staging_schema_sha256; a.evidence.input_hash_field_to_path.staging_schema_sha256=x })
    await rejectMutation(a=>{ a.evidence.input_hash_field_to_path.pr0050_locator_contract_sha256 = inputHashFieldToPath.pr0050_locator_plan_sha256 })
    await rejectMutation(a=>{ a.evidence.input_hash_field_to_path.staging_schema_sha256 = inputHashFieldToPath.reader_reference_authority_sha256 })
    await rejectMutation(a=>{ a.evidence.input_hash_field_to_path.reader_reference_authority_sha256 = inputHashFieldToPath.staging_schema_sha256 })
    await rejectMutation(a=>{ a.evidence.input_hashes.pr0050_locator_contract_sha256 = 'bad' })
  })
  it('rejects total and contract semantics drift', async () => {
    for (const [artifact, path] of [['evidence','totals'], ['plan', null], ['contract','result']]) {
      for (const key of ['application_ready_merge_decisions','complete_operation_records','incomplete_operation_records']) await rejectMutation(a=>{ const target = path ? a[artifact][path] : a[artifact]; target[key] = target[key] + 1 }, [artifact === 'contract' ? 'contract' : artifact === 'plan' ? 'plan' : undefined].filter(Boolean))
    }
    await rejectMutation(a=>{ a.evidence.totals.public_decision_count = 143 })
    await rejectMutation(a=>{ a.evidence.totals.exclude_structural_heading_decisions = 52 })
    await rejectMutation(a=>{ a.plan.records[0].application_ready = true }, ['plan'])
    await rejectMutation(a=>{ a.plan.records[0].operation_completeness_status = 'complete' }, ['plan'])
    await rejectMutation(a=>{ a.contract.structural_heading_merge_contract_approved = true }, ['contract'])
    await rejectMutation(a=>{ a.contract.rights_status = 'blocked' }, ['contract'])
    await rejectMutation(a=>{ a.contract.authorized_mutation = { operation:'delete' } }, ['contract'])
    await rejectMutation(a=>{ a.contract.changed_fields = ['source text'] }, ['contract'])
    await rejectMutation(a=>{ a.contract.preconditions = ['x'] }, ['contract'])
    await rejectMutation(a=>{ a.contract.postconditions = ['x'] }, ['contract'])
    await rejectMutation(a=>{ a.contract.idempotency.approved = true }, ['contract'])
    await rejectMutation(a=>{ a.contract.rollback.approved = true }, ['contract'])
    await rejectMutation(a=>{ a.contract.preserved_fields.pop() }, ['contract'])
    await rejectMutation(a=>{ a.contract.preserved_fields.push(a.contract.preserved_fields[0]) }, ['contract'])
    await rejectMutation(a=>{ a.contract.preserved_fields.push('extra') }, ['contract'])
    await rejectMutation(a=>{ a.contract.safety_assertions.sql_executed = true }, ['contract'])
  })
  it('rejects successor-target conflicts and unsupported operation claims', async () => {
    await rejectMutation(a=>{ const r=a.plan.records.find(x=>x.successor_row_identity); const s=a.plan.records.find(x=>x.successor_row_identity && x.decision_id!==r.decision_id); s.successor_segment_key=r.successor_segment_key; s.successor_segment_order=r.successor_segment_order; s.successor_row_identity=clone(r.successor_row_identity) }, ['plan'])
    await rejectMutation(a=>{ const r=a.plan.records.find(x=>x.successor_row_identity); r.successor_segment_key=r.current_heading_segment_key; r.successor_row_identity.segment_key=r.current_heading_segment_key }, ['plan'])
    await rejectMutation(a=>{ const r=a.plan.records.find(x=>x.successor_row_identity); r.predecessor_segment_order=r.heading_segment_order }, ['plan'])
    await rejectMutation(a=>{ const r=a.plan.records.find(x=>x.successor_row_identity); r.successor_segment_order=r.heading_segment_order; r.successor_row_identity.segment_order=r.heading_segment_order }, ['plan'])
    await rejectMutation(a=>{ const r=a.plan.records.find(x=>x.successor_row_identity); r.successor_row_identity.book_id=99 }, ['plan'])
    await rejectMutation(a=>{ const r=a.plan.records.find(x=>x.successor_row_identity); const h=a.plan.records.find(x=>x.decision_id!==r.decision_id); r.successor_segment_key=h.current_heading_segment_key; r.successor_segment_order=h.heading_segment_order; r.successor_row_identity={...r.successor_row_identity, segment_key:h.current_heading_segment_key, segment_order:h.heading_segment_order} }, ['plan'])
    await rejectMutation(a=>{ a.summary='UPDATE content_staging.reading_segments set source_text = source_text' })
  })
  it('keeps required missing-authority reasons and canonical hashes stable for formatting clones', async () => {
    const d = await deriveStructuralHeadingMergeContract()
    expect(d.records.every(r => requiredMissing.every(m => r.missing_authority.includes(m)))).toBe(true)
    expect(canonicalJsonSha256FromValue(clone(d.records))).toBe(canonicalJsonSha256FromValue(JSON.parse(JSON.stringify(d.records, null, 4))))
  })
})
