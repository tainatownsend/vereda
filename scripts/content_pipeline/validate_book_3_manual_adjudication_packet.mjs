import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  sources,
  queue,
  consolidation,
  book3Recovery,
  packet,
  progress,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-book-3-manual-adjudication-packet-policy.json',
  ),
  readJson(
    'content/sources/manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-manual-adjudication-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-unresolved-recovery-consolidation.json',
  ),
  readJson(
    'content/migration/reading-segment-book-3-successor-anchor-recovery-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-book-3-manual-adjudication-packet.json',
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
const source = sources.works.find(
  (work) => work.book_id === 3,
)
const batch = queue.batches.find(
  (item) =>
    item.batch_id ===
    policy.target_batch.batch_id,
)
const unresolvedById = new Map(
  consolidation
    .unresolved_recoveries
    .map((item) => [
      item.consolidation_id,
      item,
    ]),
)
const recoveryById = new Map(
  book3Recovery.recoveries.map(
    (item) => [
      item.recovery_id,
      item,
    ],
  ),
)
const expectedBySegment = new Map(
  policy.expected_pairs.map(
    (item) => [
      item.segment_key,
      item,
    ],
  ),
)

if (
  policy.status !==
    'accepted-for-book-3-manual-adjudication-packet' ||
  packet.status !==
    'book-3-manual-adjudication-packet-prepared-not-reviewed'
) {
  errors.push(
    'packet policy or packet status differs',
  )
}

if (
  typeof progress.status !== 'string' ||
  (
    !progress.status.endsWith('-not-reviewed') &&
    !progress.status.endsWith('-not-applied')
  )
) {
  errors.push(
    'cumulative progress status is unsupported',
  )
}

if (
  packet.policy_version !==
    policy.policy_version ||
  packet.run_id !==
    consolidation.run_id ||
  progress.run_id !==
    consolidation.run_id ||
  typeof progress.policy_version !==
    'string' ||
  progress.policy_version.length === 0
) {
  errors.push(
    'packet, progress, or migration identity differs',
  )
}

if (
  !source ||
  !batch ||
  batch.item_count !== 2 ||
  batch.status !==
    'manual-adjudication-required-not-reviewed' ||
  batch.requires_authorized_manual_source_review !==
    true ||
  packet.manual_batch_id !==
    batch.batch_id ||
  packet.manual_adjudication_lane !==
    'manual-successor-anchor-adjudication'
) {
  errors.push(
    'source or manual batch identity differs',
  )
}

if (
  packet.contains_full_text !== false ||
  packet.contains_source_excerpt !==
    false ||
  packet.totals?.packet_item_count !== 2 ||
  packet.packet_items?.length !== 2 ||
  packet.totals
    ?.manual_review_completed_count !== 0 ||
  packet.totals
    ?.new_review_decision_count !== 0 ||
  packet.totals
    ?.boundary_approved_count !== 0 ||
  packet.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'manual packet totals differ',
  )
}

const itemIds = new Set()
const consolidationIds = new Set()
const recoveryIds = new Set()
const decisionIds = new Set()
const segmentKeys = new Set()

for (
  const item of
  packet.packet_items || []
) {
  itemIds.add(
    item.packet_item_id,
  )
  consolidationIds.add(
    item.consolidation_id,
  )
  recoveryIds.add(
    item.recovery_id,
  )
  decisionIds.add(
    item.original_decision_id,
  )
  segmentKeys.add(
    item.segment_key,
  )

  const unresolved =
    unresolvedById.get(
      item.consolidation_id,
    )
  const recovery =
    recoveryById.get(
      item.recovery_id,
    )
  const expected =
    expectedBySegment.get(
      item.segment_key,
    )

  if (
    !unresolved ||
    !recovery ||
    !expected ||
    unresolved.recovery_id !==
      item.recovery_id ||
    unresolved.original_decision_id !==
      item.original_decision_id ||
    unresolved.segment_key !==
      item.segment_key ||
    unresolved.display_title !==
      item.display_title ||
    unresolved.successor_title !==
      item.successor_title ||
    unresolved.final_status !==
      'manual-adjudication-required' ||
    unresolved.manual_adjudication_lane !==
      'manual-successor-anchor-adjudication' ||
    recovery.recovery_status !==
      'still-unresolved' ||
    recovery.selected_decision !==
      'unresolved' ||
    item.original_source_pdf_page !==
      expected.original_source_pdf_page
  ) {
    errors.push(
      `${item.segment_key}: packet source identity differs`,
    )
  }

  if (
    item.packet_status !==
      'packet-prepared-not-reviewed' ||
    item.selected_decision !==
      'unresolved' ||
    item.manual_review_required !==
      true ||
    item.automated_recovery_exhausted !==
      true ||
    item.source_text_included !==
      false ||
    item.source_excerpt_included !==
      false ||
    item.manual_review_completed !==
      false ||
    item.boundary_approved !== false ||
    item.database_change_applied !==
      false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: packet review boundary differs`,
    )
  }

  if (
    !Number.isInteger(
      item.current_title_candidate_count,
    ) ||
    item.current_title_candidate_count <
      1 ||
    item.current_title_candidates?.length !==
      item.current_title_candidate_count ||
    !Number.isInteger(
      item.successor_candidate_count,
    ) ||
    item.successor_candidate_count < 0 ||
    item.successor_candidate_count >
      policy.packet_rules
        .successor_candidate_limit ||
    item.successor_candidates?.length !==
      item.successor_candidate_count ||
    item.exact_successor_candidate_count +
      item.fuzzy_successor_candidate_count !==
      item.successor_candidate_count
  ) {
    errors.push(
      `${item.segment_key}: candidate totals differ`,
    )
  }

  for (
    const candidate of
    item.current_title_candidates || []
  ) {
    if (
      !Number.isInteger(
        candidate.source_pdf_page,
      ) ||
      candidate.source_pdf_page <= 0 ||
      ![
        'normalized-exact',
        'normalized-token-window',
      ].includes(
        candidate.match_method,
      ) ||
      candidate.score <= 0 ||
      candidate.window_line_count <= 0 ||
      candidate.toc_like !== false ||
      candidate
        .page_distance_from_original >
        policy.packet_rules
          .current_title_page_radius
    ) {
      errors.push(
        `${item.segment_key}: current-title candidate differs`,
      )
    }
  }

  for (
    const candidate of
    item.successor_candidates || []
  ) {
    if (
      !Number.isInteger(
        candidate.source_pdf_page,
      ) ||
      candidate.source_pdf_page <= 0 ||
      ![
        'normalized-exact',
        'manual-fuzzy-candidate',
      ].includes(
        candidate.match_method,
      ) ||
      candidate.score <= 0 ||
      candidate.token_coverage < 0 ||
      candidate.token_coverage > 1 ||
      candidate.sequence_ratio < 0 ||
      candidate.sequence_ratio > 1 ||
      candidate.window_line_count <= 0 ||
      candidate.toc_like !== false
    ) {
      errors.push(
        `${item.segment_key}: successor candidate differs`,
      )
    }
  }

  if (
    JSON.stringify(
      item.review_questions,
    ) !==
    JSON.stringify(
      policy.review_questions,
    )
  ) {
    errors.push(
      `${item.segment_key}: review questions differ`,
    )
  }
}

if (
  itemIds.size !== 2 ||
  consolidationIds.size !== 2 ||
  recoveryIds.size !== 2 ||
  decisionIds.size !== 2 ||
  segmentKeys.size !== 2
) {
  errors.push(
    'packet identifiers must be unique',
  )
}

if (
  packet.source?.book_id !== 3 ||
  packet.source?.source_file !==
    source?.source_file ||
  packet.source?.source_sha256 !==
    source?.source_sha256 ||
  packet.source?.pdf_page_count !==
    source?.pdf_page_count
) {
  errors.push(
    'packet source identity differs',
  )
}

if (
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.pending_count !== 126 ||
  progress.totals?.reviewed_count < 11 ||
  progress.totals?.unresolved_count > 7 ||
  progress.totals?.reviewed_count +
    progress.totals?.unresolved_count !==
    18 ||
  progress.totals
    ?.public_decision_count !== 18 ||
  progress.totals
    ?.manual_adjudication_item_count !== 7 ||
  progress.totals
    ?.manual_adjudication_batch_count !== 4 ||
  progress.totals
    ?.manual_adjudication_packet_prepared_count <
    1 ||
  progress.totals
    ?.manual_adjudication_item_prepared_count <
    2 ||
  progress.totals
    ?.manual_adjudication_reviewed_count < 0 ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'cumulative manual packet progress differs',
  )
}

for (const [
  field,
  value,
] of Object.entries(
  packet.packet_boundary || {},
)) {
  if (
    [
      'local_source_read',
      'private_reviewer_packet_generated',
      'public_packet_generated',
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
  consolidation.totals
    ?.recovery_attempt_count !== 14 ||
  consolidation.totals
    ?.resolved_recovery_count !== 7 ||
  consolidation.totals
    ?.still_unresolved_count !== 7 ||
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
    'historical consolidation or database state changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'Book 3 manual-adjudication packet validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 2 Book 3 manual-adjudication packet items.',
)
console.log(
  `Validated ${packet.totals.current_title_candidate_count} current-title and ${packet.totals.successor_candidate_count} successor candidates.`,
)
console.log(
  'Validated private/public evidence separation.',
)
console.log(
  `Validated cumulative state at or beyond the packet baseline: ${progress.totals.reviewed_count} reviewed, ${progress.totals.unresolved_count} unresolved, and 126 pending.`,
)
console.log(
  'No manual decision, boundary approval, database change, or cutover was introduced.',
)
