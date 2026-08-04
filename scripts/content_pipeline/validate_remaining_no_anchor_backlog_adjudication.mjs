import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256, HASH_ALGORITHMS } from './hash_utils.mjs'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const [policy, decisions, plan, corpus, currentProgress, historicalProgress, pr0044, gitignore] = await Promise.all([
  readJson('content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-policy.json'),
  readJson('content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json'),
  readJson('content/migration/reading-segment-remaining-no-anchor-backlog-integration-plan.json'),
  readJson('content/migration/reading-segment-no-anchor-discovery-corpus.json'),
  readJson('content/migration/reading-segment-source-review-progress-current.json'),
  readJson('content/migration/reading-segment-source-review-progress.json'),
  readJson('content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json'),
  readFile('.gitignore', 'utf8'),
])
const errors = []
const expectedTotals = {
  eligible_item_count: 63,
  decision_count: 63,
  resolved_count: 63,
  unresolved_count: 0,
  confirm_successor_start_count: 63,
  adjust_successor_start_count: 0,
  merge_with_successor_count: 0,
  candidate_override_count: 0,
  manual_review_completed_count: 63,
  cumulative_progress_change_count: 0,
  boundary_approved_count: 0,
  database_change_count: 0,
}
const ordered = (item) => [item.book_id, item.packet_id, item.segment_order, item.segment_key]
const sameKey = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b))
const candidateScore = (candidate) => candidate.pair_score ?? Number.NEGATIVE_INFINITY

if (policy.status !== 'accepted-for-remaining-no-anchor-backlog-adjudication' || decisions.status !== 'remaining-no-anchor-backlog-adjudication-recorded-not-integrated' || plan.status !== 'remaining-no-anchor-backlog-integration-planned-for-pr-0047-not-applied') errors.push('artifact status differs')
if (policy.hash_algorithm !== HASH_ALGORITHMS.canonicalJsonSha256 || decisions.policy_version !== policy.policy_version || plan.policy_version !== policy.policy_version) errors.push('policy identity or hash algorithm differs')
for (const [key, expected] of Object.entries(expectedTotals)) if (decisions.totals?.[key] !== expected) errors.push(`${key}: expected ${expected}; received ${decisions.totals?.[key]}`)
if (decisions.contains_full_text !== false || decisions.contains_source_excerpt !== false || decisions.rights_status !== 'blocked') errors.push('public content boundary differs')

const pr0044Keys = new Set(pr0044.decisions.map((decision) => decision.segment_key))
const eligible = corpus.items.filter((item) => item.corpus_status === 'anchor-evidence-prepared-not-reviewed' && !pr0044Keys.has(item.segment_key)).sort((a, b) => a.book_id - b.book_id || a.packet_id.localeCompare(b.packet_id) || a.segment_order - b.segment_order || a.segment_key.localeCompare(b.segment_key))
if (eligible.length !== 63 || new Set(eligible.map((item) => item.segment_key)).size !== 63) errors.push('eligible item count or uniqueness differs')
if (!eligible.every((item) => item.inspection_lane === 'same-page-no-semantic-anchor' && item.selected_pair && item.selected_pair.current_precedes_successor === true && item.public_pair_candidate_count > 0)) errors.push('eligible public evidence or lane differs')
if (new Set(eligible.map((item) => item.packet_id)).size !== 8) errors.push('eligible packet coverage differs')
const eligibleBySegment = new Map(eligible.map((item) => [item.segment_key, item]))
const sortedDecisions = [...(decisions.decisions || [])].sort((a, b) => a.book_id - b.book_id || a.packet_id.localeCompare(b.packet_id) || a.segment_order - b.segment_order || a.segment_key.localeCompare(b.segment_key))
if (sortedDecisions.length !== 63 || sortedDecisions.some((decision, index) => !sameKey(decision, eligible[index]))) errors.push('decision ordering or eligible coverage differs')

const ids = new Set()
const segmentKeys = new Set()
const outcomeCounts = { 'confirm-successor-start': 0, 'adjust-successor-start': 0, 'merge-with-successor': 0, unresolved: 0 }
const confidenceCounts = { high: 0, medium: 0, low: 0 }
const packetCounts = new Map()
const bookCounts = new Map()
let firstSelections = 0
let nonFirstSelections = 0
let singleCandidateItems = 0
let multiCandidateItems = 0
let duplicateRationales = 0
const rationales = new Map()
for (const decision of decisions.decisions || []) {
  ids.add(decision.adjudication_id)
  segmentKeys.add(decision.segment_key)
  const item = eligibleBySegment.get(decision.segment_key)
  if (!item) errors.push(`${decision.segment_key}: decision is ineligible or overlaps PR-0044`)
  if (pr0044Keys.has(decision.segment_key)) errors.push(`${decision.segment_key}: overlaps PR-0044`)
  if (item && (decision.discovery_item_id !== item.discovery_item_id || decision.decision_id !== item.decision_id || decision.inspection_id !== item.inspection_id || decision.packet_id !== item.packet_id || decision.public_evidence_ref?.discovery_item_id !== item.discovery_item_id)) errors.push(`${decision.segment_key}: evidence reference or item identity differs`)
  const candidates = item?.pair_candidates || []
  if (candidates.length === 1) singleCandidateItems += 1
  if (candidates.length > 1) multiCandidateItems += 1
  const selected = Number.isInteger(decision.selected_candidate_index) ? candidates[decision.selected_candidate_index] : null
  const strongest = candidates.reduce((best, candidate) => candidateScore(candidate) > candidateScore(best) ? candidate : best, candidates[0])
  if (!selected || JSON.stringify(selected) !== JSON.stringify(decision.selected_pair)) errors.push(`${decision.segment_key}: selected candidate/index mismatch`)
  if (selected && JSON.stringify(selected) !== JSON.stringify(item.selected_pair)) errors.push(`${decision.segment_key}: selected candidate differs from corpus selected_pair`)
  if (selected && JSON.stringify(selected) !== JSON.stringify(strongest)) errors.push(`${decision.segment_key}: selected candidate is not strongest public pair`)
  if (candidates.some((candidate) => candidateScore(candidate) > candidateScore(selected))) errors.push(`${decision.segment_key}: another candidate has a stronger public score`)
  if (decision.selected_candidate_index === 0) firstSelections += 1
  else nonFirstSelections += 1
  if (!['confirm-successor-start', 'adjust-successor-start', 'merge-with-successor', 'unresolved'].includes(decision.selected_outcome)) errors.push(`${decision.segment_key}: invalid outcome`)
  if (!['high', 'medium', 'low'].includes(decision.reviewer_confidence)) errors.push(`${decision.segment_key}: invalid confidence`)
  if (decision.selected_outcome !== 'confirm-successor-start' || decision.review_status !== 'reviewed' || decision.selected_candidate_index !== 0 || decision.candidate_override !== false) errors.push(`${decision.segment_key}: unexpected PR-0046 outcome`)
  if (decision.reviewer_confidence === 'high' && !(item.public_pair_candidate_count === 1 || selected?.same_source_pdf_page === true)) errors.push(`${decision.segment_key}: high-confidence rule mismatch`)
  if (decision.reviewer_confidence === 'medium' && !(item.public_pair_candidate_count > 1 && selected?.same_source_pdf_page === false && selected?.current_precedes_successor === true && item.pair_ambiguous === false)) errors.push(`${decision.segment_key}: medium-confidence rule mismatch`)
  if (decision.source_text_included !== false || decision.source_excerpt_included !== false || decision.private_evidence_included !== false || decision.boundary_approved !== false || decision.database_change_applied !== false || decision.cutover_enabled !== false) errors.push(`${decision.segment_key}: application/content boundary differs`)
  if (!decision.public_rationale?.includes(decision.segment_key) || !decision.public_rationale?.includes(decision.current_title) || !decision.public_rationale?.includes(decision.successor_title) || !decision.public_rationale?.includes(String(selected?.pair_score))) errors.push(`${decision.segment_key}: rationale lacks item-specific public evidence facts`)
  rationales.set(decision.public_rationale, (rationales.get(decision.public_rationale) || 0) + 1)
  outcomeCounts[decision.selected_outcome] += 1
  confidenceCounts[decision.reviewer_confidence] += 1
  packetCounts.set(decision.packet_id, (packetCounts.get(decision.packet_id) || 0) + 1)
  bookCounts.set(String(decision.book_id), (bookCounts.get(String(decision.book_id)) || 0) + 1)
}
for (const count of rationales.values()) if (count > 1) duplicateRationales += count - 1
if (ids.size !== 63 || segmentKeys.size !== 63) errors.push('duplicate decision ids or duplicate segment keys detected')
if (firstSelections !== 63 || nonFirstSelections !== 0 || singleCandidateItems !== 2 || multiCandidateItems !== 61) errors.push('candidate-index distribution differs')
if (duplicateRationales !== 0 || rationales.size !== 63) errors.push('rationale uniqueness differs')
if (JSON.stringify(outcomeCounts) !== JSON.stringify(decisions.counts_by_outcome)) errors.push('outcome totals inconsistent with decisions')
if (JSON.stringify(Object.fromEntries(Object.entries(confidenceCounts).filter(([, count]) => count > 0))) !== JSON.stringify(decisions.counts_by_confidence)) errors.push('confidence totals inconsistent with decisions')
if (JSON.stringify(Object.fromEntries([...bookCounts.entries()].sort())) !== JSON.stringify({ 1: 5, 2: 49, 3: 1, 4: 1, 5: 7 })) errors.push('book distribution differs')
if (JSON.stringify(Object.fromEntries([...packetCounts.entries()].sort())) !== JSON.stringify({ 'same-page-no-semantic-anchor-book-1-packet-01': 5, 'same-page-no-semantic-anchor-book-2-packet-01': 11, 'same-page-no-semantic-anchor-book-2-packet-02': 16, 'same-page-no-semantic-anchor-book-2-packet-03': 14, 'same-page-no-semantic-anchor-book-2-packet-04': 8, 'same-page-no-semantic-anchor-book-3-packet-01': 1, 'same-page-no-semantic-anchor-book-4-packet-01': 1, 'same-page-no-semantic-anchor-book-5-packet-01': 7 })) errors.push('packet distribution differs')

if (currentProgress.totals?.reviewed_count !== 70 || currentProgress.totals?.unresolved_count !== 11 || currentProgress.totals?.pending_count !== 63 || currentProgress.totals?.public_decision_count !== 81 || currentProgress.totals?.completed_packet_count !== 8 || currentProgress.totals?.pending_packet_count !== 8) errors.push('current progress changed unexpectedly')
if (historicalProgress.totals?.reviewed_count !== 54 || historicalProgress.totals?.unresolved_count !== 2 || historicalProgress.totals?.pending_count !== 88 || historicalProgress.totals?.public_decision_count !== 56) errors.push('historical progress changed unexpectedly')
if (JSON.stringify(plan.current_state) !== JSON.stringify({ reviewed_count: 70, unresolved_count: 11, pending_count: 63, public_decision_count: 81, completed_packet_count: 8, pending_packet_count: 8 }) || JSON.stringify(plan.planned_delta) !== JSON.stringify({ reviewed_count: 63, unresolved_count: 0, pending_count: -63, public_decision_count: 63, completed_packet_count: 8, pending_packet_count: -8 }) || JSON.stringify(plan.projected_state) !== JSON.stringify({ reviewed_count: 133, unresolved_count: 11, pending_count: 0, public_decision_count: 144, completed_packet_count: 16, pending_packet_count: 0 })) errors.push('integration projection differs')
const expectedHashes = {
  historical_progress: await canonicalJsonSha256('content/migration/reading-segment-source-review-progress.json'),
  current_progress: await canonicalJsonSha256('content/migration/reading-segment-source-review-progress-current.json'),
  discovery_corpus: await canonicalJsonSha256('content/migration/reading-segment-no-anchor-discovery-corpus.json'),
  pr0044_decisions: await canonicalJsonSha256('content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json'),
}
for (const [name, hash] of Object.entries(expectedHashes)) {
  if (decisions.input_hashes?.[name]?.hash_algorithm !== HASH_ALGORITHMS.canonicalJsonSha256 || decisions.input_hashes?.[name]?.sha256 !== hash) errors.push(`${name} canonical hash differs`)
}
if (!gitignore.split(/\r?\n/).includes('.vereda-private/')) errors.push('private workspace is not ignored')
if (errors.length) {
  console.error('Remaining no-anchor backlog adjudication validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log('Remaining no-anchor backlog adjudication validation passed: 63 decisions, 63 strongest public candidate selections, 63 item-specific rationales; integration deferred.')
