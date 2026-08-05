import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256 } from './hash_utils.mjs'
import { allowedOutcomes, allowedReasons, candidateSources, deriveExpectedAdjudications, immutableHashPaths, paths } from './build_source_review_final_unresolved_adjudication.mjs'
const readJson = async p => JSON.parse(await readFile(p,'utf8'))
const ids = a => a.map(x=>x.decision_id).sort()
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b)
const fail = m => { throw new Error(m) }
const byId = a => new Map(a.map(x => [x.decision_id, x]))
const eq = (actual, expected, label) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`) }
const forbiddenKeys = ['source_text','source_excerpt','private_evidence','credentials','environment_values','migration_applied','database_modified_flag','production_modified_flag','cutover_enabled_flag']
const mutatingSql = /\b(UPDATE|INSERT|DELETE|MERGE|ALTER|DROP)\b/
const unsafeDb = /(createClient\s*\(|postgres(?:ql)?:\/\/|SUPABASE_SERVICE_ROLE|service_role_key)/i
export const validateArtifactSet = async ({ policy, plan, decisions, evidence, reasons, impact } = {}) => {
  const expected = await deriveExpectedAdjudications(); const expectedIds = ids(expected.records); const expectedMap = byId(expected.records)
  policy ??= await readJson(paths.policy); plan ??= await readJson(paths.plan); decisions ??= await readJson(paths.decisions); evidence ??= await readJson(paths.evidence); reasons ??= await readJson(paths.reasons); impact ??= await readJson(paths.impact)
  if (decisions.public_decision_count !== 144 || decisions.original_unresolved_count !== 11 || decisions.still_unresolved_count !== 11 || decisions.resolved_count !== 0) fail('decision totals drift')
  if (decisions.resolved_high_confidence_count !== 0 || decisions.resolved_medium_confidence_count !== 0 || decisions.resolved_low_confidence_count !== 0 || decisions.unresolved_low_confidence_count !== 11) fail('confidence totals drift')
  for (const [name, actualIds] of Object.entries({ plan:plan.records ? ids(plan.records) : [...plan.decision_ids].sort(), decisions:ids(decisions.decisions), reasons:ids(reasons.records), impact:ids(impact.records) })) if (!same(actualIds, expectedIds)) fail(`${name} set mismatch`)
  if (new Set(decisions.decisions.map(r=>r.decision_id)).size !== 11) fail('duplicate decision ids')
  for (const record of decisions.decisions) {
    const exp = expectedMap.get(record.decision_id); if (!exp) fail(`${record.decision_id}: extra or replaced decision`)
    for (const field of ['decision_id','book_id','book_slug','packet_id','original_authoritative_outcome','current_segment_key','current_segment_order','predecessor_segment_key','predecessor_segment_order','successor_segment_key','successor_segment_order','candidate_source_artifacts_inspected','matching_candidate_ids','public_candidate_count','score_availability','strongest_candidate_score','tied_strongest_candidate_count','page_gap','semantic_anchor_classification','structural_heading_evidence','intro_retention_evidence','locator_adjustment_evidence','adjudication_rule_applied','final_outcome','adjudication_confidence','unresolved_reasons','downstream_contract_lane','application_ready','existing_contract_coverage','future_superseding_contract_required','exact_historical_source_artifact','pr0052_resolution_artifact']) eq(record[field], exp[field], `${record.decision_id}.${field}`)
    if (!allowedOutcomes.includes(record.final_outcome)) fail(`${record.decision_id}: unsupported outcome`)
    if (record.final_outcome !== 'unresolved') fail(`${record.decision_id}: unsupported deterministic resolution`)
    if (record.adjudication_confidence !== 'low') fail(`${record.decision_id}: final unresolved must be low confidence`)
    if (record.successor_segment_key && !exp.successor_segment_key) fail(`${record.decision_id}: fabricated successor identity`)
    if ('current_locator' in record || 'replacement_locator' in record || 'target_json_path' in record) fail(`${record.decision_id}: invented locator authority`)
    const codes = record.unresolved_reasons.map(r => r.code); if (codes.length === 0 || new Set(codes).size !== codes.length) fail(`${record.decision_id}: missing/duplicate unresolved reasons`)
    for (const code of codes) if (!allowedReasons.includes(code)) fail(`${record.decision_id}: unsupported unresolved reason ${code}`)
    const rationale = record.outcome_specific_rationale
    const required = [record.decision_id, record.current_segment_key, record.packet_id, `candidate_count=${record.public_candidate_count}`, `strongest_score=${record.strongest_candidate_score == null ? 'not-recorded' : record.strongest_candidate_score}`, `tied_strongest_count=${record.tied_strongest_candidate_count}`, `successor_identity_available=${Boolean(record.successor_segment_key)}`, `semantic_anchor=${record.semantic_anchor_classification}`, 'final_outcome=unresolved', `downstream_lane=${record.downstream_contract_lane}`, `unresolved_reason=${codes[0]}`]
    for (const token of required) if (!rationale.includes(String(token))) fail(`${record.decision_id}: rationale field drift: ${token}`)
    const genericShape = rationale.replaceAll(record.decision_id,'ID').replaceAll(record.current_segment_key,'SEGMENT').replaceAll(record.packet_id,'PACKET')
    if (!genericShape.includes(`candidate_count=${record.public_candidate_count}`) || !genericShape.includes(`tied_strongest_count=${record.tied_strongest_candidate_count}`)) fail(`${record.decision_id}: generic rationale lacks evidence`)
  }
  const reasonMap = byId(reasons.records); const impactMap = byId(impact.records); const planMap = byId(plan.records)
  for (const r of expected.records) { eq(reasonMap.get(r.decision_id).unresolved_reasons, r.unresolved_reasons, `${r.decision_id}.reason-register`); eq(impactMap.get(r.decision_id).application_ready, false, `${r.decision_id}.impact-ready`); eq(planMap.get(r.decision_id).matching_candidate_ids, r.matching_candidate_ids, `${r.decision_id}.plan-candidates`) }
  const requiredHashKeys = [...Object.keys(immutableHashPaths), 'pr0052_policy','pr0052_plan','pr0052_decisions','pr0052_reasons','pr0052_impact', ...new Set([...candidateSources, ...['content/migration/reading-segment-source-review-container-intro-decisions.json','content/migration/reading-segment-source-review-pilot-decisions.json','content/migration/reading-segment-same-page-review-decisions.json','content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json','content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json']].map(p=>p.split('/').pop().replace('.json','')))].sort()
  const actualHashKeys = Object.keys(evidence.field_to_path_hash_mapping).sort(); if (!same(actualHashKeys, requiredHashKeys)) fail('hash key set drift')
  for (const [key, entry] of Object.entries(evidence.field_to_path_hash_mapping)) { if (entry.path !== ({...immutableHashPaths, pr0052_policy:paths.policy, pr0052_plan:paths.plan, pr0052_decisions:paths.decisions, pr0052_reasons:paths.reasons, pr0052_impact:paths.impact}[key] ?? entry.path)) fail(`${key}: swapped path`); if (await canonicalJsonSha256(entry.path) !== entry.sha256) fail(`${key}: stale hash`) }
  const serialized = JSON.stringify({policy,plan,decisions,evidence,reasons,impact})
  for (const key of forbiddenKeys) if (serialized.includes(`"${key}"`)) fail(`unsafe key leaked: ${key}`)
  if (mutatingSql.test(serialized)) fail('mutating SQL token leaked')
  if (unsafeDb.test(serialized)) fail('database/Supabase connection leaked')
  if (policy.safety_assertions.database_modified !== false || policy.safety_assertions.production_modified !== false || policy.safety_assertions.cutover_enabled !== false) fail('safety assertions drift')
  return { ok:true, original_unresolved_count:11, still_unresolved_count:11, decision_ids:expectedIds, candidate_sources_inspected:candidateSources.length }
}
export const validateArtifacts = validateArtifactSet
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await validateArtifacts(), null, 2))
