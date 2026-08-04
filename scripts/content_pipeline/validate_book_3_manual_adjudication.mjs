import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  packet,
  queue,
  consolidation,
  decisions,
  progress,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-book-3-manual-adjudication-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-book-3-manual-adjudication-packet.json',
  ),
  readJson(
    'content/migration/reading-segment-manual-adjudication-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-unresolved-recovery-consolidation.json',
  ),
  readJson(
    'content/migration/reading-segment-book-3-manual-adjudication-decisions.json',
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
const packetById = new Map(
  packet.packet_items.map(
    (item) => [
      item.packet_item_id,
      item,
    ],
  ),
)
const expectedBySegment = new Map(
  policy.expected_adjudications.map(
    (item) => [
      item.segment_key,
      item,
    ],
  ),
)

if (
  policy.status !==
    'accepted-for-book-3-manual-adjudication' ||
  decisions.status !==
    'book-3-manual-adjudication-recorded-not-applied'
) {
  errors.push(
    'Book 3 policy or decisions status differs',
  )
}

if (
  typeof progress.status !== 'string' ||
  (
    !progress.status.endsWith('-not-applied') &&
    !progress.status.endsWith('-not-reviewed')
  )
) {
  errors.push(
    'cumulative progress status is unsupported',
  )
}

if (
  decisions.policy_version !==
    policy.policy_version ||
  decisions.run_id !==
    packet.run_id ||
  progress.run_id !==
    packet.run_id ||
  decisions.manual_batch_id !==
    packet.manual_batch_id ||
  typeof progress.policy_version !==
    'string' ||
  progress.policy_version.length === 0
) {
  errors.push(
    'Book 3 decision, progress, or migration identity differs',
  )
}

const batch = queue.batches.find(
  (item) =>
    item.batch_id ===
    decisions.manual_batch_id,
)

if (
  !batch ||
  batch.item_count !== 2 ||
  batch.status !==
    'manual-adjudication-required-not-reviewed' ||
  packet.status !==
    'book-3-manual-adjudication-packet-prepared-not-reviewed' ||
  packet.totals?.packet_item_count !== 2 ||
  packet.totals
    ?.manual_review_completed_count !== 0 ||
  consolidation.totals
    ?.still_unresolved_count !== 7
) {
  errors.push(
    'queue, consolidation, or packet baseline differs',
  )
}

if (
  decisions.contains_full_text !== false ||
  decisions.contains_source_excerpt !==
    false ||
  decisions.totals?.item_count !== 2 ||
  decisions.totals?.reviewed_count !== 2 ||
  decisions.totals?.unresolved_count !== 0 ||
  decisions.totals
    ?.exclude_structural_heading_count !== 2 ||
  decisions.totals
    ?.retain_intro_segment_count !== 0 ||
  decisions.totals
    ?.high_confidence_count !== 2 ||
  decisions.totals
    ?.manual_review_completed_count !== 2 ||
  decisions.totals
    ?.new_public_decision_identity_count !== 0 ||
  decisions.totals
    ?.boundary_approved_count !== 0 ||
  decisions.totals
    ?.database_change_count !== 0 ||
  decisions.decisions?.length !== 2
) {
  errors.push(
    'manual adjudication totals differ',
  )
}

const manualDecisionIds = new Set()
const packetItemIds = new Set()
const originalDecisionIds = new Set()
const segmentKeys = new Set()

for (
  const decision of
  decisions.decisions || []
) {
  manualDecisionIds.add(
    decision.manual_decision_id,
  )
  packetItemIds.add(
    decision.packet_item_id,
  )
  originalDecisionIds.add(
    decision.original_decision_id,
  )
  segmentKeys.add(
    decision.segment_key,
  )

  const packetItem =
    packetById.get(
      decision.packet_item_id,
    )
  const expected =
    expectedBySegment.get(
      decision.segment_key,
    )
  const evidence =
    decision.evidence || {}

  if (
    !packetItem ||
    !expected ||
    packetItem.segment_key !==
      decision.segment_key ||
    packetItem.original_decision_id !==
      decision.original_decision_id ||
    packetItem.consolidation_id !==
      decision.consolidation_id ||
    packetItem.recovery_id !==
      decision.recovery_id ||
    packetItem.display_title !==
      decision.display_title ||
    packetItem.successor_title !==
      decision.successor_title ||
    decision.display_title !==
      expected.display_title ||
    decision.successor_title !==
      expected.successor_title
  ) {
    errors.push(
      `${decision.segment_key}: adjudication identity differs`,
    )
  }

  if (
    decision.review_status !==
      'reviewed' ||
    decision.selected_decision !==
      'exclude-structural-heading' ||
    decision.reviewer_confidence !==
      'high' ||
    decision.review_questions_answered !==
      true ||
    decision.manual_review_completed !==
      true ||
    decision.supersedes_original_unresolved !==
      true ||
    decision.boundary_decision_recorded !==
      true
  ) {
    errors.push(
      `${decision.segment_key}: manual outcome differs`,
    )
  }

  if (
    evidence.source_pdf_page_reviewed !==
      expected.source_pdf_page_reviewed ||
    evidence
      .successor_source_pdf_page_reviewed !==
      expected
        .successor_source_pdf_page_reviewed ||
    evidence.current_title_match_method !==
      'manual-exact-private-review' ||
    evidence.successor_match_method !==
      'manual-exact-private-review' ||
    evidence.anchor_relationship !==
      'same-page-chapter-opening' ||
    evidence.current_title_is_structural_heading !==
      true ||
    evidence.expected_successor_is_present !==
      true ||
    evidence.alternative_anchor_is_required !==
      false ||
    evidence.independent_prose_exists_between !==
      false ||
    evidence.source_boundary_is_defensible !==
      true ||
    evidence.intervening_prose_presence !==
      'none' ||
    !Number.isInteger(
      evidence.intervening_structural_line_count,
    ) ||
    evidence.intervening_structural_line_count <
      1 ||
    evidence.source_reference_only !==
      true
  ) {
    errors.push(
      `${decision.segment_key}: structured evidence differs`,
    )
  }

  if (
    decision.source_text_included !==
      false ||
    decision.source_excerpt_included !==
      false ||
    decision.boundary_approved !== false ||
    decision.database_change_applied !==
      false ||
    decision.content_approved !== false ||
    decision.content_loaded !== false ||
    decision.cutover_enabled !== false
  ) {
    errors.push(
      `${decision.segment_key}: application boundary differs`,
    )
  }
}

if (
  manualDecisionIds.size !== 2 ||
  packetItemIds.size !== 2 ||
  originalDecisionIds.size !== 2 ||
  segmentKeys.size !== 2
) {
  errors.push(
    'manual adjudication identifiers must be unique',
  )
}

if (
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.pending_count > 126 ||
  progress.totals?.reviewed_count < 13 ||
  progress.totals?.unresolved_count > 5 ||
  progress.totals?.reviewed_count +
    progress.totals?.unresolved_count < 18 ||
  progress.totals
    ?.public_decision_count < 18 ||
  progress.totals
    ?.completed_packet_count < 4 ||
  progress.totals
    ?.pending_packet_count > 12 ||
  progress.totals
    ?.manual_adjudication_item_count !== 7 ||
  progress.totals
    ?.manual_adjudication_batch_count !== 4 ||
  progress.totals
    ?.manual_adjudication_packet_prepared_count < 1 ||
  progress.totals
    ?.manual_adjudication_item_prepared_count < 2 ||
  progress.totals
    ?.manual_adjudication_reviewed_count < 2 ||
  progress.totals
    ?.manual_adjudication_resolved_count < 2 ||
  progress.totals
    ?.manual_adjudication_remaining_count > 5 ||
  progress.totals
    ?.manual_adjudication_completed_batch_count < 1 ||
  progress.totals
    ?.manual_adjudication_pending_batch_count > 3 ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'cumulative manual adjudication progress differs',
  )
}

if (
  progress.totals.reviewed_count +
    progress.totals.unresolved_count < 18
) {
  errors.push(
    'reviewed and unresolved public decisions must total at least 18',
  )
}

const sourcePacket = progress.packets.find(
  (item) =>
    item.packet_id ===
    'container-intro-only-book-3-packet-01',
)

if (
  !sourcePacket ||
  sourcePacket.item_count !== 3 ||
  sourcePacket.pending_count !== 0 ||
  sourcePacket.reviewed_count !== 3 ||
  sourcePacket.unresolved_count !== 0 ||
  sourcePacket.status !==
    'reviewed-not-applied'
) {
  errors.push(
    'Book 3 source packet progress differs',
  )
}

for (const [
  field,
  value,
] of Object.entries(
  decisions.adjudication_boundary || {},
)) {
  if (
    [
      'private_reviewer_packet_read',
      'manual_review_completed',
      'structured_decisions_recorded',
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

const publicText =
  JSON.stringify(decisions)

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
    'Book 3 manual adjudication validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 2 Book 3 manual adjudication decisions.',
)
console.log(
  'Validated 2 high-confidence structural-heading exclusions.',
)
console.log(
  'Validated cumulative state: 13 reviewed, 5 unresolved, and 126 pending.',
)
console.log(
  'No source text, boundary approval, database change, or cutover was introduced.',
)
