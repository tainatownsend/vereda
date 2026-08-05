import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { candidateSources, deriveCandidateEvidence, deriveExpectedAdjudications, deriveFinalUnresolved, expectedRecord, paths } from '../../scripts/content_pipeline/build_source_review_final_unresolved_adjudication.mjs'
import { validateArtifactSet, validateArtifacts } from '../../scripts/content_pipeline/validate_source_review_final_unresolved_adjudication.mjs'

const readJson = async p => JSON.parse(await readFile(p, 'utf8'))
const clone = v => JSON.parse(JSON.stringify(v))
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex')
const loadArtifacts = async () => ({ policy: await readJson(paths.policy), plan: await readJson(paths.plan), decisions: await readJson(paths.decisions), evidence: await readJson(paths.evidence), reasons: await readJson(paths.reasons), impact: await readJson(paths.impact) })
const expectInvalid = async (mutate, message) => { const a = await loadArtifacts(); mutate(a); await expect(validateArtifactSet(a)).rejects.toThrow(message) }

describe('PR-0052 final unresolved adjudication hardening', () => {
  it('derives exactly the authoritative 11 unresolved decisions with no resolved records', async () => {
    const { readiness, unresolved } = await deriveFinalUnresolved()
    expect(readiness.records).toHaveLength(144); expect(unresolved).toHaveLength(11); expect(new Set(unresolved.map(r => r.decision_id)).size).toBe(11); expect(unresolved.every(r => r.final_outcome === 'unresolved')).toBe(true)
  })
  it('independently derives candidate evidence and detects candidates hidden in another corpus', async () => {
    const { unresolved } = await deriveFinalUnresolved(); const evidence = await deriveCandidateEvidence(unresolved)
    expect(evidence.get('3897756c407152ae53987665').matching_candidate_count).toBeGreaterThan(0)
    const hidden = await deriveCandidateEvidence(unresolved.filter(r => r.decision_id === '3897756c407152ae53987665'), ['content/migration/reading-segment-no-anchor-discovery-corpus.json'])
    expect(hidden.get('3897756c407152ae53987665').matching_candidate_count).toBe(5)
  })
  it('inserting a matching candidate changes candidate count while another-decision candidates are rejected', async () => {
    const rec = { decision_id:'d', book_id:1, book_slug:'b', packet_id:'p', final_outcome:'unresolved', segment_key:'s', segment_order:1, source_artifact:'x' }
    const ce0 = await deriveCandidateEvidence([rec], [])
    expect(ce0.get('d').matching_candidate_count).toBe(0)
    const ce = { inspected_artifacts:['synthetic'], matching_candidate_ids:['synthetic#d#candidate-0'], matching_candidate_count:1, selected_candidate_ids:[], score_availability:'all-scores-available', strongest_score:2, tied_strongest_count:1, page_gap:null, semantic_anchor_classification:'not-publicly-determinative', no_deterministic_selection_reason:'candidate records exist but none is adjudication-selected' }
    expect(expectedRecord(rec, ce).public_candidate_count).toBe(1)
  })
  it('candidate index zero, weaker selections, and tied strongest evidence remain unresolved', async () => {
    const rec = { decision_id:'d', book_id:1, book_slug:'b', packet_id:'p', final_outcome:'unresolved', segment_key:'s', segment_order:1, source_artifact:'x' }
    const base = { inspected_artifacts:['synthetic'], matching_candidate_ids:['c0','c1'], matching_candidate_count:2, selected_candidate_ids:['c0'], score_availability:'all-scores-available', strongest_score:10, tied_strongest_count:2, page_gap:null, semantic_anchor_classification:'not-publicly-determinative', no_deterministic_selection_reason:'candidate records include a tied strongest score' }
    const r = expectedRecord(rec, base)
    expect(r.final_outcome).toBe('unresolved'); expect(r.selected_candidate_identity).toBeNull(); expect(r.tied_strongest_candidate_count).toBe(2)
  })
  it('validates reordered valid records by semantic set equality', async () => {
    const a = await loadArtifacts(); a.decisions.decisions.reverse(); a.plan.records.reverse(); a.reasons.records.reverse(); a.impact.records.reverse(); await expect(validateArtifactSet(a)).resolves.toMatchObject({ ok:true })
  })
  it('rejects missing, extra, duplicate, and replaced decisions plus resolved decision entering scope', async () => {
    await expectInvalid(a => { a.decisions.decisions.pop() }, 'decisions set mismatch')
    await expectInvalid(a => { a.decisions.decisions.push(clone(a.decisions.decisions[0])); a.decisions.decisions.at(-1).decision_id='extra' }, 'decisions set mismatch')
    await expectInvalid(a => { a.decisions.decisions.push(clone(a.decisions.decisions[0])) }, 'decisions set mismatch')
    await expectInvalid(a => { a.decisions.decisions[0].decision_id='replaced' }, 'decisions set mismatch')
    await expectInvalid(a => { a.decisions.decisions[0].original_authoritative_outcome='confirm-successor-start' }, 'original_authoritative_outcome')
  })
  it('rejects unsupported outcome, fabricated successor identity, invented locator, and low-confidence resolution', async () => {
    await expectInvalid(a => { a.decisions.decisions[0].final_outcome='new-outcome' }, 'final_outcome')
    await expectInvalid(a => { a.decisions.decisions[0].successor_segment_key='fabricated' }, 'successor_segment_key')
    await expectInvalid(a => { a.decisions.decisions[0].current_locator='$.x' }, 'invented locator')
    await expectInvalid(a => { a.decisions.decisions[0].final_outcome='confirm-successor-start'; a.decisions.decisions[0].adjudication_confidence='low' }, 'final_outcome')
  })
  it('rejects inconsistent confidence totals', async () => {
    await expectInvalid(a => { a.decisions.unresolved_low_confidence_count=10 }, 'confidence totals drift')
    await expectInvalid(a => { a.decisions.resolved_low_confidence_count=1 }, 'confidence totals drift')
  })
  it('rejects generic/duplicated rationale and rationale field drift', async () => {
    await expectInvalid(a => { a.decisions.decisions[0].outcome_specific_rationale='generic unresolved '+a.decisions.decisions[0].decision_id }, 'rationale field drift')
    await expectInvalid(a => { a.decisions.decisions[1].outcome_specific_rationale=a.decisions.decisions[0].outcome_specific_rationale }, 'rationale field drift')
    await expectInvalid(a => { a.decisions.decisions[0].outcome_specific_rationale=a.decisions.decisions[0].outcome_specific_rationale.replace('candidate_count=0','candidate_count=999') }, 'rationale field drift')
    await expectInvalid(a => { a.decisions.decisions[0].outcome_specific_rationale=a.decisions.decisions[0].outcome_specific_rationale.replace('successor_identity_available=false','successor_identity_available=true') }, 'rationale field drift')
    await expectInvalid(a => { a.decisions.decisions[0].outcome_specific_rationale=a.decisions.decisions[0].outcome_specific_rationale.replace(a.decisions.decisions[0].packet_id,'wrong-packet') }, 'rationale field drift')
    await expectInvalid(a => { a.decisions.decisions[0].outcome_specific_rationale=a.decisions.decisions[0].outcome_specific_rationale.replace('downstream_lane=unresolved/ineligible lane','downstream_lane=status-only') }, 'rationale field drift')
  })
  it('rejects missing, unsupported, duplicate, replaced, drifted, and evidence-inconsistent unresolved reasons', async () => {
    await expectInvalid(a => { a.decisions.decisions[0].unresolved_reasons=[] }, 'unresolved_reasons')
    await expectInvalid(a => { a.decisions.decisions[0].unresolved_reasons[0].code='unsupported' }, 'unresolved_reasons')
    await expectInvalid(a => { a.decisions.decisions[0].unresolved_reasons.push(clone(a.decisions.decisions[0].unresolved_reasons[0])) }, 'unresolved_reasons')
    await expectInvalid(a => { a.reasons.records.pop() }, 'reasons set mismatch')
    await expectInvalid(a => { a.reasons.records[0].unresolved_reasons=[] }, 'reason-register')
    await expectInvalid(a => { a.decisions.decisions[0].unresolved_reasons[0].detail='contradicts evidence' }, 'unresolved_reasons')
  })
  it('rejects downstream, application-ready, historical contract membership, and progress drift', async () => {
    await expectInvalid(a => { a.decisions.decisions[0].downstream_contract_lane='status-only contract lane' }, 'downstream_contract_lane')
    await expectInvalid(a => { a.decisions.decisions[0].application_ready=true }, 'application_ready')
    await expectInvalid(a => { a.decisions.decisions[0].existing_contract_coverage='covered' }, 'existing_contract_coverage')
    await expectInvalid(a => { a.decisions.public_decision_count=145 }, 'decision totals drift')
  })
  it('rejects hash mapping drift, stale hash, swapped paths, and missing/extra/renamed hash keys', async () => {
    await expectInvalid(a => { delete a.evidence.field_to_path_hash_mapping.pr0049_status_only_contract }, 'hash key set drift')
    await expectInvalid(a => { a.evidence.field_to_path_hash_mapping.extra={ path:'package.json', algorithm:'sha256-canonical-json-v1', sha256:'x' } }, 'hash key set drift')
    await expectInvalid(a => { a.evidence.field_to_path_hash_mapping.renamed=a.evidence.field_to_path_hash_mapping.pr0049_status_only_contract; delete a.evidence.field_to_path_hash_mapping.pr0049_status_only_contract }, 'hash key set drift')
    await expectInvalid(a => { a.evidence.field_to_path_hash_mapping.pr0049_status_only_contract.sha256='0' }, 'stale hash')
    await expectInvalid(a => { a.evidence.field_to_path_hash_mapping.pr0049_status_only_contract.path='package.json' }, 'swapped path')
  })
  it('rejects source-text, private evidence, credentials, mutating SQL, and database/Supabase connection leakage', async () => {
    for (const key of ['source_text','source_excerpt','private_evidence','credentials','environment_values','migration_applied','database_modified_flag','production_modified_flag','cutover_enabled_flag']) await expectInvalid(a => { a.decisions.decisions[0][key]='x' }, 'unsafe key leaked')
    for (const sql of ['UPDATE x','INSERT INTO x','DELETE FROM x','MERGE x','ALTER TABLE x','DROP TABLE x']) await expectInvalid(a => { a.policy.note=sql }, 'mutating SQL token leaked')
    await expectInvalid(a => { a.policy.note='createClient(url, key)' }, 'database/Supabase connection leaked')
    await expectInvalid(a => { a.policy.note='postgres://example' }, 'database/Supabase connection leaked')
  }, 30000)
  it('is deterministic and semantic changes alter hashes', async () => {
    const { records } = await deriveExpectedAdjudications(); const again = await deriveExpectedAdjudications(); expect(hash(records)).toBe(hash(again.records)); expect(hash(records[0])).not.toBe(hash({ ...records[0], final_outcome:'confirm-successor-start' }))
  })
  it('canonical JSON formatting and normalized text line endings are tolerated', async () => {
    const text = await readFile(paths.decisions,'utf8'); expect(canonicalJsonSha256FromValue(JSON.parse(text))).toBe(canonicalJsonSha256FromValue(JSON.parse(text.replace(/\n/g,'\r\n'))))
    const doc = await readFile('docs/content-pipeline/source-review-final-unresolved-adjudication.md','utf8'); expect(createHash('sha256').update(doc.replace(/\r\n?/g,'\n')).digest('hex')).toBe(createHash('sha256').update(doc.replace(/\n/g,'\r\n').replace(/\r\n?/g,'\n')).digest('hex'))
  })
  it('valid generated artifacts pass the independent validator', async () => { await expect(validateArtifacts()).resolves.toMatchObject({ ok:true, original_unresolved_count:11, still_unresolved_count:11, candidate_sources_inspected:candidateSources.length }) })
})
