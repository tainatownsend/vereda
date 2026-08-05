import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue, sha256Raw } from './hash_utils.mjs'
import { deriveReadiness, paths as readinessPaths } from './classify_reviewed_boundary_application_readiness.mjs'

export const paths = {
  contract:'content/migration/reading-segment-source-review-structural-heading-merge-contract.json',
  plan:'content/migration/reading-segment-source-review-structural-heading-merge-plan.json',
  evidence:'content/migration/reading-segment-source-review-structural-heading-merge-evidence.json',
  missingAuthority:'content/migration/reading-segment-source-review-structural-heading-merge-missing-authority.json',
  operationModels:'content/migration/reading-segment-source-review-structural-heading-operation-models.json',
  summary:'content/migration/reports/reading-segment-source-review-structural-heading-merge-summary.md',
  docs:'docs/content-pipeline/source-review-structural-heading-merge-contract.md',
  statusOnlyContract:'content/migration/reading-segment-source-review-status-only-contract.json',
  statusOnlyPlan:'content/migration/reading-segment-source-review-status-only-eligibility-plan.json',
  locatorContract:'content/migration/reading-segment-source-review-successor-locator-adjustment-contract.json',
  locatorPlan:'content/migration/reading-segment-source-review-successor-locator-adjustment-plan.json',
  locatorEvidence:'content/migration/reading-segment-source-review-successor-locator-adjustment-evidence.json',
  locatorMissingAuthority:'content/migration/reading-segment-source-review-successor-locator-adjustment-missing-authority.json',
  sourceInspectionPackets:'content/migration/reading-segment-source-inspection-packets.json',
  stagingSchema:readinessPaths.stagingSchema,
  readinessPolicy:readinessPaths.policy,
  readinessPlan:readinessPaths.plan,
  progress:readinessPaths.progress,
  historicalProgress:readinessPaths.historicalProgress,
  pr0045Current:readinessPaths.pr0045Current,
  mechanicalPolicy:readinessPaths.mechanicalPolicy,
  mechanicalPlan:'content/migration/reading-segment-mechanical-application-plan.json',
  mechanicalEvidence:'content/migration/reading-segment-mechanical-application-evidence.json',
  reconstructionPlan:'content/reconstruction/reports/reconstruction-plan-summary.json',
  editorialNodePlan:'content/migration/editorial-node-load-manifest.json',
  readerReferenceAuthority:'supabase/audits/content_staging_post_apply_verification.sql',
  decisionInputs:readinessPaths.decisionInputs,
  recoveryConsolidation:readinessPaths.recoveryConsolidation,
  book3Manual:readinessPaths.book3Manual,
  remainingManual:readinessPaths.remainingManual,
}
export const requiredMissing = ['exact_operation_type','target_table_and_fields','heading_retention_state','heading_visibility_field','successor_mutation_rule','predecessor_mutation_rule','locator_preservation_or_adjustment_rule','segment_order_rule','segment_key_stability_rule','editorial_node_generation_rule','reader_reconstruction_exclusion_rule','gap_overlap_duplication_invariant','user_progress_reference_safety','reader_session_reference_safety','bookmark_note_highlight_reference_safety','audit_event_contract','idempotency_contract','rollback_contract']
export const safetyAssertions = { executable_sql_generated:false, sql_executed:false, database_modified:false, supabase_modified:false, production_modified:false, ui_modified:false, source_text_modified:false, user_progress_modified:false, reader_sessions_modified:false, bookmarks_modified:false, notes_modified:false, highlights_modified:false, cutover_enabled:false }
const readJson=async p=>JSON.parse(await readFile(p,'utf8'))
const by=(a,b)=>a.book_id-b.book_id||a.heading_segment_order-b.heading_segment_order||a.decision_id.localeCompare(b.decision_id)
const dist=(a,k)=>Object.fromEntries(Object.entries(a.reduce((m,x)=>{const v=x[k];m[v]=(m[v]??0)+1;return m},{})).sort())
const publicId=d=>d.decision_id??d.same_page_decision_id

export async function deriveStructuralHeadingMergeContract(){
 const readiness=await deriveReadiness(); if(readiness.records.length!==144) throw new Error(`Expected 144 public decisions, found ${readiness.records.length}`)
 const all=[]; for(const p of paths.decisionInputs){const j=await readJson(p); for(const d of j.decisions??[]) all.push({...d, source_artifact:p})}
 const byId=new Map(all.map(d=>[publicId(d),d])); const records=readiness.records.filter(r=>r.final_outcome==='exclude-structural-heading').map(r=>{
  const d=byId.get(r.decision_id); const predOrder=Number.isInteger(r.segment_order)?r.segment_order-1:null; const succKey=d?.successor_segment_key??null; const succOrder=succKey && Number.isInteger(r.segment_order)?r.segment_order+1:null
  const missing=[...requiredMissing]; if(!succKey) missing.unshift('successor_segment_key');
  return { decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id, current_heading_segment_key:r.segment_key, heading_segment_order:r.segment_order, predecessor_segment_key:null, predecessor_segment_order:predOrder, successor_segment_key:succKey, successor_segment_order:succOrder, final_outcome:r.final_outcome, review_status:r.review_status, reviewer_confidence:d?.reviewer_confidence??null, source_artifact:r.source_artifact, resolution_artifact:r.resolution_artifact, heading_row_identity:{table:'content_staging.reading_segments', run_id:d?.run_id??readiness.progress.run_id, book_id:r.book_id, segment_key:r.segment_key, segment_order:r.segment_order}, successor_row_identity:succKey?{table:'content_staging.reading_segments', run_id:d?.run_id??readiness.progress.run_id, book_id:r.book_id, segment_key:succKey, segment_order:succOrder}:null, predecessor_row_identity:null, authorized_operation_type:null, operation_model:'none-approved', target_tables:[], changed_fields:[], unchanged_fields:['source_text','segment_key','segment_order','start_locator','end_locator','book_id','source_page_identity'], source_text_preservation:'required; no mutation authorized', locator_behavior:'not approved; repository lacks operation semantics', segment_order_behavior:'not approved; no order mutation authorized', segment_key_behavior:'not approved; no deletion or remapping authorized', editorial_node_behavior:'not approved; generation impact is missing authority', active_disabled_status_behavior:'not approved; no exclusion/status field authority found', user_progress_remapping_behavior:'not approved; reference safety missing', reader_session_behavior:'not approved; reference safety missing', bookmark_note_highlight_behavior:'not approved; reference safety missing', audit_event_identity:null, idempotency_identity:null, rollback_requirements:[], operation_completeness_status:'incomplete', missing_authority:missing, application_ready:false }
 }).sort(by)
 if(records.length!==53) throw new Error(`Expected 53 exclude-structural-heading decisions, found ${records.length}`)
 const ids=new Set(records.map(r=>r.decision_id)); if(ids.size!==records.length) throw new Error('Duplicate decision IDs')
 const headings=new Set(records.map(r=>`${r.book_id}:${r.current_heading_segment_key}:${r.heading_segment_order}`)); if(headings.size!==records.length) throw new Error('Duplicate heading targets')
 return {readiness, records, complete:[], incomplete:records, outcomeDistribution:dist(readiness.records,'final_outcome'), bookDistribution:dist(records,'book_slug'), packetDistribution:dist(records,'packet_id')}
}

export async function buildArtifacts(){
 const d=await deriveStructuralHeadingMergeContract(); await mkdir('content/migration/reports',{recursive:true}); await mkdir('docs/content-pipeline',{recursive:true})
 const operationModels={schema_version:'pr0051-source-review-structural-heading-operation-models-v1', run_id:d.readiness.progress.run_id, supported_operation_models:[], rejected_operation_models:[
  {model:'A-soft-exclusion', approved:false, reason:'No repository authority defines a reader-facing exclusion/disabled field or reconstruction behavior for reviewed structural-heading rows.'},
  {model:'B-status-based-exclusion', approved:false, reason:'Existing status-only authority advances approval_status but does not define approval_status as heading exclusion.'},
  {model:'C-logical-merge-without-text-mutation', approved:false, reason:'No supported metadata link from heading row to successor or reader grouping semantics is defined.'},
  {model:'D-physical-segment-merge', approved:false, reason:'No identity-remapping, locator absorption, reference-safety, audit, or rollback authority supports row deletion/remapping or text merge.'},
  {model:'E-editorial-node-only-exclusion', approved:false, reason:'No authority shows editorial-node generation can omit/reclassify these headings while preserving staging rows and reconstruction.'}
 ]}
 const contract={schema_version:'pr0051-source-review-structural-heading-merge-contract-v1', contract_id:'reading-segment-source-review-structural-heading-merge-contract-pr0051', run_id:d.readiness.progress.run_id, structural_heading_merge_contract_approved:false, rights_status:'credited-source-edition', hash_algorithm:'sha256-canonical-json-v1', text_hash_algorithm:'sha256-normalized-lf-text-v1', authority:{readiness_policy:paths.readinessPolicy, readiness_plan:paths.readinessPlan, status_only_contract:paths.statusOnlyContract, successor_locator_contract:paths.locatorContract, staging_schema:paths.stagingSchema, source_inspection_packets:paths.sourceInspectionPackets, operation_models:paths.operationModels}, result:{application_ready_merge_decisions:0, complete_operation_records:0, incomplete_operation_records:d.records.length, executable_sql_generated:false, sql_executed:false}, authorized_mutation:null, supported_operation_models:[], rejected_operation_models:operationModels.rejected_operation_models.map(m=>m.model), changed_fields:[], preserved_fields:['source text','heading segment key','successor segment key when repository-provided','segment order','start locator','end locator','book identity','source-page identity','user progress','reader sessions','bookmarks','notes','highlights'], preconditions:[], postconditions:[], idempotency:{approved:false, reason:'No idempotent merge/exclusion operation is approved without complete operation semantics.'}, rollback:{approved:false, reason:'No rollback is approved without exact changed-field and reference-restoration authority.'}, safety_assertions:safetyAssertions}
 const plan={schema_version:'pr0051-source-review-structural-heading-merge-plan-v1', run_id:d.readiness.progress.run_id, structural_heading_merge_contract_approved:false, application_ready_merge_decisions:0, complete_operation_records:0, incomplete_operation_records:d.records.length, exact_set_equality:{expected_exclude_structural_heading_decisions:d.records.map(r=>r.decision_id), plan_decisions:d.records.map(r=>r.decision_id), missing:[], extra:[], duplicate_decision_ids:[], duplicate_heading_targets:[]}, book_distribution:d.bookDistribution, packet_distribution:d.packetDistribution, records:d.records}
 const missing={schema_version:'pr0051-source-review-structural-heading-merge-missing-authority-v1', run_id:d.readiness.progress.run_id, incomplete_decision_count:d.records.length, records:d.records.map(r=>({decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id, heading_segment_key:r.current_heading_segment_key, heading_segment_order:r.heading_segment_order, successor_segment_key:r.successor_segment_key, missing_authority:r.missing_authority}))}
 const map={immutable_historical_progress_sha256:paths.historicalProgress, archived_pr0045_pr0046_progress_snapshot_sha256:paths.pr0045Current, current_cumulative_progress_sha256:paths.progress, pr0048_readiness_policy_sha256:paths.readinessPolicy, pr0048_readiness_plan_sha256:paths.readinessPlan, pr0049_status_only_contract_sha256:paths.statusOnlyContract, pr0049_status_only_plan_sha256:paths.statusOnlyPlan, pr0050_locator_contract_sha256:paths.locatorContract, pr0050_locator_plan_sha256:paths.locatorPlan, pr0050_locator_evidence_sha256:paths.locatorEvidence, pr0050_locator_missing_authority_sha256:paths.locatorMissingAuthority, staging_schema_sha256:paths.stagingSchema, source_inspection_packets_sha256:paths.sourceInspectionPackets, mechanical_application_policy_sha256:paths.mechanicalPolicy, mechanical_application_plan_sha256:paths.mechanicalPlan, mechanical_application_evidence_sha256:paths.mechanicalEvidence, reconstruction_authority_sha256:paths.reconstructionPlan, editorial_node_authority_sha256:paths.editorialNodePlan, reader_reference_authority_sha256:paths.readerReferenceAuthority, ...Object.fromEntries(paths.decisionInputs.map(p=>[`${p.split('/').at(-1).replace('.json','').replaceAll('-','_')}_sha256`,p])), recovery_consolidation_sha256:paths.recoveryConsolidation, book_3_manual_adjudication_sha256:paths.book3Manual, remaining_manual_adjudication_sha256:paths.remainingManual}
 const input_hashes={}; for(const [k,p] of Object.entries(map)) input_hashes[k]=p.endsWith('.sql')||p.endsWith('.ts')?await sha256Raw(p):await canonicalJsonSha256(p)
 const evidence={schema_version:'pr0051-source-review-structural-heading-merge-evidence-v1', run_id:d.readiness.progress.run_id, structural_heading_merge_contract_approved:false, totals:{public_decision_count:d.readiness.records.length, exclude_structural_heading_decisions:d.records.length, application_ready_merge_decisions:0, complete_operation_records:0, incomplete_operation_records:d.records.length}, outcome_distribution:d.outcomeDistribution, book_distribution:d.bookDistribution, packet_distribution:d.packetDistribution, input_hash_field_to_path:map, input_hashes, artifact_hashes:{contract_sha256:canonicalJsonSha256FromValue(contract), plan_sha256:canonicalJsonSha256FromValue(plan), missing_authority_sha256:canonicalJsonSha256FromValue(missing), operation_models_sha256:canonicalJsonSha256FromValue(operationModels)}, assertions:safetyAssertions}
 const summary=`# PR-0051 Source-Review Structural-Heading Merge Contract\n\nStructural-heading merge contract approved: false.\n\nThe repository deterministically identifies 53 \`exclude-structural-heading\` decisions, but does not define a complete merge/exclusion operation model. Application-ready merge decisions: 0. Complete operation records: 0. Incomplete operation records: 53. No executable SQL was generated or executed. Database, Supabase, production, UI, source text, user progress, reader sessions, bookmarks, notes, highlights, and cutover state were not modified.\n\nDecision IDs: ${d.records.map(r=>r.decision_id).join(', ')}.\n`
 await writeFile(paths.contract,JSON.stringify(contract,null,2)+'\n'); await writeFile(paths.plan,JSON.stringify(plan,null,2)+'\n'); await writeFile(paths.missingAuthority,JSON.stringify(missing,null,2)+'\n'); await writeFile(paths.operationModels,JSON.stringify(operationModels,null,2)+'\n'); await writeFile(paths.evidence,JSON.stringify(evidence,null,2)+'\n'); await writeFile(paths.summary,summary); await writeFile(paths.docs,summary); console.log(JSON.stringify(evidence.totals,null,2))
 return {contract,plan,evidence,missing,operationModels,summary}
}
if(import.meta.url===`file://${process.argv[1]}`) await buildArtifacts()
