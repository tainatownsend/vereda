import { createHash } from 'node:crypto'
import {
  readFile,
  writeFile,
} from 'node:fs/promises'

const paths = {
  policy:
    'content/migration/reading-segment-container-intro-unresolved-analysis-policy.json',
  decisions:
    'content/migration/reading-segment-source-review-container-intro-decisions.json',
  progress:
    'content/migration/reading-segment-source-review-progress.json',
  worklist:
    'content/migration/reading-segment-source-review-worklist.json',
  packetRegister:
    'content/migration/reading-segment-source-review-packet-register.json',
  application:
    'content/migration/reading-segment-mechanical-application-evidence.json',
  analysis:
    'content/migration/reading-segment-container-intro-unresolved-analysis.json',
  queue:
    'content/migration/reading-segment-container-intro-resolution-queue.json',
  report:
    'content/migration/reports/reading-segment-container-intro-unresolved-analysis-summary.md',
}

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const sha256File = async (filePath) =>
  sha256(await readFile(filePath))

const [
  policy,
  decisions,
  progress,
  worklist,
  packetRegister,
  application,
] = await Promise.all([
  readJson(paths.policy),
  readJson(paths.decisions),
  readJson(paths.progress),
  readJson(paths.worklist),
  readJson(paths.packetRegister),
  readJson(paths.application),
])

if (
  policy.status !==
  'accepted-for-unresolved-analysis'
) {
  throw new Error(
    'Unresolved-analysis policy is not accepted.',
  )
}

const laneByReason = new Map(
  Object.entries(
    policy.resolution_lanes,
  ).map(([lane, definition]) => [
    definition.source_reason,
    {
      lane,
      ...definition,
    },
  ]),
)

const worklistByDecision = new Map(
  worklist.items.map((item) => [
    item.decision_id,
    item,
  ]),
)

const packetById = new Map(
  packetRegister.packets.map(
    (packet) => [
      packet.packet_id,
      packet,
    ],
  ),
)

const unresolved =
  decisions.decisions.filter(
    (decision) =>
      decision.review_status ===
      'unresolved',
  )

const items = unresolved.map(
  (decision) => {
    const worklistItem =
      worklistByDecision.get(
        decision.decision_id,
      )
    const packet =
      packetById.get(
        decision.packet_id,
      )
    const reason =
      decision.evidence
        ?.unresolved_reason
    const laneDefinition =
      laneByReason.get(reason)

    if (
      !worklistItem ||
      !packet ||
      !laneDefinition
    ) {
      throw new Error(
        `${decision.segment_key}: unresolved analysis context is missing.`,
      )
    }

    if (
      worklistItem.segment_key !==
        decision.segment_key ||
      worklistItem.inspection_id !==
        decision.inspection_id ||
      packet.book_id !==
        decision.book_id ||
      packet.inspection_lane !==
        'container-intro-only'
    ) {
      throw new Error(
        `${decision.segment_key}: upstream identity differs.`,
      )
    }

    const evidence =
      decision.evidence || {}

    return {
      analysis_id: sha256(
        [
          decisions.run_id,
          decision.decision_id,
          policy.policy_version,
        ].join('|'),
      ).slice(0, 24),
      decision_id:
        decision.decision_id,
      inspection_id:
        decision.inspection_id,
      packet_id:
        decision.packet_id,
      run_id:
        decision.run_id,
      policy_version:
        policy.policy_version,
      book_id:
        decision.book_id,
      book_slug:
        decision.book_slug,
      segment_key:
        decision.segment_key,
      segment_order:
        decision.segment_order,
      display_title:
        decision.display_title,
      inspection_lane:
        decision.inspection_lane,
      original_review_status:
        decision.review_status,
      original_selected_decision:
        decision.selected_decision,
      unresolved_reason: reason,
      resolution_lane:
        laneDefinition.lane,
      resolution_lane_priority:
        laneDefinition.priority,
      diagnosis:
        laneDefinition.diagnosis,
      recommended_method:
        laneDefinition.recommended_method,
      evidence_snapshot: {
        source_file:
          evidence.source_file,
        source_sha256:
          evidence.source_sha256,
        source_pdf_page_reviewed:
          evidence
            .source_pdf_page_reviewed,
        successor_source_pdf_page_reviewed:
          evidence
            .successor_source_pdf_page_reviewed,
        candidate_page_count:
          evidence.candidate_page_count,
        title_match_strength:
          evidence.title_match_strength,
        toc_signal_count:
          evidence.toc_signal_count,
        prose_signal_count:
          evidence.prose_signal_count,
        structural_line_count:
          evidence.structural_line_count,
        successor_title_found:
          evidence.successor_title_found,
        pages_inspected:
          evidence.pages_inspected,
      },
      diagnosis_flags: {
        candidate_page_available:
          Number(
            evidence.candidate_page_count,
          ) > 0,
        selected_page_is_non_contents:
          Number(
            evidence.toc_signal_count,
          ) === 0,
        current_title_match_available:
          Number(
            evidence.title_match_strength,
          ) <= 2,
        prose_signal_available:
          Number(
            evidence.prose_signal_count,
          ) > 0,
        bounded_successor_search_exhausted:
          reason ===
            'successor-title-not-found' &&
          Number(
            evidence.pages_inspected,
          ) >= 7,
      },
      requires_local_source_reinspection:
        true,
      decision_change_allowed:
        false,
      source_text_included:
        false,
      source_excerpt_included:
        false,
      database_change_applied:
        false,
      cutover_enabled:
        false,
    }
  },
)

items.sort(
  (left, right) =>
    left.resolution_lane_priority -
      right.resolution_lane_priority ||
    left.book_id - right.book_id ||
    left.segment_order -
      right.segment_order ||
    left.segment_key.localeCompare(
      right.segment_key,
    ),
)

const analysisIds = new Set(
  items.map(
    (item) => item.analysis_id,
  ),
)
const decisionIds = new Set(
  items.map(
    (item) => item.decision_id,
  ),
)
const segmentKeys = new Set(
  items.map(
    (item) => item.segment_key,
  ),
)

if (
  items.length !== 14 ||
  analysisIds.size !== 14 ||
  decisionIds.size !== 14 ||
  segmentKeys.size !== 14
) {
  throw new Error(
    'Unresolved analysis must contain 14 unique items.',
  )
}

const reasonCounts =
  Object.fromEntries(
    [...laneByReason.keys()]
      .sort()
      .map((reason) => [
        reason,
        items.filter(
          (item) =>
            item.unresolved_reason ===
            reason,
        ).length,
      ]),
  )

const laneCounts =
  Object.fromEntries(
    Object.keys(
      policy.resolution_lanes,
    ).map((lane) => [
      lane,
      items.filter(
        (item) =>
          item.resolution_lane ===
          lane,
      ).length,
    ]),
  )

for (const [
  lane,
  definition,
] of Object.entries(
  policy.resolution_lanes,
)) {
  if (
    laneCounts[lane] !==
    definition.expected_count
  ) {
    throw new Error(
      `${lane}: expected ${definition.expected_count}; received ${laneCounts[lane]}`,
    )
  }
}

const groups = new Map()

for (const item of items) {
  const key = [
    item.resolution_lane,
    item.book_id,
  ].join('|')

  if (!groups.has(key)) {
    groups.set(key, [])
  }

  groups.get(key).push(item)
}

const batches = [
  ...groups.entries(),
].map(([key, members]) => {
  const [
    resolutionLane,
    bookIdText,
  ] = key.split('|')
  const bookId =
    Number(bookIdText)
  const laneDefinition =
    policy.resolution_lanes[
      resolutionLane
    ]

  return {
    batch_id:
      `${resolutionLane}-book-${bookId}-batch-01`,
    resolution_lane:
      resolutionLane,
    resolution_lane_priority:
      laneDefinition.priority,
    book_id:
      bookId,
    item_count:
      members.length,
    unresolved_reasons: [
      ...new Set(
        members.map(
          (item) =>
            item.unresolved_reason,
        ),
      ),
    ],
    recommended_method:
      laneDefinition
        .recommended_method,
    analysis_ids:
      members.map(
        (item) =>
          item.analysis_id,
      ),
    decision_ids:
      members.map(
        (item) =>
          item.decision_id,
      ),
    segment_keys:
      members.map(
        (item) =>
          item.segment_key,
      ),
    status:
      'analysis-ready-not-resolved',
    source_files_read:
      false,
    decisions_changed:
      false,
    database_change_applied:
      false,
  }
}).sort(
  (left, right) =>
    left.resolution_lane_priority -
      right.resolution_lane_priority ||
    left.book_id - right.book_id,
)

if (batches.length !== 5) {
  throw new Error(
    `Expected 5 resolution batches; received ${batches.length}.`,
  )
}

const batchDecisionIds =
  batches.flatMap(
    (batch) =>
      batch.decision_ids,
  )

if (
  batchDecisionIds.length !== 14 ||
  new Set(batchDecisionIds).size !==
    14
) {
  throw new Error(
    'Resolution batches must cover every unresolved decision exactly once.',
  )
}

const analysis = {
  schema_version: 1,
  status:
    'container-intro-unresolved-analyzed-not-resolved',
  policy_version:
    policy.policy_version,
  run_id:
    decisions.run_id,
  rights_status:
    decisions.rights_status,
  contains_full_text:
    false,
  contains_source_excerpt:
    false,
  inputs: {
    policy_sha256:
      await sha256File(paths.policy),
    decisions_sha256:
      await sha256File(
        paths.decisions,
      ),
    progress_sha256:
      await sha256File(
        paths.progress,
      ),
    worklist_sha256:
      await sha256File(
        paths.worklist,
      ),
    packet_register_sha256:
      await sha256File(
        paths.packetRegister,
      ),
    mechanical_application_evidence_sha256:
      await sha256File(
        paths.application,
      ),
  },
  totals: {
    unresolved_count:
      items.length,
    reviewed_count_preserved:
      progress.totals.reviewed_count,
    pending_count_preserved:
      progress.totals.pending_count,
    public_decision_count_preserved:
      progress.totals
        .public_decision_count,
    completed_packet_count_preserved:
      progress.totals
        .completed_packet_count,
    pending_packet_count_preserved:
      progress.totals
        .pending_packet_count,
    resolution_lane_count:
      Object.keys(laneCounts).length,
    resolution_batch_count:
      batches.length,
    source_file_read_count: 0,
    source_text_read_count: 0,
    review_decision_change_count: 0,
    database_change_count: 0,
  },
  reason_counts:
    reasonCounts,
  lane_counts:
    laneCounts,
  items,
  analysis_boundary:
    policy.analysis_boundary,
}

const queue = {
  schema_version: 1,
  status:
    'container-intro-resolution-queue-prepared',
  policy_version:
    policy.policy_version,
  run_id:
    decisions.run_id,
  item_count:
    items.length,
  batch_count:
    batches.length,
  batches,
  source_files_read:
    false,
  source_text_read:
    false,
  decisions_changed:
    false,
  database_change_applied:
    false,
  cutover_enabled:
    false,
}

const workTitles = {
  1: 'O Livro dos Espíritos',
  2: 'O Livro dos Médiuns',
  3: 'O Evangelho Segundo o Espiritismo',
}

const reportLines = [
  '# Unresolved Container-Intro Analysis',
  '',
  `- Status: \`${analysis.status}\``,
  `- Policy version: \`${analysis.policy_version}\``,
  `- Migration run ID: \`${analysis.run_id}\``,
  `- Unresolved cases analyzed: \`${analysis.totals.unresolved_count}\``,
  `- Resolution lanes: \`${analysis.totals.resolution_lane_count}\``,
  `- Resolution batches: \`${analysis.totals.resolution_batch_count}\``,
  `- Reviewed outcomes preserved: \`${analysis.totals.reviewed_count_preserved}\``,
  `- Pending items preserved: \`${analysis.totals.pending_count_preserved}\``,
  `- Public decisions preserved: \`${analysis.totals.public_decision_count_preserved}\``,
  '- Source files read: `0`',
  '- Review decisions changed: `0`',
  '- Database changes: `0`',
  '- Cutover enabled: `false`',
  '',
  '## Unresolved reasons',
  '',
  '| Reason | Cases | Resolution lane |',
  '| --- | ---: | --- |',
  ...Object.entries(
    policy.resolution_lanes,
  )
    .sort(
      (
        [, left],
        [, right],
      ) =>
        left.priority -
        right.priority,
    )
    .map(
      ([lane, definition]) =>
        `| ${definition.source_reason} | ${laneCounts[lane]} | ${lane} |`,
    ),
  '',
  '## Resolution batches',
  '',
  '| Batch | Work | Cases | Recommended method |',
  '| --- | --- | ---: | --- |',
  ...batches.map(
    (batch) =>
      `| ${batch.batch_id} | ${workTitles[batch.book_id] ?? `Book ${batch.book_id}`} | ${batch.item_count} | ${batch.recommended_method} |`,
  ),
  '',
  '## Decision',
  '',
  'PR-0030 analyzes and groups the unresolved outcomes but does not reread the source editions or change any review decision.',
  '',
  'All 14 records remain unresolved and unapplied.',
  '',
]

await Promise.all([
  writeFile(
    paths.analysis,
    `${JSON.stringify(
      analysis,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.queue,
    `${JSON.stringify(
      queue,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.report,
    `${reportLines.join('\n')}\n`,
    'utf8',
  ),
])

console.log(
  'Analyzed 14 unresolved container-intro outcomes.',
)
console.log(
  `Reason counts: ${JSON.stringify(reasonCounts)}.`,
)
console.log(
  `Prepared ${batches.length} deterministic resolution batches.`,
)
console.log(
  'Source files read: 0.',
)
console.log(
  'Review decisions changed: 0.',
)
console.log(
  'Database changes: 0.',
)
