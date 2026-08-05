import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256 } from './hash_utils.mjs'
import { deriveReadiness } from './classify_reviewed_boundary_application_readiness.mjs'
import { allowedOutcomes, allowedReasons, candidateSourcePathByKey, decisionInputPathByKey, historicalIntegrityPathByKey, paths, pr0052PathByHashKey, requiredSafetyAssertions } from './source_review_final_unresolved_constants.mjs'

const readJson = async p => JSON.parse(await readFile(p, 'utf8'))
const ids = a => a.map(x => x.decision_id).sort()
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b)
const fail = m => { throw new Error(m) }
const byId = a => new Map(a.map(x => [x.decision_id, x]))
const eq = (a,e,label) => { if (JSON.stringify(a) !== JSON.stringify(e)) fail(`${label}: ${JSON.stringify(a)} !== ${JSON.stringify(e)}`) }
const arr = j => j.items ?? j.decisions ?? j.records ?? j.packet_items ?? []
const scoreOf = c => c?.pair_score ?? c?.score ?? null
const identityMatches = (item, r) => item?.decision_id === r.decision_id || item?.original_decision_id === r.decision_id || (item?.segment_key === r.segment_key && item?.book_id === r.book_id && item?.packet_id === r.packet_id)
const forbiddenKeys = ['source_text','source_excerpt','private_evidence','credentials','environment_values','migration_applied','database_modified_flag','production_modified_flag','cutover_enabled_flag']
const mutatingSql = /\b(UPDATE|INSERT|DELETE|MERGE|ALTER|DROP)\b/
const unsafeDb = /(createClient\s*\(|postgres(?:ql)?:\/\/|SUPABASE_SERVICE_ROLE|service_role_key)/i
export const validatorHashPathByKey = { ...historicalIntegrityPathByKey, ...pr0052PathByHashKey, ...decisionInputPathByKey, ...candidateSourcePathByKey }

const deriveCandidateEvidenceIndependent = async (records) => {
  const evidence = new Map(records.map(r => [r.decision_id, { inspected_artifacts: Object.values(candidateSourcePathByKey), matching_candidate_ids: [], matching_candidate_count: 0, selected_candidate_ids: [], score_availability: 'no-candidates', strongest_score: null, tied_strongest_count: 0, page_gap: null, semantic_anchor_classification: 'not-publicly-determinative', no_deterministic_selection_reason: 'no candidate records exist in inspected candidate sources', item_refs: [] }]))
  for (const path of Object.values(candidateSourcePathByKey)) {
    const json = await readJson(path)
    for (const item of arr(json)) {
      const record = records.find(r => identityMatches(item, r))
      if (!record) continue
      const current = evidence.get(record.decision_id)
      const candidates = item.candidates ?? item.pair_candidates ?? []
      const itemId = item.review_packet_item_id ?? item.discovery_item_id ?? item.adjudication_id ?? item.analysis_id ?? item.recovery_id ?? 'item'
      current.item_refs.push({ path, itemId })
      for (const candidate of candidates) current.matching_candidate_ids.push(`${path}#${itemId}#candidate-${candidate.candidate_index ?? candidate.candidate_number ?? current.matching_candidate_ids.length}`)
      if (Number.isInteger(item.selected_candidate_index) && candidates[item.selected_candidate_index]) current.selected_candidate_ids.push(`${path}#${itemId}#candidate-${item.selected_candidate_index}`)
    }
  }
  for (const current of evidence.values()) {
    current.matching_candidate_count = current.matching_candidate_ids.length
    if (current.matching_candidate_count === 0) continue
    const scores = []
    for (const { path, itemId } of current.item_refs) {
      const item = arr(await readJson(path)).find(x => (x.review_packet_item_id ?? x.discovery_item_id ?? x.adjudication_id ?? x.analysis_id ?? x.recovery_id ?? 'item') === itemId)
      for (const candidate of item?.candidates ?? item?.pair_candidates ?? []) if (Number.isFinite(scoreOf(candidate))) scores.push(scoreOf(candidate))
    }
    current.score_availability = scores.length === current.matching_candidate_count ? 'all-scores-available' : scores.length > 0 ? 'partial-scores-available' : 'scores-unavailable'
    current.strongest_score = scores.length ? Math.max(...scores) : null
    current.tied_strongest_count = scores.length ? scores.filter(score => score === current.strongest_score).length : 0
    current.no_deterministic_selection_reason = current.selected_candidate_ids.length === 0 ? 'candidate records exist but none is adjudication-selected' : current.tied_strongest_count > 1 ? 'candidate records include a tied strongest score' : 'candidate evidence remains insufficient to authorize a deterministic PR-0052 outcome'
  }
  return evidence
}

const deriveAuthorityIndependent = async () => {
  const readiness = await deriveReadiness()
  const unresolved = readiness.records.filter(record => record.final_outcome === 'unresolved')
  if (readiness.records.length !== 144) fail('authority public decision count drift')
  if (unresolved.length !== 11) fail('authority unresolved count drift')
  if (new Set(unresolved.map(r => r.decision_id)).size !== 11) fail('authority duplicate unresolved ids')
  const candidateEvidence = await deriveCandidateEvidenceIndependent(unresolved)
  const records = unresolved.map(r => {
    const ce = candidateEvidence.get(r.decision_id)
    const successorAvailable = Boolean(r.successor_segment_key)
    const reasonCodes = ['no-selected-candidate']; if (!successorAvailable) reasonCodes.push('successor-identity-unavailable'); reasonCodes.push('insufficient-public-authority-to-distinguish-outcomes')
    const unresolved_reasons = reasonCodes.map(code => ({ code, detail: code === 'no-selected-candidate' ? ce.no_deterministic_selection_reason : code === 'successor-identity-unavailable' ? 'successor segment identity is unavailable in public authority' : 'public artifacts do not distinguish successor confirmation, locator adjustment, structural-heading exclusion, and intro retention without additional public authority' }))
    const strongestState = ce.strongest_score == null ? 'not-recorded' : String(ce.strongest_score)
    return { decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id, original_authoritative_outcome:r.final_outcome, current_segment_key:r.segment_key, current_segment_order:r.segment_order, current_segment_title:r.current_title ?? r.display_title ?? null, predecessor_segment_key:null, predecessor_segment_order:null, successor_segment_key:r.successor_segment_key ?? null, successor_segment_order:r.successor_segment_order ?? null, successor_segment_title:r.successor_title ?? r.successor_display_title ?? null, candidate_source_artifacts_inspected:ce.inspected_artifacts, matching_candidate_ids:ce.matching_candidate_ids, public_candidate_count:ce.matching_candidate_count, selected_candidate_identity:null, selected_candidate_ids:ce.selected_candidate_ids, score_availability:ce.score_availability, strongest_candidate_score:ce.strongest_score, tied_strongest_candidate_count:ce.tied_strongest_count, page_gap:ce.page_gap, semantic_anchor_classification:ce.semantic_anchor_classification, structural_heading_evidence:'not-determinative-in-public-artifacts', intro_retention_evidence:'not-determinative-in-public-artifacts', locator_adjustment_evidence:'not-determinative-in-public-artifacts', evidence_artifact_paths:[r.source_artifact, r.resolution_artifact].filter(Boolean), adjudication_rule_applied:'pr0052-preserve-unresolved-on-insufficient-distinguishing-public-authority', final_outcome:'unresolved', adjudication_confidence:'low', outcome_specific_rationale:`${r.decision_id} remains unresolved for segment ${r.segment_key} in packet ${r.packet_id}: candidate_count=${ce.matching_candidate_count}; strongest_score=${strongestState}; tied_strongest_count=${ce.tied_strongest_count}; successor_identity_available=${successorAvailable}; semantic_anchor=${ce.semantic_anchor_classification}; final_outcome=unresolved; downstream_lane=unresolved/ineligible lane; unresolved_reason=${unresolved_reasons[0].code}.`, unresolved_reasons, downstream_contract_lane:'unresolved/ineligible lane', application_ready:false, existing_contract_coverage:'not-covered-by-existing-immutable-contracts', future_superseding_contract_required:false, exact_historical_source_artifact:r.source_artifact, pr0052_resolution_artifact:paths.decisions }
  })
  return { readiness, records }
}

const assertSafety = (label, value) => {
  eq(Object.keys(value ?? {}).sort(), Object.keys(requiredSafetyAssertions).sort(), `${label}.safety-key-set`)
  for (const [key, expected] of Object.entries(requiredSafetyAssertions)) if (value[key] !== expected) fail(`${label}.${key}: safety assertion drift`)
}

export const validateArtifactSet = async ({ policy, plan, decisions, evidence, reasons, impact } = {}) => {
  const { records } = await deriveAuthorityIndependent(); const expectedIds = ids(records)
  policy ??= await readJson(paths.policy); plan ??= await readJson(paths.plan); decisions ??= await readJson(paths.decisions); evidence ??= await readJson(paths.evidence); reasons ??= await readJson(paths.reasons); impact ??= await readJson(paths.impact)
  if (decisions.public_decision_count !== 144 || decisions.original_unresolved_count !== 11 || decisions.still_unresolved_count !== 11 || decisions.resolved_count !== 0) fail('decision totals drift')
  if (decisions.resolved_high_confidence_count !== 0 || decisions.resolved_medium_confidence_count !== 0 || decisions.resolved_low_confidence_count !== 0 || decisions.unresolved_low_confidence_count !== 11) fail('confidence totals drift')
  for (const [name, actualIds] of Object.entries({ plan:ids(plan.records), decisions:ids(decisions.decisions), reasons:ids(reasons.records), impact:ids(impact.records) })) if (!same(actualIds, expectedIds)) fail(`${name} set mismatch`)
  if (new Set(decisions.decisions.map(r => r.decision_id)).size !== 11) fail('duplicate decision ids')
  const planMap = byId(plan.records); const decisionMap = byId(decisions.decisions); const reasonMap = byId(reasons.records); const impactMap = byId(impact.records)
  for (const expected of records) {
    const actual = decisionMap.get(expected.decision_id)
    for (const field of Object.keys(expected)) eq(actual[field], expected[field], `${expected.decision_id}.decisions.${field}`)
    for (const field of Object.keys(planMap.get(expected.decision_id))) eq(planMap.get(expected.decision_id)[field], expected[field], `${expected.decision_id}.plan.${field}`)
    eq(reasonMap.get(expected.decision_id), { decision_id:expected.decision_id, book_id:expected.book_id, book_slug:expected.book_slug, packet_id:expected.packet_id, current_segment_key:expected.current_segment_key, final_outcome:expected.final_outcome, adjudication_confidence:expected.adjudication_confidence, unresolved_reasons:expected.unresolved_reasons, rationale:expected.outcome_specific_rationale }, `${expected.decision_id}.reasons-record`)
    eq(impactMap.get(expected.decision_id), { decision_id:expected.decision_id, final_outcome:expected.final_outcome, downstream_contract_lane:expected.downstream_contract_lane, application_ready:expected.application_ready, existing_contract_coverage:expected.existing_contract_coverage, future_superseding_contract_required:expected.future_superseding_contract_required }, `${expected.decision_id}.impact-record`)
    if (!allowedOutcomes.includes(actual.final_outcome) || actual.final_outcome !== 'unresolved') fail(`${expected.decision_id}: unsupported outcome`)
    if (actual.adjudication_confidence !== 'low') fail(`${expected.decision_id}: final unresolved must be low confidence`)
    if ('current_locator' in actual || 'replacement_locator' in actual || 'target_json_path' in actual) fail(`${expected.decision_id}: invented locator authority`)
    const codes = actual.unresolved_reasons.map(r => r.code); if (codes.length === 0 || new Set(codes).size !== codes.length) fail(`${expected.decision_id}: missing/duplicate unresolved reasons`)
    for (const code of codes) if (!allowedReasons.includes(code)) fail(`${expected.decision_id}: unsupported unresolved reason ${code}`)
    for (const token of [actual.decision_id, actual.current_segment_key, actual.packet_id, `candidate_count=${actual.public_candidate_count}`, `strongest_score=${actual.strongest_candidate_score == null ? 'not-recorded' : actual.strongest_candidate_score}`, `tied_strongest_count=${actual.tied_strongest_candidate_count}`, `successor_identity_available=${Boolean(actual.successor_segment_key)}`, `semantic_anchor=${actual.semantic_anchor_classification}`, 'final_outcome=unresolved', `downstream_lane=${actual.downstream_contract_lane}`, `unresolved_reason=${codes[0]}`]) if (!actual.outcome_specific_rationale.includes(String(token))) fail(`${expected.decision_id}: rationale field drift: ${token}`)
  }
  eq(Object.keys(evidence.field_to_path_hash_mapping).sort(), Object.keys(validatorHashPathByKey).sort(), 'hash key set')
  if (new Set(Object.values(validatorHashPathByKey)).size !== Object.values(validatorHashPathByKey).length) fail('validator hash path map contains duplicate paths')
  for (const [key, expectedPath] of Object.entries(validatorHashPathByKey)) { const entry = evidence.field_to_path_hash_mapping[key]; if (entry.path !== expectedPath) fail(`${key}: swapped path`); if (await canonicalJsonSha256(expectedPath) !== entry.sha256) fail(`${key}: stale hash`) }
  assertSafety('policy', policy.safety_assertions); assertSafety('evidence', evidence.safety_assertions); assertSafety('impact', impact.safety_assertions)
  const serialized = JSON.stringify({policy,plan,decisions,evidence,reasons,impact})
  for (const key of forbiddenKeys) if (serialized.includes(`"${key}"`)) fail(`unsafe key leaked: ${key}`)
  if (mutatingSql.test(serialized)) fail('mutating SQL token leaked')
  if (unsafeDb.test(serialized)) fail('database/Supabase connection leaked')
  return { ok:true, original_unresolved_count:11, still_unresolved_count:11, candidate_sources_inspected:Object.keys(candidateSourcePathByKey).length }
}
export const validateArtifacts = validateArtifactSet
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await validateArtifacts(), null, 2))
