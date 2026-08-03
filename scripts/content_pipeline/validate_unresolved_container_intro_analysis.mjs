import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  decisions,
  progress,
  worklist,
  packetRegister,
  application,
  analysis,
  queue,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-container-intro-unresolved-analysis-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-container-intro-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-packet-register.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-container-intro-unresolved-analysis.json',
  ),
  readJson(
    'content/migration/reading-segment-container-intro-resolution-queue.json',
  ),
])

const errors = []

if (
  policy.status !==
    'accepted-for-unresolved-analysis' ||
  analysis.status !==
    'container-intro-unresolved-analyzed-not-resolved' ||
  queue.status !==
    'container-intro-resolution-queue-prepared'
) {
  errors.push(
    'policy, analysis, or queue status differs',
  )
}

if (
  analysis.policy_version !==
    policy.policy_version ||
  queue.policy_version !==
    policy.policy_version ||
  analysis.run_id !==
    decisions.run_id ||
  queue.run_id !==
    decisions.run_id
) {
  errors.push(
    'policy or migration identity differs',
  )
}

const expectedTotals = {
  unresolved_count: 14,
  reviewed_count_preserved: 4,
  pending_count_preserved: 126,
  public_decision_count_preserved: 18,
  completed_packet_count_preserved: 4,
  pending_packet_count_preserved: 12,
  resolution_lane_count: 3,
  resolution_batch_count: 5,
  source_file_read_count: 0,
  source_text_read_count: 0,
  review_decision_change_count: 0,
  database_change_count: 0,
}

for (const [
  field,
  expected,
] of Object.entries(
  expectedTotals,
)) {
  if (
    analysis.totals?.[field] !==
    expected
  ) {
    errors.push(
      `${field}: expected ${expected}; received ${analysis.totals?.[field]}`,
    )
  }
}

const expectedReasons = {
  'current-title-window-not-found': 3,
  'selected-page-has-contents-signals': 1,
  'successor-title-not-found': 10,
}

for (const [
  reason,
  expected,
] of Object.entries(
  expectedReasons,
)) {
  if (
    analysis.reason_counts?.[reason] !==
    expected
  ) {
    errors.push(
      `${reason}: expected ${expected}; received ${analysis.reason_counts?.[reason]}`,
    )
  }
}

const expectedLanes = {
  'current-title-window-recovery': 3,
  'non-contents-occurrence-recovery': 1,
  'successor-anchor-recovery': 10,
}

for (const [
  lane,
  expected,
] of Object.entries(
  expectedLanes,
)) {
  if (
    analysis.lane_counts?.[lane] !==
    expected
  ) {
    errors.push(
      `${lane}: expected ${expected}; received ${analysis.lane_counts?.[lane]}`,
    )
  }
}

if (
  analysis.contains_full_text !== false ||
  analysis.contains_source_excerpt !==
    false ||
  analysis.items?.length !== 14 ||
  queue.item_count !== 14 ||
  queue.batch_count !== 5 ||
  queue.batches?.length !== 5
) {
  errors.push(
    'analysis content or queue totals differ',
  )
}

const unresolvedByDecision =
  new Map(
    decisions.decisions
      .filter(
        (decision) =>
          decision.review_status ===
          'unresolved',
      )
      .map((decision) => [
        decision.decision_id,
        decision,
      ]),
  )
const worklistByDecision =
  new Map(
    worklist.items.map((item) => [
      item.decision_id,
      item,
    ]),
  )

const analysisIds = new Set()
const decisionIds = new Set()
const segmentKeys = new Set()

for (
  const item of
  analysis.items || []
) {
  analysisIds.add(
    item.analysis_id,
  )
  decisionIds.add(
    item.decision_id,
  )
  segmentKeys.add(
    item.segment_key,
  )

  const source =
    unresolvedByDecision.get(
      item.decision_id,
    )
  const baseline =
    worklistByDecision.get(
      item.decision_id,
    )
  const lane =
    policy.resolution_lanes[
      item.resolution_lane
    ]

  if (
    !source ||
    !baseline ||
    !lane ||
    source.segment_key !==
      item.segment_key ||
    baseline.inspection_id !==
      item.inspection_id ||
    source.evidence
      ?.unresolved_reason !==
      item.unresolved_reason ||
    lane.source_reason !==
      item.unresolved_reason
  ) {
    errors.push(
      `${item.segment_key}: unresolved-analysis identity differs`,
    )
  }

  if (
    item.original_review_status !==
      'unresolved' ||
    item.original_selected_decision !==
      'unresolved' ||
    item.decision_change_allowed !==
      false ||
    item.requires_local_source_reinspection !==
      true ||
    item.source_text_included !==
      false ||
    item.source_excerpt_included !==
      false ||
    item.database_change_applied !==
      false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: analysis boundary differs`,
    )
  }
}

if (
  analysisIds.size !== 14 ||
  decisionIds.size !== 14 ||
  segmentKeys.size !== 14
) {
  errors.push(
    'analysis identifiers must be unique',
  )
}

const queuedDecisionIds =
  queue.batches.flatMap(
    (batch) =>
      batch.decision_ids,
  )

if (
  queuedDecisionIds.length !== 14 ||
  new Set(queuedDecisionIds).size !==
    14 ||
  JSON.stringify(
    [...queuedDecisionIds].sort(),
  ) !==
  JSON.stringify(
    [...decisionIds].sort(),
  )
) {
  errors.push(
    'resolution batches do not cover every unresolved decision exactly once',
  )
}

for (
  const batch of
  queue.batches || []
) {
  if (
    batch.item_count <= 0 ||
    batch.item_count !==
      batch.decision_ids?.length ||
    batch.item_count !==
      batch.analysis_ids?.length ||
    batch.item_count !==
      batch.segment_keys?.length ||
    batch.status !==
      'analysis-ready-not-resolved' ||
    batch.source_files_read !==
      false ||
    batch.decisions_changed !==
      false ||
    batch.database_change_applied !==
      false
  ) {
    errors.push(
      `${batch.batch_id}: batch boundary differs`,
    )
  }
}

for (const [
  field,
  value,
] of Object.entries(
  analysis.analysis_boundary || {},
)) {
  if (
    [
      'analysis_generated',
      'resolution_batches_generated',
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
    analysis,
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
  progress.status !==
    'container-intro-review-completed-not-applied' ||
  progress.totals?.pending_count !== 126 ||
  progress.totals?.reviewed_count !== 4 ||
  progress.totals?.unresolved_count !== 14 ||
  progress.totals?.public_decision_count !== 18 ||
  progress.totals?.completed_packet_count !== 4 ||
  progress.totals?.pending_packet_count !== 12 ||
  progress.totals?.database_change_count !== 0 ||
  packetRegister.packet_count !== 16 ||
  worklist.totals?.item_count !== 144
) {
  errors.push(
    'upstream review progress changed unexpectedly',
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
    'Unresolved container-intro analysis validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 14 unresolved container-intro analyses.',
)
console.log(
  'Validated reason distribution: 3 title-window, 1 contents-only, and 10 successor-anchor cases.',
)
console.log(
  'Validated 5 deterministic resolution batches.',
)
console.log(
  'Preserved 4 reviewed, 14 unresolved, and 126 pending source-review items.',
)
console.log(
  'No source read, decision change, database change, or cutover was introduced.',
)
