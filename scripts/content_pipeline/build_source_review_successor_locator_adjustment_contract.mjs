import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue, sha256Raw } from './hash_utils.mjs'
import { deriveReadiness, paths as readinessPaths } from './classify_reviewed_boundary_application_readiness.mjs'

export const paths = {
  contract: 'content/migration/reading-segment-source-review-successor-locator-adjustment-contract.json',
  plan: 'content/migration/reading-segment-source-review-successor-locator-adjustment-plan.json',
  evidence: 'content/migration/reading-segment-source-review-successor-locator-adjustment-evidence.json',
  missingAuthority: 'content/migration/reading-segment-source-review-successor-locator-adjustment-missing-authority.json',
  summary: 'content/migration/reports/reading-segment-source-review-successor-locator-adjustment-summary.md',
  docs: 'docs/content-pipeline/source-review-successor-locator-adjustment-contract.md',
  statusOnlyContract: 'content/migration/reading-segment-source-review-status-only-contract.json',
  statusOnlyPlan: 'content/migration/reading-segment-source-review-status-only-eligibility-plan.json',
  stagingSchema: readinessPaths.stagingSchema,
  readinessPolicy: readinessPaths.policy,
  readinessPlan: readinessPaths.plan,
  progress: readinessPaths.progress,
  historicalProgress: readinessPaths.historicalProgress,
  pr0045Current: readinessPaths.pr0045Current,
  decisionInputs: readinessPaths.decisionInputs,
  sourceInspectionPackets: 'content/migration/reading-segment-source-inspection-packets.json',
  mechanicalPolicy: readinessPaths.mechanicalPolicy,
  mechanicalPlan: 'content/migration/reading-segment-mechanical-application-plan.json',
  mechanicalEvidence: 'content/migration/reading-segment-mechanical-application-evidence.json',
}

export const requiredMissing = ['expected_current_locator','approved_replacement_locator','ordering_invariant','overlap_invariant','reconstruction_invariant','audit_requirements','rollback_behavior']
export const safetyAssertions = { executable_sql_generated: false, sql_executed: false, database_modified: false, supabase_modified: false, production_modified: false, ui_modified: false, source_text_modified: false, user_progress_modified: false, reader_sessions_modified: false, cutover_enabled: false }
const by = (a,b)=> a.book_id-b.book_id || a.segment_order-b.segment_order || a.decision_id.localeCompare(b.decision_id)
const countBy=(a,k)=>Object.fromEntries(Object.entries(a.reduce((m,x)=>{const v=x[k];m[v]=(m[v]??0)+1;return m},{})).sort())

export async function deriveLocatorAdjustmentContract() {
  const readiness = await deriveReadiness()
  const records = readiness.records.filter(r=>r.final_outcome==='adjust-successor-start').sort(by)
  if (readiness.records.length !== 144) throw new Error(`Expected 144 public decisions, found ${readiness.records.length}`)
  if (records.length !== 6) throw new Error(`Expected 6 adjust-successor-start decisions, found ${records.length}`)
  const ids = new Set(records.map(r=>r.decision_id)); if (ids.size !== records.length) throw new Error('Duplicate decision IDs')
  const tuples = new Set(records.map(r=>`${r.book_id}:${r.segment_key}:${r.segment_order}`)); if (tuples.size !== records.length) throw new Error('Duplicate current target rows')
  const decisions = JSON.parse(await readFile(records[0].source_artifact, 'utf8')).decisions
  const byId = new Map(decisions.map(d=>[d.decision_id,d]))
  const contractRecords = records.map(r=>{
    const d = byId.get(r.decision_id)
    const successorOrder = Number.isInteger(r.segment_order) ? r.segment_order + 1 : null
    const missing = [...requiredMissing]
    if (!d?.successor_segment_key) missing.unshift('successor_segment_key')
    return {
      decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id,
      current_segment_key:r.segment_key, current_segment_order:r.segment_order,
      successor_segment_key:d?.successor_segment_key ?? null, successor_segment_order:successorOrder,
      final_outcome:r.final_outcome, review_status:r.review_status, reviewer_confidence:d?.reviewer_confidence ?? null,
      source_artifact:r.source_artifact, resolution_artifact:r.resolution_artifact,
      target:{ table:'content_staging.reading_segments', row_identity:{ run_id:d?.run_id ?? readiness.progress.run_id, book_id:r.book_id, segment_key:d?.successor_segment_key ?? null, segment_order:successorOrder }, target_column:null, target_json_path:null },
      expected_current_locator:null, approved_replacement_locator:null, unchanged_locator_fields:['end_locator'],
      expected_previous_approval_status:'boundary-review', resulting_approval_status:null,
      ordering_preconditions:[], non_overlap_preconditions:[], reconstruction_preconditions:[],
      audit_event_identity:null, idempotency_identity:null, rollback_requirements:[],
      contract_completeness_status:'incomplete', missing_authority:missing
    }
  })
  const complete = contractRecords.filter(r=>r.missing_authority.length===0)
  return { readiness, records: contractRecords, complete, incomplete: contractRecords.filter(r=>r.missing_authority.length>0), outcomeDistribution: countBy(readiness.records,'final_outcome') }
}

export async function buildArtifacts() {
  const d = await deriveLocatorAdjustmentContract()
  await mkdir('content/migration/reports',{recursive:true}); await mkdir('docs/content-pipeline',{recursive:true})
  const contract = { schema_version:'pr0050-source-review-successor-locator-adjustment-contract-v1', contract_id:'reading-segment-source-review-successor-locator-adjustment-contract-pr0050', run_id:d.readiness.progress.run_id, locator_mutation_contract_approved:false, rights_status:'credited-source-edition', hash_algorithm:'sha256-canonical-json-v1', text_hash_algorithm:'sha256-normalized-lf-text-v1', authority:{ source_review_readiness:paths.readinessPlan, source_review_semantics_policy:paths.readinessPolicy, status_only_contract:paths.statusOnlyContract, status_only_plan:paths.statusOnlyPlan, staging_schema:paths.stagingSchema, source_inspection_packets:paths.sourceInspectionPackets }, result:{ application_ready_locator_decisions:0, complete_contract_records:d.complete.length, incomplete_contract_records:d.incomplete.length, executable_sql_generated:false, sql_executed:false }, target_contract:{ table:'content_staging.reading_segments', target_locator_column:'not approved; repository does not provide approved successor locator values', target_json_path:'not approved' }, authorized_mutation:null, preserved_fields:['segment key','segment order','end locator','unrelated start-locator keys','book identity','source-page identity','current segment identity','successor identity','source text','reader content','user progress','reader sessions'], preconditions:[], postconditions:[], idempotency:{ approved:false, reason:'No repeated execution contract is approved without exact current and approved locator authority.' }, rollback:{ approved:false, reason:'No rollback contract is approved without exact previous locator authority.' }, safety_assertions:safetyAssertions }
  const plan = { schema_version:'pr0050-source-review-successor-locator-adjustment-plan-v1', run_id:d.readiness.progress.run_id, locator_mutation_contract_approved:false, application_ready_locator_decisions:0, complete_contract_records:d.complete.length, incomplete_contract_records:d.incomplete.length, exact_set_equality:{ expected_adjust_successor_start_decisions:d.records.map(r=>r.decision_id), plan_decisions:d.records.map(r=>r.decision_id), missing:[], extra:[], duplicate_decision_ids:[], duplicate_target_rows:[] }, records:d.records }
  const missing = { schema_version:'pr0050-source-review-successor-locator-adjustment-missing-authority-v1', run_id:d.readiness.progress.run_id, incomplete_decision_count:d.incomplete.length, records:d.incomplete.map(r=>({decision_id:r.decision_id, book_id:r.book_id, packet_id:r.packet_id, missing_authority:r.missing_authority})) }
  const input_hashes = { immutable_historical_progress_sha256: await canonicalJsonSha256(paths.historicalProgress), archived_pr0045_pr0046_progress_snapshot_sha256: await canonicalJsonSha256(paths.pr0045Current), current_cumulative_progress_sha256: await canonicalJsonSha256(paths.progress), pr0048_readiness_policy_sha256: await canonicalJsonSha256(paths.readinessPolicy), pr0048_readiness_plan_sha256: await canonicalJsonSha256(paths.readinessPlan), pr0049_status_only_contract_sha256: await canonicalJsonSha256(paths.statusOnlyContract), pr0049_status_only_plan_sha256: await canonicalJsonSha256(paths.statusOnlyPlan), staging_schema_sha256: await sha256Raw(paths.stagingSchema), source_inspection_packets_sha256: await canonicalJsonSha256(paths.sourceInspectionPackets), mechanical_application_policy_sha256: await canonicalJsonSha256(paths.mechanicalPolicy), mechanical_application_plan_sha256: await canonicalJsonSha256(paths.mechanicalPlan), mechanical_application_evidence_sha256: await canonicalJsonSha256(paths.mechanicalEvidence) }
  for (const p of paths.decisionInputs) input_hashes[`${p.split('/').at(-1).replace('.json','').replaceAll('-','_')}_sha256`] = await canonicalJsonSha256(p)
  const evidence = { schema_version:'pr0050-source-review-successor-locator-adjustment-evidence-v1', run_id:d.readiness.progress.run_id, locator_mutation_contract_approved:false, totals:{ public_decision_count:d.readiness.records.length, adjust_successor_start_decisions:d.records.length, application_ready_locator_decisions:0, complete_contract_records:d.complete.length, incomplete_contract_records:d.incomplete.length }, outcome_distribution:d.outcomeDistribution, input_hashes, artifact_hashes:{ contract_sha256:canonicalJsonSha256FromValue(contract), plan_sha256:canonicalJsonSha256FromValue(plan), missing_authority_sha256:canonicalJsonSha256FromValue(missing) }, assertions:safetyAssertions }
  const summary = `# PR-0050 Source-Review Successor Locator Adjustment Contract\n\nLocator mutation contract approved: false.\n\nThe repository deterministically identifies six \`adjust-successor-start\` decisions, but does not provide exact current successor locators, approved replacement locators, target locator column/path authority, or enough ordering/overlap/reconstruction/audit/rollback authority to approve mutation. Application-ready locator decisions: 0. No executable SQL was generated or executed. Database, Supabase, production, UI, source text, user progress, reader sessions, and cutover state were not modified.\n\nDecision IDs: ${d.records.map(r=>r.decision_id).join(', ')}.\n`
  await writeFile(paths.contract, JSON.stringify(contract,null,2)+'\n'); await writeFile(paths.plan, JSON.stringify(plan,null,2)+'\n'); await writeFile(paths.missingAuthority, JSON.stringify(missing,null,2)+'\n'); await writeFile(paths.evidence, JSON.stringify(evidence,null,2)+'\n'); await writeFile(paths.summary, summary); await writeFile(paths.docs, summary)
  console.log(JSON.stringify(evidence.totals,null,2))
  return {contract,plan,evidence,missing,summary}
}
if (import.meta.url===`file://${process.argv[1]}`) await buildArtifacts()
