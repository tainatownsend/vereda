import {
  createHash,
} from 'node:crypto'
import {
  readFile,
} from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(
    await readFile(filePath, 'utf8'),
  )

const sha256 = async (filePath) =>
  createHash('sha256')
    .update(
      await readFile(filePath),
    )
    .digest('hex')

const [
  policy,
  corpus,
  packet,
  progress,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-no-anchor-ambiguous-review-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-no-anchor-discovery-corpus.json',
  ),
  readJson(
    'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readFile('.gitignore', 'utf8'),
])

const errors = []

if (
  policy.status !==
    'accepted-for-no-anchor-ambiguous-review-packet' ||
  packet.status !==
    'no-anchor-ambiguous-review-packet-prepared-not-reviewed' ||
  packet.policy_version !==
    policy.policy_version ||
  packet.run_id !==
    corpus.run_id ||
  packet.rights_status !==
    'blocked'
) {
  errors.push(
    'policy, packet, or migration identity differs',
  )
}

if (
  corpus.status !==
    'no-anchor-discovery-corpus-prepared-not-reviewed' ||
  corpus.totals?.item_count !== 88 ||
  corpus.totals?.evidence_prepared_count !== 63 ||
  corpus.totals?.evidence_ambiguous_count !== 25 ||
  corpus.totals?.evidence_incomplete_count !== 0 ||
  corpus.totals?.items_with_pair_candidates !== 88
) {
  errors.push(
    'PR-0042 corpus totals differ',
  )
}

if (
  packet.contains_full_text !== false ||
  packet.contains_source_excerpt !==
    false ||
  packet.totals?.item_count !== 25 ||
  packet.totals
    ?.manual_review_required_count !== 25 ||
  packet.totals
    ?.manual_review_completed_count !== 0 ||
  packet.totals
    ?.review_decision_count !== 0 ||
  packet.totals
    ?.prepared_lane_preserved_count !== 63 ||
  packet.totals
    ?.cumulative_progress_change_count !== 0 ||
  packet.totals
    ?.boundary_approved_count !== 0 ||
  packet.totals
    ?.database_change_count !== 0 ||
  packet.items?.length !== 25
) {
  errors.push(
    'review-packet totals differ',
  )
}

const ambiguous = corpus.items.filter(
  (item) =>
    item.corpus_status ===
    'anchor-evidence-ambiguous-not-reviewed',
)
const prepared = corpus.items.filter(
  (item) =>
    item.corpus_status ===
    'anchor-evidence-prepared-not-reviewed',
)
const ambiguousById = new Map(
  ambiguous.map(
    (item) => [
      item.discovery_item_id,
      item,
    ],
  ),
)
const expectedBookCounts = new Map()
const expectedPacketCounts = new Map()

for (const item of ambiguous) {
  expectedBookCounts.set(
    String(item.book_id),
    (
      expectedBookCounts.get(
        String(item.book_id),
      ) || 0
    ) + 1,
  )
  expectedPacketCounts.set(
    item.packet_id,
    (
      expectedPacketCounts.get(
        item.packet_id,
      ) || 0
    ) + 1,
  )
}

if (
  ambiguous.length !== 25 ||
  prepared.length !== 63
) {
  errors.push(
    'ambiguous or prepared corpus coverage differs',
  )
}

for (const [
  bookId,
  count,
] of expectedBookCounts) {
  if (
    packet.counts_by_book?.[bookId] !==
    count
  ) {
    errors.push(
      `Book ${bookId}: ambiguous count differs`,
    )
  }
}

for (const [
  packetId,
  count,
] of expectedPacketCounts) {
  if (
    packet.counts_by_packet?.[packetId] !==
    count
  ) {
    errors.push(
      `${packetId}: ambiguous count differs`,
    )
  }
}

if (
  Object.keys(
    packet.counts_by_book || {},
  ).length !==
    expectedBookCounts.size ||
  Object.keys(
    packet.counts_by_packet || {},
  ).length !==
    expectedPacketCounts.size ||
  packet.totals?.batch_count !==
    expectedPacketCounts.size ||
  packet.review_batches?.length !==
    expectedPacketCounts.size
) {
  errors.push(
    'book, packet, or batch cardinality differs',
  )
}

const packetItemIds = new Set()
const discoveryIds = new Set()
const decisionIds = new Set()
const segmentKeys = new Set()
let candidateTotal = 0
let minimumCandidates =
  Number.POSITIVE_INFINITY
let maximumCandidates = 0

for (const item of packet.items || []) {
  packetItemIds.add(
    item.review_packet_item_id,
  )
  discoveryIds.add(
    item.discovery_item_id,
  )
  decisionIds.add(
    item.decision_id,
  )
  segmentKeys.add(
    item.segment_key,
  )

  const source =
    ambiguousById.get(
      item.discovery_item_id,
    )

  if (
    !source ||
    item.decision_id !==
      source.decision_id ||
    item.inspection_id !==
      source.inspection_id ||
    item.packet_id !==
      source.packet_id ||
    item.run_id !==
      source.run_id ||
    item.book_id !==
      source.book_id ||
    item.book_slug !==
      source.book_slug ||
    item.segment_key !==
      source.segment_key ||
    item.segment_order !==
      source.segment_order ||
    item.current_title !==
      source.current_title ||
    item.successor_segment_key !==
      source.successor_segment_key ||
    item.successor_title !==
      source.successor_title ||
    item.source_corpus_status !==
      'anchor-evidence-ambiguous-not-reviewed' ||
    item.pair_ambiguous !== true ||
    item.pair_score_gap !==
      source.pair_score_gap
  ) {
    errors.push(
      `${item.segment_key}: source identity differs`,
    )
  }

  if (
    !Number.isInteger(
      item.candidate_count,
    ) ||
    item.candidate_count <
      policy.candidate_rules
        .minimum_public_pair_candidates ||
    item.candidate_count >
      policy.candidate_rules
        .maximum_public_pair_candidates ||
    item.candidates?.length !==
      item.candidate_count
  ) {
    errors.push(
      `${item.segment_key}: candidate count differs`,
    )
    continue
  }

  candidateTotal +=
    item.candidate_count
  minimumCandidates = Math.min(
    minimumCandidates,
    item.candidate_count,
  )
  maximumCandidates = Math.max(
    maximumCandidates,
    item.candidate_count,
  )

  for (
    let index = 0;
    index < item.candidates.length;
    index += 1
  ) {
    const candidate =
      item.candidates[index]
    const sourceCandidate =
      source.pair_candidates[index]

    if (
      candidate.candidate_index !==
        index ||
      candidate.candidate_number !==
        index + 1 ||
      candidate.pair_score !==
        sourceCandidate?.pair_score ||
      candidate
        .current_precedes_successor !==
        true ||
      candidate.current
        ?.source_pdf_page <= 0 ||
      candidate.successor
        ?.source_pdf_page <= 0 ||
      candidate.successor
        ?.source_pdf_page <
        candidate.current
          ?.source_pdf_page ||
      candidate.source_pdf_page_gap <
        0 ||
      candidate.pair_score <= 0 ||
      candidate.score_delta_from_top <
        0
    ) {
      errors.push(
        `${item.segment_key}: candidate ${index} differs`,
      )
    }
  }

  if (
    JSON.stringify(
      item.allowed_review_outcomes,
    ) !==
    JSON.stringify(
      policy.review_outcomes,
    ) ||
    JSON.stringify(
      item.review_questions,
    ) !==
    JSON.stringify(
      policy.review_questions,
    ) ||
    item.review_status !==
      'packet-prepared-not-reviewed' ||
    item.selected_candidate_index !==
      null ||
    item.selected_outcome !== null ||
    item.reviewer_confidence !== null ||
    item.manual_review_required !==
      true ||
    item.manual_review_completed !==
      false ||
    item.review_questions_answered !==
      false ||
    item.boundary_decision_recorded !==
      false ||
    item.boundary_approved !== false ||
    item.source_text_included !==
      false ||
    item.source_excerpt_included !==
      false ||
    item.database_change_applied !==
      false ||
    item.content_approved !== false ||
    item.content_loaded !== false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: review boundary differs`,
    )
  }
}

if (
  packetItemIds.size !== 25 ||
  discoveryIds.size !== 25 ||
  decisionIds.size !== 25 ||
  segmentKeys.size !== 25 ||
  discoveryIds.size !==
    ambiguousById.size
) {
  errors.push(
    'review-packet identifiers must be unique and complete',
  )
}

if (
  packet.totals?.candidate_count !==
    candidateTotal ||
  packet.totals
    ?.minimum_candidates_per_item !==
    minimumCandidates ||
  packet.totals
    ?.maximum_candidates_per_item !==
    maximumCandidates
) {
  errors.push(
    'candidate aggregate totals differ',
  )
}

const batchedIds = []

for (
  const batch of
  packet.review_batches || []
) {
  const expected =
    expectedPacketCounts.get(
      batch.packet_id,
    )

  batchedIds.push(
    ...(
      batch.review_packet_item_ids ||
      []
    ),
  )

  if (
    !expected ||
    batch.item_count !== expected ||
    batch.review_packet_item_ids
      ?.length !== expected ||
    batch.status !==
      'packet-prepared-not-reviewed' ||
    batch
      .manual_review_completed_count !==
      0 ||
    batch.review_decision_count !== 0
  ) {
    errors.push(
      `${batch.packet_id}: review batch differs`,
    )
  }
}

if (
  batchedIds.length !== 25 ||
  new Set(batchedIds).size !== 25 ||
  JSON.stringify(
    [...batchedIds].sort(),
  ) !==
  JSON.stringify(
    [...packetItemIds].sort(),
  )
) {
  errors.push(
    'review batches do not cover every item exactly once',
  )
}

if (
  packet.input_hashes
    ?.discovery_corpus_sha256 !==
    await sha256(
      'content/migration/reading-segment-no-anchor-discovery-corpus.json',
    ) ||
  packet.input_hashes
    ?.progress_sha256 !==
    await sha256(
      'content/migration/reading-segment-source-review-progress.json',
    ) ||
  !/^[a-f0-9]{64}$/.test(
    packet.private_input_evidence
      ?.private_json_sha256 || '',
  ) ||
  packet.private_input_evidence
    ?.private_sources_committed !==
    false
) {
  errors.push(
    'packet input evidence differs',
  )
}

if (
  progress.status !==
    'same-page-review-integrated-not-applied' ||
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.reviewed_count !== 54 ||
  progress.totals?.unresolved_count !== 2 ||
  progress.totals?.pending_count !== 88 ||
  progress.totals
    ?.public_decision_count !== 56 ||
  progress.totals
    ?.completed_packet_count !== 8 ||
  progress.totals
    ?.pending_packet_count !== 8 ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'cumulative progress changed',
  )
}

const publicText =
  JSON.stringify(packet)

for (const forbidden of
  policy.forbidden_public_fields || []) {
  if (
    publicText
      .toLowerCase()
      .includes(
        `"${forbidden.toLowerCase()}":`,
      )
  ) {
    errors.push(
      `forbidden public field found: ${forbidden}`,
    )
  }
}

for (const [
  field,
  value,
] of Object.entries(
  packet.preparation_boundary || {},
)) {
  if (
    [
      'private_discovery_evidence_read',
      'ambiguous_items_isolated',
      'private_review_packet_generated',
      'public_review_packet_generated',
    ].includes(field)
  ) {
    if (value !== true) {
      errors.push(
        `${field} must be true`,
      )
    }
  } else if (value !== false) {
    errors.push(
      `${field} must remain false`,
    )
  }
}

if (
  !gitignore
    .split(/\r?\n/)
    .includes('.vereda-private/')
) {
  errors.push(
    'private workspace is not ignored by Git',
  )
}

if (
  application.totals
    ?.target_content_review_count !== 166 ||
  application.totals
    ?.unaffected_boundary_review_count !== 646 ||
  application.totals
    ?.content_row_count !== 0 ||
  application.totals
    ?.successor_mapping_count !== 0 ||
  application.totals
    ?.dependency_snapshot_count !== 0 ||
  application.totals
    ?.production_section_count !== 908 ||
  application.application_boundary
    ?.cutover_enabled !== false
) {
  errors.push(
    'verified database state changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'No-anchor ambiguous review-packet validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated the complete 25-item ambiguous no-anchor review packet.',
)
console.log(
  `Validated ${packet.totals.batch_count} deterministic review batches.`,
)
console.log(
  `Validated ${packet.totals.candidate_count} public pair candidates.`,
)
console.log(
  'Validated preservation of all 63 prepared discovery items.',
)
console.log(
  'No manual decision, cumulative progress change, database change, or cutover was introduced.',
)
