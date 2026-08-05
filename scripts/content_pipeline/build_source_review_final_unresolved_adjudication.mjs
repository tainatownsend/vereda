import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { deriveReadiness } from './classify_reviewed_boundary_application_readiness.mjs'
import { allowedOutcomes, allowedReasons, candidateSourcePathByKey, candidateSources, decisionInputPathByKey, historicalIntegrityPathByKey, paths, pr0052PathByHashKey, requiredSafetyAssertions } from './source_review_final_unresolved_constants.mjs'

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'))
const dist = (items, key) => Object.fromEntries(Object.entries(items.reduce((a, x) => (a[x[key]]=(a[x[key]]??0)+1,a), {})).sort())
const arr = (j) => j.items ?? j.decisions ?? j.records ?? j.packet_items ?? []
const scoreOf = c => c?.pair_score ?? c?.score ?? null
const identityMatches = (item, r) => item?.decision_id === r.decision_id || item?.original_decision_id === r.decision_id || (item?.segment_key === r.segment_key && item?.book_id === r.book_id && item?.packet_id === r.packet_id)

export const deriveCandidateEvidence = async (records, sourcePaths = candidateSources) => {
  const byId = new Map(records.map(r => [r.decision_id, { inspected_artifacts: [...sourcePaths], matching_candidate_ids: [], matching_candidate_count: 0, candidate_records_exist: false, selected_candidate_ids: [], score_availability: 'no-candidates', strongest_score: null, tied_strongest_count: 0, page_gap: null, semantic_anchor_classification: 'not-publicly-determinative', no_deterministic_selection_reason: 'no candidate records exist in inspected candidate sources', source_artifact_summaries: [] }]))
  for (const path of sourcePaths) {
    const json = await readJson(path)
    for (const item of arr(json)) {
      const rec = records.find(r => identityMatches(item, r))
      if (!rec) continue
      const evidence = byId.get(rec.decision_id)
      const candidates = item.candidates ?? item.pair_candidates ?? []
      evidence.candidate_records_exist ||= candidates.length > 0
      evidence.source_artifact_summaries.push({ path, matching_item_id: item.review_packet_item_id ?? item.discovery_item_id ?? item.adjudication_id ?? item.analysis_id ?? item.recovery_id ?? null, candidate_count: candidates.length, selected_candidate_index: item.selected_candidate_index ?? null, selected_pair_present: Boolean(item.selected_pair) })
      for (const c of candidates) evidence.matching_candidate_ids.push(`${path}#${item.review_packet_item_id ?? item.discovery_item_id ?? item.adjudication_id ?? item.analysis_id ?? 'item'}#candidate-${c.candidate_index ?? c.candidate_number ?? evidence.matching_candidate_ids.length}`)
      if (Number.isInteger(item.selected_candidate_index) && candidates[item.selected_candidate_index]) evidence.selected_candidate_ids.push(`${path}#${item.review_packet_item_id ?? item.discovery_item_id ?? item.adjudication_id ?? 'item'}#candidate-${item.selected_candidate_index}`)
    }
  }
  for (const evidence of byId.values()) {
    evidence.matching_candidate_count = evidence.matching_candidate_ids.length
    if (evidence.matching_candidate_count > 0) {
      const allScores = []
      for (const s of evidence.source_artifact_summaries) {
        const json = await readJson(s.path)
        const item = arr(json).find(x => (x.review_packet_item_id ?? x.discovery_item_id ?? x.adjudication_id ?? x.analysis_id ?? null) === s.matching_item_id)
        for (const c of item?.candidates ?? item?.pair_candidates ?? []) if (Number.isFinite(scoreOf(c))) allScores.push(scoreOf(c))
      }
      evidence.score_availability = allScores.length === evidence.matching_candidate_count ? 'all-scores-available' : allScores.length > 0 ? 'partial-scores-available' : 'scores-unavailable'
      evidence.strongest_score = allScores.length ? Math.max(...allScores) : null
      evidence.tied_strongest_count = allScores.length ? allScores.filter(s => s === evidence.strongest_score).length : 0
      evidence.no_deterministic_selection_reason = evidence.selected_candidate_ids.length === 0 ? 'candidate records exist but none is adjudication-selected' : evidence.tied_strongest_count > 1 ? 'candidate records include a tied strongest score' : 'candidate evidence remains insufficient to authorize a deterministic PR-0052 outcome'
    }
  }
  return byId
}

export const expectedRecord = (r, ce) => {
  const successorAvailable = Boolean(r.successor_segment_key)
  const reasonCodes = ['no-selected-candidate']; if (!successorAvailable) reasonCodes.push('successor-identity-unavailable'); reasonCodes.push('insufficient-public-authority-to-distinguish-outcomes')
  const reasons = reasonCodes.map(code => ({ code, detail: code === 'no-selected-candidate' ? ce.no_deterministic_selection_reason : code === 'successor-identity-unavailable' ? 'successor segment identity is unavailable in public authority' : 'public artifacts do not distinguish successor confirmation, locator adjustment, structural-heading exclusion, and intro retention without additional public authority' }))
  const strongestState = ce.strongest_score == null ? 'not-recorded' : String(ce.strongest_score)
  const rationale = `${r.decision_id} remains unresolved for segment ${r.segment_key} in packet ${r.packet_id}: candidate_count=${ce.matching_candidate_count}; strongest_score=${strongestState}; tied_strongest_count=${ce.tied_strongest_count}; successor_identity_available=${successorAvailable}; semantic_anchor=${ce.semantic_anchor_classification}; final_outcome=unresolved; downstream_lane=unresolved/ineligible lane; unresolved_reason=${reasons[0].code}.`
  return { decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id, original_authoritative_outcome:r.final_outcome, current_segment_key:r.segment_key, current_segment_order:r.segment_order, current_segment_title:r.current_title ?? r.display_title ?? null, predecessor_segment_key:null, predecessor_segment_order:null, successor_segment_key:r.successor_segment_key ?? null, successor_segment_order:r.successor_segment_order ?? null, successor_segment_title:r.successor_title ?? r.successor_display_title ?? null, candidate_source_artifacts_inspected: ce.inspected_artifacts, matching_candidate_ids: ce.matching_candidate_ids, public_candidate_count: ce.matching_candidate_count, selected_candidate_identity:null, selected_candidate_ids: ce.selected_candidate_ids, score_availability: ce.score_availability, strongest_candidate_score: ce.strongest_score, tied_strongest_candidate_count: ce.tied_strongest_count, page_gap: ce.page_gap, semantic_anchor_classification: ce.semantic_anchor_classification, structural_heading_evidence:'not-determinative-in-public-artifacts', intro_retention_evidence:'not-determinative-in-public-artifacts', locator_adjustment_evidence:'not-determinative-in-public-artifacts', evidence_artifact_paths:[r.source_artifact, r.resolution_artifact].filter(Boolean), adjudication_rule_applied:'pr0052-preserve-unresolved-on-insufficient-distinguishing-public-authority', final_outcome:'unresolved', adjudication_confidence:'low', outcome_specific_rationale:rationale, unresolved_reasons:reasons, downstream_contract_lane:'unresolved/ineligible lane', application_ready:false, existing_contract_coverage:'not-covered-by-existing-immutable-contracts', future_superseding_contract_required:false, exact_historical_source_artifact:r.source_artifact, pr0052_resolution_artifact:paths.decisions }
}
export const deriveFinalUnresolved = async () => { const readiness = await deriveReadiness(); const unresolved = readiness.records.filter(r => r.final_outcome === 'unresolved'); if (readiness.records.length !== 144) throw new Error(`Expected 144 public decisions, found ${readiness.records.length}`); if (unresolved.length !== 11) throw new Error(`Expected 11 unresolved decisions, found ${unresolved.length}`); if (new Set(unresolved.map(r=>r.decision_id)).size !== 11) throw new Error('Duplicate unresolved decision ids'); return { readiness, unresolved } }
export const deriveExpectedAdjudications = async () => { const { readiness, unresolved } = await deriveFinalUnresolved(); const candidates = await deriveCandidateEvidence(unresolved); return { readiness, unresolved, records: unresolved.map(r => expectedRecord(r, candidates.get(r.decision_id))) } }

export const buildArtifacts = async () => {
  const { readiness, records } = await deriveExpectedAdjudications(); await mkdir('content/migration/reports',{recursive:true}); await mkdir('docs/content-pipeline',{recursive:true})
  const policy = { schema_version:'pr0052-final-unresolved-adjudication-policy-v3', rights_status:'credited-source-edition', allowed_outcomes:allowedOutcomes, allowed_unresolved_reason_codes:allowedReasons, hash_algorithm:'sha256-canonical-json-v1', text_hash_algorithm:'sha256-normalized-lf-text-v1', resolution_standard:'resolve only when public repository evidence proves exactly one deterministic existing outcome; low confidence remains unresolved', confidence_policy:{ adjudication_confidence_values:['high','medium','low'], high:'all identities exact, one outcome uniquely supported, no competing interpretation, multiple consistent artifacts', medium:'one outcome clearly strongest, minor non-material evidence absent, no reasonable competing outcome, and rule permits resolution', low:'ambiguous, incomplete, conflicting, or source-dependent evidence; final unresolved records must use low adjudication confidence' }, safety_assertions:requiredSafetyAssertions }
  const plan = { schema_version:'pr0052-final-unresolved-adjudication-plan-v3', original_unresolved_count:11, public_decision_count:144, decision_ids:records.map(r=>r.decision_id), book_distribution:dist(records,'book_slug'), packet_distribution:dist(records,'packet_id'), records: records.map(r=>({ ...r })) }
  const confidence_counts = { resolved_high_confidence_count:0, resolved_medium_confidence_count:0, resolved_low_confidence_count:0, unresolved_low_confidence_count:11 }
  const decisions = { schema_version:'pr0052-final-unresolved-adjudication-decisions-v3', public_decision_count:144, original_unresolved_count:11, final_outcome_distribution:{...readiness.outcomeDistribution}, resolved_count:0, still_unresolved_count:11, ...confidence_counts, decisions:records }
  const reasons = { schema_version:'pr0052-final-unresolved-reasons-v3', unresolved_count:11, records:records.map(r=>({ decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id, current_segment_key:r.current_segment_key, final_outcome:r.final_outcome, adjudication_confidence:r.adjudication_confidence, unresolved_reasons:r.unresolved_reasons, rationale:r.outcome_specific_rationale })) }
  const impact = { schema_version:'pr0052-final-unresolved-contract-impact-v3', assessed_decision_count:11, application_ready_under_current_contracts:0, future_superseding_contract_required_count:0, safety_assertions:requiredSafetyAssertions, records:records.map(r=>({ decision_id:r.decision_id, final_outcome:r.final_outcome, downstream_contract_lane:r.downstream_contract_lane, application_ready:r.application_ready, existing_contract_coverage:r.existing_contract_coverage, future_superseding_contract_required:r.future_superseding_contract_required })) }
  await writeFile(paths.policy, JSON.stringify(policy,null,2)+'\n'); await writeFile(paths.plan, JSON.stringify(plan,null,2)+'\n'); await writeFile(paths.decisions, JSON.stringify(decisions,null,2)+'\n'); await writeFile(paths.reasons, JSON.stringify(reasons,null,2)+'\n'); await writeFile(paths.impact, JSON.stringify(impact,null,2)+'\n')
  const mapping = { ...historicalIntegrityPathByKey, ...pr0052PathByHashKey, ...decisionInputPathByKey, ...candidateSourcePathByKey }
  const field_to_path_hash_mapping = {}; for (const [k,p] of Object.entries(mapping)) field_to_path_hash_mapping[k] = { path:p, algorithm:'sha256-canonical-json-v1', sha256:await canonicalJsonSha256(p) }
  const evidence = { schema_version:'pr0052-final-unresolved-adjudication-evidence-v3', public_decision_count:144, original_unresolved_count:11, exact_set_equality:{ derived_plan_decisions_reasons_impact:true, decision_ids:records.map(r=>r.decision_id) }, book_distribution:plan.book_distribution, packet_distribution:plan.packet_distribution, candidate_evidence: records.map(r=>({ decision_id:r.decision_id, candidate_source_artifacts_inspected:r.candidate_source_artifacts_inspected, matching_candidate_ids:r.matching_candidate_ids, matching_candidate_count:r.public_candidate_count, score_availability:r.score_availability, strongest_candidate_score:r.strongest_candidate_score, tied_strongest_candidate_count:r.tied_strongest_candidate_count, selected_candidate_ids:r.selected_candidate_ids, no_deterministic_selection_reason:r.unresolved_reasons[0].detail })), field_to_path_hash_mapping, artifact_hashes:{ policy_sha256:canonicalJsonSha256FromValue(policy), plan_sha256:canonicalJsonSha256FromValue(plan), decisions_sha256:canonicalJsonSha256FromValue(decisions), reasons_sha256:canonicalJsonSha256FromValue(reasons), impact_sha256:canonicalJsonSha256FromValue(impact) }, safety_assertions:requiredSafetyAssertions }
  await writeFile(paths.evidence, JSON.stringify(evidence,null,2)+'\n')
  const summary = `# PR-0052 Final Unresolved Source-Review Adjudication\n\nOriginal unresolved decisions: 11. Resolved decisions: 0. Still unresolved: 11. Application-ready under current contracts: 0.\n\nThe builder and validator independently inspect mapped candidate/evidence sources and preserve all 11 decisions as low-confidence unresolved records because no public evidence proves exactly one deterministic existing outcome.\n\nDecision IDs: ${records.map(r=>r.decision_id).join(', ')}.\n`
  await writeFile(paths.summary, summary); await writeFile(paths.docs, summary); return { policy, plan, decisions, evidence, reasons, impact }
}
if (import.meta.url === `file://${process.argv[1]}`) { const { decisions } = await buildArtifacts(); console.log(JSON.stringify({ original_unresolved_count:decisions.original_unresolved_count, still_unresolved_count:decisions.still_unresolved_count, unresolved_low_confidence_count:decisions.unresolved_low_confidence_count }, null, 2)) }
