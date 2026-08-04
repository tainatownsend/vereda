import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  titleWindow,
  nonContents,
  book3,
  book2,
  originalDecisions,
  consolidation,
  queue,
  progress,
  application,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-unresolved-recovery-consolidation-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-title-window-recovery-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-non-contents-recovery-decision.json',
  ),
  readJson(
    'content/migration/reading-segment-book-3-successor-anchor-recovery-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-book-2-successor-anchor-recovery-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-container-intro-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-unresolved-recovery-consolidation.json',
  ),
  readJson(
    'content/migration/reading-segment-manual-adjudication-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
])

const errors = []

if (
  policy.status !==
    'accepted-for-unresolved-recovery-consolidation' ||
  consolidation.status !==
    'unresolved-recovery-outcomes-consolidated-not-applied' ||
  queue.status !==
    'manual-adjudication-queue-prepared-not-reviewed' ||
  progress.status !==
    'unresolved-recovery-consolidated-not-applied'
) {
  errors.push(
    'policy, consolidation, queue, or progress status differs',
  )
}

if (
  consolidation.policy_version !==
    policy.policy_version ||
  queue.policy_version !==
    policy.policy_version ||
  progress.policy_version !==
    policy.policy_version ||
  consolidation.run_id !==
    titleWindow.run_id ||
  queue.run_id !==
    titleWindow.run_id ||
  progress.run_id !==
    titleWindow.run_id
) {
  errors.push(
    'policy or migration identity differs',
  )
}

const attempts = [
  ...titleWindow.recoveries,
  nonContents.recovery,
  ...book3.recoveries,
  ...book2.recoveries,
]

const sourceByRecoveryId =
  new Map(
    attempts.map((item) => [
      item.recovery_id,
      item,
    ]),
  )

if (
  attempts.length !== 14 ||
  sourceByRecoveryId.size !== 14 ||
  new Set(
    attempts.map(
      (item) =>
        item.original_decision_id,
    ),
  ).size !== 14
) {
  errors.push(
    'source recovery coverage differs',
  )
}

if (
  consolidation.contains_full_text !==
    false ||
  consolidation.contains_source_excerpt !==
    false ||
  consolidation.totals
    ?.recovery_attempt_count !== 14 ||
  consolidation.totals
    ?.resolved_recovery_count !== 7 ||
  consolidation.totals
    ?.still_unresolved_count !== 7 ||
  consolidation.totals
    ?.resolved_exclude_structural_heading_count !==
    7 ||
  consolidation.totals
    ?.resolved_retain_intro_segment_count !==
    0 ||
  consolidation.totals
    ?.manual_adjudication_item_count !==
    7 ||
  consolidation.totals
    ?.manual_adjudication_batch_count !==
    4 ||
  consolidation.totals
    ?.source_file_read_count !== 0 ||
  consolidation.totals
    ?.source_text_read_count !== 0 ||
  consolidation.totals
    ?.new_review_decision_count !== 0 ||
  consolidation.totals
    ?.boundary_approved_count !== 0 ||
  consolidation.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'consolidation totals differ',
  )
}

const resolved =
  consolidation.resolved_recoveries || []
const unresolved =
  consolidation.unresolved_recoveries || []

if (
  resolved.length !== 7 ||
  unresolved.length !== 7
) {
  errors.push(
    'resolved or unresolved consolidation length differs',
  )
}

const consolidationIds =
  new Set()
const consolidatedRecoveryIds =
  new Set()
const consolidatedDecisionIds =
  new Set()

for (const item of [
  ...resolved,
  ...unresolved,
]) {
  consolidationIds.add(
    item.consolidation_id,
  )
  consolidatedRecoveryIds.add(
    item.recovery_id,
  )
  consolidatedDecisionIds.add(
    item.original_decision_id,
  )

  const source =
    sourceByRecoveryId.get(
      item.recovery_id,
    )

  if (
    !source ||
    source.original_decision_id !==
      item.original_decision_id ||
    source.segment_key !==
      item.segment_key ||
    source.book_id !==
      item.book_id ||
    source.display_title !==
      item.display_title
  ) {
    errors.push(
      `${item.segment_key}: consolidation source identity differs`,
    )
  }
}

if (
  consolidationIds.size !== 14 ||
  consolidatedRecoveryIds.size !== 14 ||
  consolidatedDecisionIds.size !== 14
) {
  errors.push(
    'consolidation identifiers must be unique',
  )
}

for (const item of resolved) {
  const source =
    sourceByRecoveryId.get(
      item.recovery_id,
    )

  if (
    source?.recovery_status !==
      'resolved' ||
    item.final_status !==
      'resolved-not-applied' ||
    item.selected_decision !==
      'exclude-structural-heading' ||
    item.supersedes_original_unresolved !==
      true ||
    item.boundary_approved !== false ||
    item.database_change_applied !==
      false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: resolved consolidation outcome differs`,
    )
  }
}

const allowedLanes = new Set([
  'manual-current-title-adjudication',
  'manual-source-opening-adjudication',
  'manual-successor-anchor-adjudication',
])

for (const item of unresolved) {
  const source =
    sourceByRecoveryId.get(
      item.recovery_id,
    )

  if (
    source?.recovery_status !==
      'still-unresolved' ||
    item.final_status !==
      'manual-adjudication-required' ||
    item.selected_decision !==
      'unresolved' ||
    item.final_unresolved_reason !==
      source.unresolved_reason ||
    !allowedLanes.has(
      item.manual_adjudication_lane,
    ) ||
    item.automated_recovery_exhausted !==
      true ||
    item.reviewer_confidence !==
      'low' ||
    item.source_text_included !==
      false ||
    item.source_excerpt_included !==
      false ||
    item.boundary_approved !== false ||
    item.database_change_applied !==
      false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: unresolved consolidation outcome differs`,
    )
  }
}

const expectedLaneCounts = {
  'manual-current-title-adjudication':
    4,
  'manual-source-opening-adjudication':
    1,
  'manual-successor-anchor-adjudication':
    2,
}

for (const [
  lane,
  expected,
] of Object.entries(
  expectedLaneCounts,
)) {
  if (
    consolidation.lane_counts?.[lane] !==
      expected ||
    queue.lane_counts?.[lane] !==
      expected
  ) {
    errors.push(
      `${lane}: expected ${expected} items`,
    )
  }
}

if (
  queue.item_count !== 7 ||
  queue.batch_count !== 4 ||
  queue.batches?.length !== 4
) {
  errors.push(
    'manual-adjudication queue totals differ',
  )
}

const queuedDecisionIds =
  queue.batches.flatMap(
    (batch) =>
      batch.original_decision_ids,
  )
const unresolvedDecisionIds =
  unresolved.map(
    (item) =>
      item.original_decision_id,
  )

if (
  queuedDecisionIds.length !== 7 ||
  new Set(
    queuedDecisionIds,
  ).size !== 7 ||
  JSON.stringify(
    [...queuedDecisionIds].sort(),
  ) !==
  JSON.stringify(
    [...unresolvedDecisionIds].sort(),
  )
) {
  errors.push(
    'manual-adjudication queue coverage differs',
  )
}

for (
  const batch of
  queue.batches || []
) {
  if (
    !allowedLanes.has(
      batch.manual_adjudication_lane,
    ) ||
    batch.item_count <= 0 ||
    batch.item_count !==
      batch.consolidation_ids?.length ||
    batch.item_count !==
      batch.recovery_ids?.length ||
    batch.item_count !==
      batch.original_decision_ids?.length ||
    batch.item_count !==
      batch.segment_keys?.length ||
    batch.status !==
      'manual-adjudication-required-not-reviewed' ||
    batch.requires_authorized_manual_source_review !==
      true ||
    batch.source_files_read !==
      false ||
    batch.source_text_included !==
      false ||
    batch.decisions_changed !==
      false ||
    batch.database_change_applied !==
      false
  ) {
    errors.push(
      `${batch.batch_id}: manual batch boundary differs`,
    )
  }
}

if (
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.pending_count !== 126 ||
  progress.totals?.reviewed_count !== 11 ||
  progress.totals?.unresolved_count !== 7 ||
  progress.totals
    ?.public_decision_count !== 18 ||
  progress.totals
    ?.completed_packet_count !== 4 ||
  progress.totals
    ?.pending_packet_count !== 12 ||
  progress.totals
    ?.recovery_attempt_count_total !==
    14 ||
  progress.totals
    ?.recovery_resolved_count_total !==
    7 ||
  progress.totals
    ?.recovery_still_unresolved_count_total !==
    7 ||
  progress.totals
    ?.manual_adjudication_item_count !==
    7 ||
  progress.totals
    ?.manual_adjudication_batch_count !==
    4 ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'cumulative consolidation progress differs',
  )
}

if (
  progress.totals.reviewed_count +
    progress.totals.unresolved_count !==
    18
) {
  errors.push(
    'reviewed and unresolved public decisions must total 18',
  )
}

for (const [
  field,
  value,
] of Object.entries(
  policy.consolidation_boundary || {},
)) {
  if (
    [
      'recovery_outcomes_consolidated',
      'manual_batches_generated',
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
  JSON.stringify({
    consolidation,
    queue,
  })

for (const forbidden of [
  '"source_text":',
  '"source_excerpt":',
  '"quoted_text":',
  '"quotation":',
  '"full_text":',
  '"normalized_content":',
  '"private_notes":',
  '"reviewer_notes":',
  '"ocr_text":',
  '"page_text":',
  '"between_lines":',
  '"matched_lines":',
  '"candidate_page_text":',
]) {
  if (
    publicText
      .toLowerCase()
      .includes(
        forbidden.toLowerCase(),
      )
  ) {
    errors.push(
      `forbidden public field found: ${forbidden}`,
    )
  }
}

if (
  originalDecisions.totals
    ?.reviewed_count !== 2 ||
  originalDecisions.totals
    ?.unresolved_count !== 14 ||
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
    'historical artifact or database state changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'Unresolved recovery consolidation validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated consolidation of 14 recovery attempts.',
)
console.log(
  'Validated 7 preserved resolved outcomes and 7 manual-adjudication items.',
)
console.log(
  'Validated 4 deterministic manual-adjudication batches.',
)
console.log(
  'Validated cumulative state: 11 reviewed, 7 unresolved, and 126 pending.',
)
console.log(
  'No source read, new decision, boundary approval, database change, or cutover was introduced.',
)
