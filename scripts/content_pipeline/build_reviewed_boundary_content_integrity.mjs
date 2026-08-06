import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { eventKey } from './build_reviewed_boundary_audit_identity.mjs'
import { paths, sources, artifactOrder } from './reviewed_boundary_content_integrity_constants.mjs'

const json = async p => JSON.parse(await readFile(p, 'utf8'))
const lfHash = async p => createHash('sha256').update((await readFile(p, 'utf8')).replace(/\r\n?/g,'\n')).digest('hex')
export const projectionHash = value => canonicalJsonSha256FromValue(value)
const sourceHashes = async () => Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([name,p]) => [name, p.endsWith('.json') ? await canonicalJsonSha256(p) : await lfHash(p)])))

export async function deriveContentIntegrity() {
  const before = await sourceHashes()
  const [plan, decisions, appManifest, execManifest, status, audit] = await Promise.all([
    json(sources.authorized), json(sources.decisions), json(sources.applicationManifest), json(sources.executionManifest), json(sources.statusContract), json(sources.auditIdentity),
  ])
  if (plan.authorized_decision_count !== 74 || plan.application_records.length !== 74) throw new Error('expected exactly 74 authorized decisions')
  if (decisions.totals?.public_decision_count !== 144) throw new Error('expected exactly 144 public decisions')
  if (appManifest.authorized_count !== 74 || execManifest.execution_authority_approved !== false) throw new Error('authoritative manifest mismatch')
  if (status.status_only_contract_approved !== true || status.approved_scope?.decision_count !== 74 || audit.event_key_algorithm !== 'sha256-v1-length-delimited-reviewed-boundary-event-key') throw new Error('authoritative contract mismatch')
  const ids = plan.application_records.map(r => r.decision_id)
  if (new Set(ids).size !== ids.length) throw new Error('duplicate decision_id')
  const tuples = plan.application_records.map(r => `${r.expected_run_id}:${r.book_id}:${r.segment_key}`)
  if (new Set(tuples).size !== tuples.length) throw new Error('duplicate target identity')
  for (const r of plan.application_records) {
    if (r.changed_columns.length !== 1 || r.changed_columns[0] !== 'approval_status' || !['confirm-successor-start','retain-intro-segment'].includes(r.final_outcome)) throw new Error(`non-status-only decision ${r.decision_id}`)
    if (/merge/i.test(r.final_outcome) || /locator|content/.test(r.changed_columns.join(','))) throw new Error(`forbidden mutation ${r.decision_id}`)
    if (r.application_ready !== true || r.expected_current_approval_status !== 'boundary-review' || r.authorized_replacement_approval_status !== 'content-review') throw new Error(`unauthorized target ${r.decision_id}`)
  }
  const records = plan.application_records.map(r => {
    const identity = {run_id:r.expected_run_id,book_id:r.book_id,segment_key:r.segment_key}
    return {
      decision_id:r.decision_id, ...identity, source_key:null, current_approval_status:r.expected_current_approval_status,
      intended_resulting_approval_status:r.authorized_replacement_approval_status, segment_order:r.segment_order,
      segment_index:null,segment_count:null,boundary_version:null,start_locator:null,end_locator:null,display_title:null,
      word_count:null,normalized_content_sha256:null,content_byte_length:null,normalized_content_length:null,updated_at:null,
      source_artifact_references:[sources.authorized,sources.schema],source_artifact_hashes:{authorized:before.authorized,schema:before.schema},
      identity_projection:identity,identity_sha256:projectionHash(identity),boundary_projection:null,boundary_sha256:null,
      content_projection:null,content_sha256:null,status_projection:{previous_approval_status:r.expected_current_approval_status,intended_resulting_approval_status:r.authorized_replacement_approval_status},
      full_pre_application_projection:null,full_pre_application_sha256:null,baseline_complete:false,
    }
  }).sort((a,b)=>a.decision_id.localeCompare(b.decision_id))
  const policy={schema_version:'pr0056-reviewed-boundary-content-integrity-policy-v1',package_id:'reading-segment-reviewed-boundary-content-integrity-pr0056',evidence_class:'expected repository snapshot with blocked runtime evidence contract',target_table:'content_staging.reading_segments',authorized_decision_count:74,target_count:74,allowed_mutation:['approval_status'],executable_sql_generated:false,application_data_mutated:false,execution_authority_approved:false,content_integrity_authority_approved:false}
  const targets={schema_version:'pr0056-reviewed-boundary-content-integrity-targets-v1',target_count:74,canonical_order:'decision_id ascending',records}
  const projection={schema_version:'pr0056-reviewed-boundary-content-integrity-projection-contract-v1',algorithm:'sha256-canonical-json-v1',serialization:'recursively sort JSON object keys lexicographically, preserve array order, JSON.stringify without whitespace, hash UTF-8 bytes',identity_fields:['run_id','book_id','segment_key'],boundary_fields:['source_key','segment_order','segment_index','segment_count','boundary_version','start_locator','end_locator','display_title'],content_fields:['normalized_content_sha256','word_count','normalized_content_length','content_byte_length'],status_fields:['previous_approval_status','intended_resulting_approval_status'],full_pre_application_fields:['identity_sha256','boundary_sha256','content_sha256','previous_approval_status'],mutable_timestamps_excluded:['created_at','updated_at'],field_order_contract:'projection field arrays above are normative; serialized object keys are canonicalized lexicographically'}
  const snapshot={schema_version:'pr0056-reviewed-boundary-content-integrity-snapshot-v1',evidence_class:'expected_repository_snapshot',snapshot_complete:false,target_count:74,complete_record_count:0,records}
  const classes=['MATCH','STATUS_ALREADY_APPLIED','STATUS_UNEXPECTED','IDENTITY_MISSING','BOUNDARY_DRIFT','CONTENT_DRIFT','METADATA_DRIFT','SOURCE_HASH_DRIFT','DUPLICATE_TARGET','UNAUTHORIZED_TARGET','INSUFFICIENT_BASELINE']
  const drift={schema_version:'pr0056-reviewed-boundary-content-integrity-drift-contract-v1',precedence:['SOURCE_HASH_DRIFT','DUPLICATE_TARGET','UNAUTHORIZED_TARGET','IDENTITY_MISSING','INSUFFICIENT_BASELINE','BOUNDARY_DRIFT','CONTENT_DRIFT','METADATA_DRIFT','STATUS_UNEXPECTED','STATUS_ALREADY_APPLIED','MATCH'],classifications:Object.fromEntries(classes.map(c=>[c,{permits_application:c==='MATCH',permits_idempotent_no_op:c==='STATUS_ALREADY_APPLIED',requires_manual_review:!['MATCH','STATUS_ALREADY_APPLIED'].includes(c),blocks_execution:!['MATCH','STATUS_ALREADY_APPLIED'].includes(c),permits_rollback:c==='STATUS_ALREADY_APPLIED',blocks_rollback:c!=='STATUS_ALREADY_APPLIED'}])),rule:'BOUNDARY_DRIFT and CONTENT_DRIFT always block status-only application'}
  const baselines=records.map(r=>({decision_id:r.decision_id,run_id:r.run_id,book_id:r.book_id,segment_key:r.segment_key,original_approval_status:r.current_approval_status,intended_applied_approval_status:r.intended_resulting_approval_status,identity_sha256:r.identity_sha256,boundary_sha256:null,content_sha256:null,full_pre_application_sha256:null,rollback_baseline_complete:false}))
  const rollback={schema_version:'pr0056-reviewed-boundary-content-integrity-rollback-baseline-v1',rollback_execution_authorized:false,target_count:74,complete_baseline_count:0,requirements:['target identity hash matches','boundary hash matches','content hash matches','current approval_status equals intended applied approval_status','original approval_status is known','matching application audit event exists','no unresolved audit conflict exists'],records:baselines}
  const missing={schema_version:'pr0056-reviewed-boundary-content-integrity-missing-authority-v1',missing_target_count:74,missing_fields:['source_key','segment_index','segment_count','boundary_version','start_locator','end_locator','display_title','word_count','normalized_content_sha256','content_byte_length','normalized_content_length','updated_at'],reason:'No authoritative repository artifact contains the actual 74 reading_segments rows or their content; static package records contain identity, segment_order, and status only.',required_future_evidence:'A local/runtime database snapshot of the actual target rows, written under tmp/, matched against unchanged authoritative source hashes; production and remote connections are prohibited for this package.'}
  const compatibilityRecords=records.map(r=>({decision_id:r.decision_id,application_event_key:eventKey({...r,event_action:'status-advanced'}),rollback_event_key:eventKey({...r,event_action:'status-rollback'})}))
  const compatibility={schema_version:'pr0056-reviewed-boundary-content-integrity-audit-compatibility-v1',compatible:true,target_count:74,complete_identity_input_count:74,application_event_keys_unique:new Set(compatibilityRecords.map(r=>r.application_event_key)).size===74,application_rollback_keys_distinct:compatibilityRecords.every(r=>r.application_event_key!==r.rollback_event_key),identity_derivation_unchanged:true,integrity_hashes_future_location:'audit details payload only; excluded from event_key material',records:compatibilityRecords}
  const evidence={schema_version:'pr0056-reviewed-boundary-content-integrity-readiness-evidence-v1',source_snapshot_available:true,source_snapshot_complete:false,source_snapshot_verified:false,application_preflight_ready:false,rollback_baseline_ready:false,content_integrity_authority_approved:false,repository_backed_authority:'partial identity/order/status reconstruction verified; row baseline incomplete',database_backed_authority:'not available; no runtime database evidence claimed',database_validation_decision:'No SQL is introduced and an ephemeral fixture cannot prove the actual missing rows; independent static validation plus a blocked future runtime-evidence contract is appropriate.',source_hashes:before}
  const after=await sourceHashes(); if(JSON.stringify(before)!==JSON.stringify(after)) throw new Error('authoritative input changed during generation')
  return {policy,targets,projection,snapshot,drift,rollback,missing,evidence,compatibility}
}

export async function build(){const artifacts=await deriveContentIntegrity(); for(const k of artifactOrder) await writeFile(paths[k],JSON.stringify(artifacts[k],null,2)+'\n'); const manifest={schema_version:'pr0056-reviewed-boundary-content-integrity-manifest-v1',package_id:artifacts.policy.package_id,content_integrity_authority_approved:false,source_hashes:artifacts.evidence.source_hashes,artifact_hashes:Object.fromEntries(artifactOrder.map(k=>[`${k}_sha256`,projectionHash(artifacts[k])]))}; await writeFile(paths.manifest,JSON.stringify(manifest,null,2)+'\n'); return manifest}
if(import.meta.url===`file://${process.argv[1]}`) console.log(JSON.stringify(await build(),null,2))
