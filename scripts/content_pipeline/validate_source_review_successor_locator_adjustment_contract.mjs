import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue, sha256Raw } from './hash_utils.mjs'
import { deriveLocatorAdjustmentContract, paths, requiredMissing, safetyAssertions } from './build_source_review_successor_locator_adjustment_contract.mjs'
const readJson=async p=>JSON.parse(await readFile(p,'utf8'))
const fail=(e,m)=>e.push(m)
const forbidden=/\b(update\s+|insert\s+into|delete\s+from|merge\s+into|truncate|alter\s+table|drop\s+table|create\s+function|do\s+\$|commit;|rollback;|psql|createClient|supabase\.co|service_role|postgres:)\b/i
export const inputHashFieldToPath = { immutable_historical_progress_sha256:paths.historicalProgress, archived_pr0045_pr0046_progress_snapshot_sha256:paths.pr0045Current, current_cumulative_progress_sha256:paths.progress, pr0048_readiness_policy_sha256:paths.readinessPolicy, pr0048_readiness_plan_sha256:paths.readinessPlan, pr0049_status_only_contract_sha256:paths.statusOnlyContract, pr0049_status_only_plan_sha256:paths.statusOnlyPlan, staging_schema_sha256:paths.stagingSchema, source_inspection_packets_sha256:paths.sourceInspectionPackets, mechanical_application_policy_sha256:paths.mechanicalPolicy, mechanical_application_plan_sha256:paths.mechanicalPlan, mechanical_application_evidence_sha256:paths.mechanicalEvidence, ...Object.fromEntries(paths.decisionInputs.map(p=>[`${p.split('/').at(-1).replace('.json','').replaceAll('-','_')}_sha256`,p])) }
export async function validateArtifacts({contract,plan,evidence,missing,summary,docs}){
 const errors=[]; const d=await deriveLocatorAdjustmentContract();
 const ids=d.records.map(r=>r.decision_id), planIds=(plan.records??[]).map(r=>r.decision_id)
 if (d.readiness.records.length!==144) fail(errors,'wrong public-decision count'); if (d.records.length!==6) fail(errors,'wrong adjust-decision count')
 if (JSON.stringify(ids)!==JSON.stringify(planIds)) fail(errors,'exact set equality failed')
 if (new Set(planIds).size!==6) fail(errors,'duplicate decision IDs')
 if (new Set((plan.records??[]).map(r=>`${r.book_id}:${r.successor_segment_key}:${r.successor_segment_order}`)).size!==6) fail(errors,'duplicate target rows')
 if (contract.locator_mutation_contract_approved!==false||plan.locator_mutation_contract_approved!==false||evidence.locator_mutation_contract_approved!==false) fail(errors,'incorrect contract approval')
 if (plan.application_ready_locator_decisions!==0||evidence.totals.application_ready_locator_decisions!==0) fail(errors,'partial or unsupported approval')
 for (const r of plan.records??[]) { if(r.final_outcome!=='adjust-successor-start') fail(errors,`${r.decision_id}: non-adjust outcome included`); if(!r.successor_segment_key) fail(errors,`${r.decision_id}: missing successor identity`); if(r.successor_segment_order!==r.current_segment_order+1) fail(errors,`${r.decision_id}: invalid successor ordering`); if(r.target.target_column!==null||r.target.target_json_path!==null) fail(errors,`${r.decision_id}: unsupported target column/path approved`); if(r.expected_current_locator!==null) fail(errors,`${r.decision_id}: current locator must not be invented`); if(r.approved_replacement_locator!==null) fail(errors,`${r.decision_id}: approved locator must not be invented`); for(const m of requiredMissing) if(!r.missing_authority.includes(m)) fail(errors,`${r.decision_id}: missing reason ${m}`) }
 if ((missing.records??[]).length!==6) fail(errors,'missing-authority register must enumerate all incomplete records')
 for (const [k,p] of Object.entries(inputHashFieldToPath)) if (evidence.input_hashes?.[k] !== await (p.endsWith('.sql') ? sha256Raw(p) : canonicalJsonSha256(p))) fail(errors,`${k}: stale hash`)
 if (evidence.artifact_hashes?.contract_sha256!==canonicalJsonSha256FromValue(contract)) fail(errors,'contract hash mismatch'); if(evidence.artifact_hashes?.plan_sha256!==canonicalJsonSha256FromValue(plan)) fail(errors,'plan hash mismatch'); if(evidence.artifact_hashes?.missing_authority_sha256!==canonicalJsonSha256FromValue(missing)) fail(errors,'missing-authority hash mismatch')
 for (const [k,v] of Object.entries(safetyAssertions)) if (evidence.assertions?.[k]!==v || contract.safety_assertions?.[k]!==v) fail(errors,`${k}: safety assertion must be false`)
 for (const text of [JSON.stringify(contract),JSON.stringify(plan),JSON.stringify(evidence),JSON.stringify(missing),summary,docs]) { if(forbidden.test(text)) fail(errors,'mutating SQL or database/Supabase connection code detected'); if(/source_text"\s*:\s*"|source_excerpt"\s*:\s*"|private/i.test(text)) fail(errors,'source/private evidence leakage') }
 if (errors.length) throw new Error(errors.join('\n'))
 return { decision_count:6, approved:false, exact_set_equality:true, incomplete:6 }
}
if (import.meta.url===`file://${process.argv[1]}`) { const a={contract:await readJson(paths.contract),plan:await readJson(paths.plan),evidence:await readJson(paths.evidence),missing:await readJson(paths.missingAuthority),summary:await readFile(paths.summary,'utf8'),docs:await readFile(paths.docs,'utf8')}; console.log(JSON.stringify(await validateArtifacts(a),null,2)) }
