import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256, HASH_ALGORITHMS } from './hash_utils.mjs'
import { canResolveConfirmSuccessorStart, deriveDecisionTotals, selectedCandidateIndex } from './remaining_no_anchor_backlog_rules.mjs'

export const PR0046_CURRENT_PROGRESS_SNAPSHOT = 'content/migration/reading-segment-source-review-progress-pr0045-current.json'
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

export const validateRemainingNoAnchorBacklogAdjudication = async ({ currentProgressPath = PR0046_CURRENT_PROGRESS_SNAPSHOT } = {}) => {
const [policy, decisions, plan, corpus, currentProgress, historicalProgress, pr0044, gitignore] = await Promise.all([
  readJson('content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-policy.json'),
  readJson('content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json'),
  readJson('content/migration/reading-segment-remaining-no-anchor-backlog-integration-plan.json'),
  readJson('content/migration/reading-segment-no-anchor-discovery-corpus.json'),
  readJson(currentProgressPath),
  readJson('content/migration/reading-segment-source-review-progress.json'),
  readJson('content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json'),
  readFile('.gitignore', 'utf8'),
])
const errors = []
const ordered = (item) => [item.book_id, item.packet_id, item.segment_order, item.segment_key]
const sameKey = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b))
const increment = (object, key) => {
  object[key] = (object[key] || 0) + 1
}

if (policy.status !== 'accepted-for-remaining-no-anchor-backlog-adjudication' || decisions.status !== 'remaining-no-anchor-backlog-adjudication-recorded-not-integrated' || plan.status !== 'remaining-no-anchor-backlog-integration-planned-for-pr-0047-not-applied') errors.push('artifact status differs')
if (policy.hash_algorithm !== HASH_ALGORITHMS.canonicalJsonSha256 || decisions.policy_version !== policy.policy_version || plan.policy_version !== policy.policy_version) errors.push('policy identity or hash algorithm differs')
if (policy.rights_status !== 'credited-source-edition' || decisions.rights_status !== 'credited-source-edition') errors.push('rights status differs from credited source edition')
if (decisions.contains_full_text !== false || decisions.contains_source_excerpt !== false) errors.push('public content boundary differs')

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
const confidenceCounts = {}
const packetCounts = {}
const bookOutcomeCounts = {}
const packetOutcomeCounts = {}
const candidateIndexCounts = {}
let uniqueHighestCount = 0
let tiedHighestCount = 0
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
  const { canResolve, selectedIndex, topCandidates } = canResolveConfirmSuccessorStart(item)
  if (topCandidates.length === 1) uniqueHighestCount += 1
  if (topCandidates.length > 1) tiedHighestCount += 1
  const selected = Number.isInteger(decision.selected_candidate_index) ? candidates[decision.selected_candidate_index] : null
  if (selectedCandidateIndex(candidates, item?.selected_pair) !== selectedIndex) errors.push(`${decision.segment_key}: selected-pair index calculation differs`)
  if (decision.selected_outcome === 'unresolved') {
    if (canResolve || decision.review_status !== 'unresolved' || decision.selected_candidate_index !== null || decision.selected_pair !== null || decision.reviewer_confidence !== 'low') errors.push(`${decision.segment_key}: unresolved decision does not match evidence rule`)
  } else if (decision.selected_outcome === 'confirm-successor-start') {
    if (!canResolve || decision.review_status !== 'reviewed' || decision.selected_candidate_index !== selectedIndex || JSON.stringify(selected) !== JSON.stringify(decision.selected_pair) || JSON.stringify(selected) !== JSON.stringify(item.selected_pair)) errors.push(`${decision.segment_key}: resolved decision does not match unique-strongest evidence rule`)
  } else {
    errors.push(`${decision.segment_key}: unsupported PR-0046 outcome`)
  }
  if (!['high', 'medium', 'low'].includes(decision.reviewer_confidence)) errors.push(`${decision.segment_key}: invalid confidence`)
  if (decision.selected_outcome === 'confirm-successor-start') {
    if (decision.reviewer_confidence === 'high' && !(item.public_pair_candidate_count === 1 || selected?.same_source_pdf_page === true)) errors.push(`${decision.segment_key}: high-confidence rule mismatch`)
    if (decision.reviewer_confidence === 'medium' && !(item.public_pair_candidate_count > 1 && selected?.same_source_pdf_page === false && selected?.current_precedes_successor === true && item.pair_ambiguous === false && topCandidates.length === 1)) errors.push(`${decision.segment_key}: medium-confidence rule mismatch`)
  }
  const expectedOverride = Number.isInteger(decision.selected_candidate_index) && decision.selected_candidate_index !== 0
  if (decision.candidate_override !== expectedOverride) errors.push(`${decision.segment_key}: candidate override flag differs`)
  if (decision.source_text_included !== false || decision.source_excerpt_included !== false || decision.private_evidence_included !== false || decision.boundary_approved !== false || decision.database_change_applied !== false || decision.cutover_enabled !== false) errors.push(`${decision.segment_key}: application/content boundary differs`)
  if (!decision.public_rationale?.includes(decision.segment_key) || !decision.public_rationale?.includes(decision.current_title) || !decision.public_rationale?.includes(decision.successor_title) || (selected && !decision.public_rationale?.includes(String(selected.pair_score)))) errors.push(`${decision.segment_key}: rationale lacks item-specific public evidence facts`)
  rationales.set(decision.public_rationale, (rationales.get(decision.public_rationale) || 0) + 1)
  increment(confidenceCounts, decision.reviewer_confidence)
  increment(packetCounts, decision.packet_id)
  increment(candidateIndexCounts, decision.selected_candidate_index === null ? 'null' : String(decision.selected_candidate_index))
  bookOutcomeCounts[String(decision.book_id)] ||= {}
  packetOutcomeCounts[decision.packet_id] ||= {}
  increment(bookOutcomeCounts[String(decision.book_id)], decision.selected_outcome)
  increment(packetOutcomeCounts[decision.packet_id], decision.selected_outcome)
}
for (const count of rationales.values()) if (count > 1) duplicateRationales += count - 1
if (ids.size !== 63 || segmentKeys.size !== 63) errors.push('duplicate decision ids or duplicate segment keys detected')
if (uniqueHighestCount + tiedHighestCount !== 63) errors.push('unique/tied highest score accounting differs')
if (duplicateRationales !== 0 || rationales.size !== 63) errors.push('rationale uniqueness differs')

const derivedTotals = deriveDecisionTotals(decisions.decisions || [])
if (derivedTotals.eligible_item_count !== 63 || derivedTotals.decision_count !== 63) errors.push('fixed eligibility or decision count differs')
if (JSON.stringify(derivedTotals) !== JSON.stringify(decisions.totals)) errors.push('decision totals inconsistent with individual decisions')
if (JSON.stringify(confidenceCounts) !== JSON.stringify(decisions.counts_by_confidence)) errors.push('confidence totals inconsistent with decisions')
if (JSON.stringify(bookOutcomeCounts) !== JSON.stringify(decisions.counts_by_book)) errors.push('book distribution inconsistent with decisions')
if (JSON.stringify(packetOutcomeCounts) !== JSON.stringify(decisions.counts_by_packet)) errors.push('packet distribution inconsistent with decisions')

if (currentProgress.totals?.reviewed_count !== 70 || currentProgress.totals?.unresolved_count !== 11 || currentProgress.totals?.pending_count !== 63 || currentProgress.totals?.public_decision_count !== 81 || currentProgress.totals?.completed_packet_count !== 8 || currentProgress.totals?.pending_packet_count !== 8) errors.push('current progress changed unexpectedly')
if (historicalProgress.totals?.reviewed_count !== 54 || historicalProgress.totals?.unresolved_count !== 2 || historicalProgress.totals?.pending_count !== 88 || historicalProgress.totals?.public_decision_count !== 56) errors.push('historical progress changed unexpectedly')
const currentState = { reviewed_count: 70, unresolved_count: 11, pending_count: 63, public_decision_count: 81, completed_packet_count: 8, pending_packet_count: 8 }
const pendingByPacket = Object.fromEntries(currentProgress.packets.filter((packet) => packet.inspection_lane === 'same-page-no-semantic-anchor').map((packet) => [packet.packet_id, packet.pending_count]))
const completedPacketDelta = Object.entries(pendingByPacket).filter(([packetId, pendingCount]) => (packetCounts[packetId] || 0) === pendingCount).length
const plannedDelta = { reviewed_count: derivedTotals.resolved_count, unresolved_count: derivedTotals.unresolved_count, pending_count: -derivedTotals.decision_count, public_decision_count: derivedTotals.decision_count, completed_packet_count: completedPacketDelta, pending_packet_count: -completedPacketDelta }
const projectedState = Object.fromEntries(Object.entries(currentState).map(([key, value]) => [key, value + plannedDelta[key]]))
if (JSON.stringify(plan.current_state) !== JSON.stringify(currentState) || JSON.stringify(plan.planned_delta) !== JSON.stringify(plannedDelta) || JSON.stringify(plan.projected_state) !== JSON.stringify(projectedState)) errors.push('integration projection differs')
const expectedHashes = {
  historical_progress: await canonicalJsonSha256('content/migration/reading-segment-source-review-progress.json'),
  current_progress: await canonicalJsonSha256(currentProgressPath),
  discovery_corpus: await canonicalJsonSha256('content/migration/reading-segment-no-anchor-discovery-corpus.json'),
  pr0044_decisions: await canonicalJsonSha256('content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json'),
}
for (const [name, hash] of Object.entries(expectedHashes)) {
  if (decisions.input_hashes?.[name]?.hash_algorithm !== HASH_ALGORITHMS.canonicalJsonSha256 || decisions.input_hashes?.[name]?.sha256 !== hash) errors.push(`${name} canonical hash differs`)
}
if (!gitignore.split(/\r?\n/).includes('.vereda-private/')) errors.push('private workspace is not ignored')
if (currentProgressPath !== PR0046_CURRENT_PROGRESS_SNAPSHOT) errors.push('historical PR-0046 validator must use the archived pre-PR-0047 current snapshot')
if (errors.length) {
  const error = new Error(errors.join('\n'))
  error.errors = errors
  throw error
}
return { decisionCount: derivedTotals.decision_count, uniqueHighestCount, tiedHighestCount }
}

try {
  if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
    const result = await validateRemainingNoAnchorBacklogAdjudication()
    console.log(`Remaining no-anchor backlog adjudication validation passed: ${result.decisionCount} decisions; ${result.uniqueHighestCount} unique highest-score items; ${result.tiedHighestCount} tied highest-score items; integration deferred.`)
  }
} catch (error) {
  console.error('Remaining no-anchor backlog adjudication validation failed:')
  for (const message of error.errors || [error.message]) console.error(`- ${message}`)
  process.exit(1)
}
