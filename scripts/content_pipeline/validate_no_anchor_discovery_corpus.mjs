import {
  readFile,
} from 'node:fs/promises'
import {
  sha256LegacyCrlf,
} from './hash_utils.mjs'

const readJson = async (filePath) =>
  JSON.parse(
    await readFile(filePath, 'utf8'),
  )

const [
  policy,
  manifest,
  worklist,
  inspectionPackets,
  audit,
  progress,
  integration,
  corpus,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-no-anchor-discovery-policy.json',
  ),
  readJson(
    'content/sources/manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-packets.json',
  ),
  readJson(
    'content/migration/reading-segment-pending-source-review-audit.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-progress-integration-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-no-anchor-discovery-corpus.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readFile('.gitignore', 'utf8'),
])

const errors = []
const targetPacketIds = new Set(
  policy.target.packet_ids,
)
const targetWorklist = worklist.items.filter(
  (item) => targetPacketIds.has(item.packet_id),
)
const worklistByDecision = new Map(
  targetWorklist.map(
    (item) => [item.decision_id, item],
  ),
)
const targetInspectionItems = inspectionPackets.packets
  .filter(
    (packet) => targetPacketIds.has(packet.packet_id),
  )
  .flatMap((packet) => packet.items)
const inspectionById = new Map(
  targetInspectionItems.map(
    (item) => [item.inspection_id, item],
  ),
)
const sourceByBook = new Map(
  manifest.works.map(
    (work) => [work.book_id, work],
  ),
)

if (
  policy.status !==
    'accepted-for-no-anchor-discovery-corpus-preparation' ||
  corpus.status !==
    'no-anchor-discovery-corpus-prepared-not-reviewed' ||
  corpus.policy_version !== policy.policy_version ||
  corpus.run_id !== worklist.run_id ||
  corpus.rights_status !== 'blocked'
) {
  errors.push(
    'policy, corpus, or migration identity differs',
  )
}

if (
  corpus.contains_full_text !== false ||
  corpus.contains_source_excerpt !== false ||
  corpus.totals?.packet_count !== 8 ||
  corpus.totals?.item_count !== 88 ||
  corpus.totals?.manual_review_completed_count !== 0 ||
  corpus.totals?.review_decision_count !== 0 ||
  corpus.totals?.cumulative_progress_change_count !== 0 ||
  corpus.totals?.boundary_approved_count !== 0 ||
  corpus.totals?.database_change_count !== 0 ||
  corpus.items?.length !== 88
) {
  errors.push('no-anchor corpus totals differ')
}

if (
  corpus.totals.evidence_prepared_count +
    corpus.totals.evidence_ambiguous_count +
    corpus.totals.evidence_incomplete_count !== 88 ||
  corpus.totals.items_with_pair_candidates +
    corpus.totals.items_without_pair_candidates !== 88
) {
  errors.push(
    'no-anchor evidence-status totals differ',
  )
}

const expectedBookCounts = {
  1: 6,
  2: 70,
  3: 1,
  4: 1,
  5: 10,
}

if (
  JSON.stringify(corpus.counts_by_book) !==
    JSON.stringify(expectedBookCounts)
) {
  errors.push(
    'no-anchor book distribution differs',
  )
}

const expectedPacketCounts = {
  'same-page-no-semantic-anchor-book-1-packet-01': 6,
  'same-page-no-semantic-anchor-book-2-packet-01': 20,
  'same-page-no-semantic-anchor-book-2-packet-02': 20,
  'same-page-no-semantic-anchor-book-2-packet-03': 20,
  'same-page-no-semantic-anchor-book-2-packet-04': 10,
  'same-page-no-semantic-anchor-book-3-packet-01': 1,
  'same-page-no-semantic-anchor-book-4-packet-01': 1,
  'same-page-no-semantic-anchor-book-5-packet-01': 10,
}

if (
  JSON.stringify(corpus.counts_by_packet) !==
    JSON.stringify(expectedPacketCounts)
) {
  errors.push(
    'no-anchor packet distribution differs',
  )
}

const expectedHashes = {
  worklist_sha256: await sha256LegacyCrlf(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  inspection_packets_sha256: await sha256LegacyCrlf(
    'content/migration/reading-segment-source-inspection-packets.json',
  ),
  pending_audit_sha256: await sha256LegacyCrlf(
    'content/migration/reading-segment-pending-source-review-audit.json',
  ),
  progress_sha256: await sha256LegacyCrlf(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  pr0041_integration_sha256: await sha256LegacyCrlf(
    'content/migration/reading-segment-same-page-progress-integration-evidence.json',
  ),
}

for (const [field, expected] of Object.entries(expectedHashes)) {
  if (corpus.input_hashes?.[field] !== expected) {
    errors.push(`${field} differs`)
  }
}

const discoveryIds = new Set()
const decisionIds = new Set()
const inspectionIds = new Set()
const segmentKeys = new Set()

for (const item of corpus.items || []) {
  discoveryIds.add(item.discovery_item_id)
  decisionIds.add(item.decision_id)
  inspectionIds.add(item.inspection_id)
  segmentKeys.add(item.segment_key)

  const baseline = worklistByDecision.get(item.decision_id)
  const inspection = inspectionById.get(item.inspection_id)
  const successor = inspection?.context?.successor

  if (
    !baseline ||
    !inspection ||
    !successor ||
    baseline.inspection_id !== item.inspection_id ||
    baseline.packet_id !== item.packet_id ||
    baseline.segment_key !== item.segment_key ||
    baseline.segment_order !== item.segment_order ||
    baseline.display_title !== item.current_title ||
    baseline.book_id !== item.book_id ||
    baseline.book_slug !== item.book_slug ||
    baseline.inspection_lane !==
      'same-page-no-semantic-anchor' ||
    successor.segment_key !== item.successor_segment_key ||
    successor.display_title !== item.successor_title
  ) {
    errors.push(
      `${item.segment_key}: corpus identity differs`,
    )
  }

  if (
    ![
      'anchor-evidence-prepared-not-reviewed',
      'anchor-evidence-ambiguous-not-reviewed',
      'anchor-evidence-incomplete-not-reviewed',
    ].includes(item.corpus_status) ||
    !Number.isInteger(item.current_anchor_candidate_count) ||
    item.current_anchor_candidate_count < 0 ||
    !Number.isInteger(item.successor_anchor_candidate_count) ||
    item.successor_anchor_candidate_count < 0 ||
    !Number.isInteger(item.pair_candidate_count) ||
    item.pair_candidate_count < 0 ||
    !Number.isInteger(item.public_pair_candidate_count) ||
    item.public_pair_candidate_count < 0 ||
    item.public_pair_candidate_count >
      policy.discovery_rules.maximum_public_pair_candidates ||
    item.pair_candidates?.length !==
      item.public_pair_candidate_count ||
    item.manual_review_required !== true ||
    item.manual_review_completed !== false ||
    item.selected_decision !== null ||
    item.reviewer_confidence !== null ||
    item.boundary_decision_recorded !== false ||
    item.boundary_approved !== false ||
    item.source_text_included !== false ||
    item.source_excerpt_included !== false ||
    item.database_change_applied !== false ||
    item.content_approved !== false ||
    item.content_loaded !== false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: preparation boundary differs`,
    )
  }

  if (
    JSON.stringify(item.review_questions) !==
      JSON.stringify(policy.review_questions)
  ) {
    errors.push(
      `${item.segment_key}: review questions differ`,
    )
  }

  if (
    item.corpus_status ===
      'anchor-evidence-incomplete-not-reviewed'
  ) {
    if (item.selected_pair !== null) {
      errors.push(
        `${item.segment_key}: incomplete evidence must not select a pair`,
      )
    }
  } else {
    const pair = item.selected_pair

    if (
      !pair ||
      item.pair_candidate_count < 1 ||
      pair.current_precedes_successor !== true ||
      pair.current?.anchor_score <= 0 ||
      pair.successor?.anchor_score <= 0 ||
      pair.pair_score <= 0 ||
      pair.source_pdf_page_gap < 0 ||
      pair.source_pdf_page_gap >
        policy.discovery_rules.maximum_pair_page_gap
    ) {
      errors.push(
        `${item.segment_key}: selected semantic pair differs`,
      )
    }

    if (
      item.corpus_status ===
        'anchor-evidence-prepared-not-reviewed' &&
      item.pair_ambiguous !== false
    ) {
      errors.push(
        `${item.segment_key}: prepared evidence cannot be ambiguous`,
      )
    }

    if (
      item.corpus_status ===
        'anchor-evidence-ambiguous-not-reviewed' &&
      item.pair_ambiguous !== true
    ) {
      errors.push(
        `${item.segment_key}: ambiguous evidence must be marked`,
      )
    }
  }
}

if (
  discoveryIds.size !== 88 ||
  decisionIds.size !== 88 ||
  inspectionIds.size !== 88 ||
  segmentKeys.size !== 88
) {
  errors.push(
    'no-anchor corpus identifiers must be unique',
  )
}

if (corpus.sources?.length !== 5) {
  errors.push('no-anchor source list differs')
} else {
  for (const corpusSource of corpus.sources) {
    const source = sourceByBook.get(corpusSource.book_id)

    if (
      !source ||
      corpusSource.book_slug !== source.slug ||
      corpusSource.source_file !== source.source_file ||
      corpusSource.source_sha256 !== source.source_sha256 ||
      corpusSource.pdf_page_count !== source.pdf_page_count
    ) {
      errors.push(
        `Book ${corpusSource.book_id}: source identity differs`,
      )
    }
  }
}

if (
  progress.status !==
    'same-page-review-integrated-not-applied' ||
  progress.totals?.reviewed_count !== 54 ||
  progress.totals?.unresolved_count !== 2 ||
  progress.totals?.pending_count !== 88 ||
  progress.totals?.public_decision_count !== 56 ||
  progress.totals?.completed_packet_count !== 8 ||
  progress.totals?.pending_packet_count !== 8 ||
  integration.preserved_pending_lane?.packet_count !== 8 ||
  integration.preserved_pending_lane?.item_count !== 88
) {
  errors.push(
    'PR-0041 cumulative progress changed',
  )
}

if (
  audit.totals?.same_page_no_semantic_anchor_count !== 88 ||
  audit.totals?.pending_item_count !== 126 ||
  audit.totals?.pending_packet_count !== 12
) {
  errors.push('historical pending audit changed')
}

const publicText = JSON.stringify(corpus)

for (const forbidden of policy.forbidden_public_fields || []) {
  if (
    publicText
      .toLowerCase()
      .includes(`"${forbidden.toLowerCase()}":`)
  ) {
    errors.push(
      `forbidden public field found: ${forbidden}`,
    )
  }
}

for (const [field, value] of Object.entries(
  corpus.preparation_boundary || {},
)) {
  if (
    [
      'canonical_sources_read_locally',
      'semantic_anchor_candidates_generated',
      'private_evidence_generated',
      'public_corpus_generated',
    ].includes(field)
  ) {
    if (value !== true) {
      errors.push(`${field} must be true`)
    }
  } else if (value !== false) {
    errors.push(`${field} must remain false`)
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
  application.totals?.target_content_review_count !== 166 ||
  application.totals?.unaffected_boundary_review_count !== 646 ||
  application.totals?.content_row_count !== 0 ||
  application.totals?.successor_mapping_count !== 0 ||
  application.totals?.dependency_snapshot_count !== 0 ||
  application.totals?.production_section_count !== 908 ||
  application.application_boundary?.cutover_enabled !== false
) {
  errors.push(
    'verified database state changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'No-anchor discovery corpus validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated the complete 88-item no-anchor discovery corpus.',
)
console.log(
  `Evidence prepared: ${corpus.totals.evidence_prepared_count}.`,
)
console.log(
  `Evidence ambiguous: ${corpus.totals.evidence_ambiguous_count}.`,
)
console.log(
  `Evidence incomplete: ${corpus.totals.evidence_incomplete_count}.`,
)
console.log(
  'Validated public/private semantic-anchor evidence separation.',
)
console.log(
  'No review decision, cumulative progress change, database change, or cutover was introduced.',
)
