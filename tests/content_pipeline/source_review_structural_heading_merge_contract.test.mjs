import { describe, expect, it } from 'vitest'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { deriveStructuralHeadingMergeContract, requiredMissing } from '../../scripts/content_pipeline/build_source_review_structural_heading_merge_contract.mjs'
import { validateArtifacts } from '../../scripts/content_pipeline/validate_source_review_structural_heading_merge_contract.mjs'

const clone = (v) => JSON.parse(JSON.stringify(v))
const makeArtifacts = async () => {
  const d = await deriveStructuralHeadingMergeContract()
  const operationModels = { supported_operation_models: [], rejected_operation_models: [{}, {}, {}, {}, {}] }
  const contract = { structural_heading_merge_contract_approved: false, result: { application_ready_merge_decisions: 0 }, authorized_mutation: null, safety_assertions: Object.fromEntries(['executable_sql_generated','sql_executed','database_modified','supabase_modified','production_modified','ui_modified','source_text_modified','user_progress_modified','reader_sessions_modified','bookmarks_modified','notes_modified','highlights_modified','cutover_enabled'].map(k=>[k,false])) }
  const plan = { structural_heading_merge_contract_approved: false, application_ready_merge_decisions: 0, records: d.records }
  const missing = { records: d.records.map(r=>({ decision_id:r.decision_id, missing_authority:r.missing_authority })) }
  const evidence = { structural_heading_merge_contract_approved: false, totals: { public_decision_count:144, exclude_structural_heading_decisions:53, application_ready_merge_decisions:0, complete_operation_records:0, incomplete_operation_records:53 }, outcome_distribution: d.outcomeDistribution, input_hashes: {}, artifact_hashes: {}, assertions: contract.safety_assertions }
  const { inputHashFieldToPath } = await import('../../scripts/content_pipeline/validate_source_review_structural_heading_merge_contract.mjs')
  const { canonicalJsonSha256, sha256Raw } = await import('../../scripts/content_pipeline/hash_utils.mjs')
  for (const [k,p] of Object.entries(inputHashFieldToPath)) evidence.input_hashes[k] = p.endsWith('.sql')||p.endsWith('.ts') ? await sha256Raw(p) : await canonicalJsonSha256(p)
  evidence.artifact_hashes = { contract_sha256: canonicalJsonSha256FromValue(contract), plan_sha256: canonicalJsonSha256FromValue(plan), missing_authority_sha256: canonicalJsonSha256FromValue(missing), operation_models_sha256: canonicalJsonSha256FromValue(operationModels) }
  return { contract, plan, evidence, missing, operationModels, summary: 'safe summary', docs: 'safe docs' }
}

describe('PR-0051 structural heading merge contract', () => {
  it('derives exactly 53 incomplete exclude-structural-heading decisions', async () => {
    const d = await deriveStructuralHeadingMergeContract()
    expect(d.records).toHaveLength(53)
    expect(new Set(d.records.map(r=>r.decision_id)).size).toBe(53)
    expect(d.records.every(r=>r.final_outcome === 'exclude-structural-heading')).toBe(true)
    expect(d.records.every(r=>r.application_ready === false && r.operation_completeness_status === 'incomplete')).toBe(true)
  })
  it('validates exact set equality and rejects reordered semantic drift cases', async () => {
    const a = await makeArtifacts(); await expect(validateArtifacts(a)).resolves.toMatchObject({ exact_set_equality:true, approved:false, incomplete:53 })
    const reordered = clone(a); reordered.plan.records = [...reordered.plan.records].reverse(); reordered.evidence.artifact_hashes.plan_sha256 = canonicalJsonSha256FromValue(reordered.plan); await expect(validateArtifacts(reordered)).resolves.toBeTruthy()
  })
  it('rejects duplicate, missing, conflicting, unsupported, partial, and leakage states', async () => {
    for (const mutate of [
      x=>x.plan.records.push(clone(x.plan.records[0])),
      x=>{x.plan.records[0].current_heading_segment_key=x.plan.records[1].current_heading_segment_key; x.plan.records[0].heading_segment_order=x.plan.records[1].heading_segment_order},
      x=>{x.plan.records[0].successor_segment_key=null; x.plan.records[0].missing_authority=[]},
      x=>{x.plan.records[0].operation_model='D-physical-segment-merge'},
      x=>{x.plan.records[0].changed_fields=['source_text']},
      x=>{x.plan.records[0].changed_fields=['fabricated_merged_text']},
      x=>{x.plan.records[0].locator_behavior='mutate start_locator'},
      x=>{x.plan.records[0].segment_key_behavior='delete/remap identity'},
      x=>{x.plan.records[0].segment_order_behavior='change order'},
      x=>{x.plan.records[0].editorial_node_behavior='modify editorial_nodes'},
      x=>{x.plan.records[0].user_progress_remapping_behavior='remap user_progress'},
      x=>{x.plan.records[0].reader_session_behavior='remap reader_sessions'},
      x=>{x.plan.records[0].bookmark_note_highlight_behavior='remap bookmarks notes highlights'},
      x=>{x.contract.structural_heading_merge_contract_approved=true},
      x=>{x.plan.records[0].final_outcome='unresolved'},
      x=>{x.missing.records=[]},
      x=>{x.summary='UPDATE content_staging.reading_segments set source_text = source_text'},
      x=>{x.evidence.input_hashes[Object.keys(x.evidence.input_hashes)[0]]='bad'},
    ]) { const a=await makeArtifacts(); mutate(a); await expect(validateArtifacts(a)).rejects.toThrow() }
  })
  it('keeps required missing-authority reasons and canonical hashes stable for formatting clones', async () => {
    const d = await deriveStructuralHeadingMergeContract()
    expect(d.records.every(r => requiredMissing.every(m => r.missing_authority.includes(m)))).toBe(true)
    expect(canonicalJsonSha256FromValue(clone(d.records))).toBe(canonicalJsonSha256FromValue(JSON.parse(JSON.stringify(d.records, null, 4))))
  })
})
