import {
  createHash,
} from 'node:crypto'
import {
  readFile,
  writeFile,
} from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const writeJson = async (
  filePath,
  value,
) => {
  await writeFile(
    filePath,
    `${JSON.stringify(
      value,
      null,
      2,
    )}\n`,
    'utf8',
  )
}

const [
  policy,
  titleWindow,
  nonContents,
  book3,
  book2,
  previousProgress,
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
    'content/migration/reading-segment-source-review-progress.json',
  ),
])

const runId = titleWindow.run_id

const sources = [
  {
    sourceId:
      'pr-0031-title-window',
    artifact:
      'content/migration/reading-segment-title-window-recovery-decisions.json',
    items:
      titleWindow.recoveries,
  },
  {
    sourceId:
      'pr-0032-non-contents',
    artifact:
      'content/migration/reading-segment-non-contents-recovery-decision.json',
    items: [
      nonContents.recovery,
    ],
  },
  {
    sourceId:
      'pr-0033-book-3-successor-anchor',
    artifact:
      'content/migration/reading-segment-book-3-successor-anchor-recovery-decisions.json',
    items:
      book3.recoveries,
  },
  {
    sourceId:
      'pr-0034-book-2-successor-anchor',
    artifact:
      'content/migration/reading-segment-book-2-successor-anchor-recovery-decisions.json',
    items:
      book2.recoveries,
  },
]

const attempts =
  sources.flatMap(
    ({
      sourceId,
      artifact,
      items,
    }) =>
      items.map((item) => ({
        source_id:
          sourceId,
        source_artifact:
          artifact,
        ...item,
      })),
  )

if (
  attempts.length !== 14 ||
  new Set(
    attempts.map(
      (item) =>
        item.original_decision_id,
    ),
  ).size !== 14 ||
  attempts.some(
    (item) =>
      item.run_id !== runId,
  )
) {
  throw new Error(
    'Recovery attempts are incomplete, duplicated, or belong to another run.',
  )
}

const resolvedAttempts =
  attempts.filter(
    (item) =>
      item.recovery_status ===
      'resolved',
  )
const unresolvedAttempts =
  attempts.filter(
    (item) =>
      item.recovery_status ===
      'still-unresolved',
  )

if (
  resolvedAttempts.length !== 7 ||
  unresolvedAttempts.length !== 7
) {
  throw new Error(
    'Expected exactly 7 resolved and 7 still-unresolved recovery attempts.',
  )
}

const laneFor = (item) => {
  if (
    item.source_id ===
    'pr-0031-title-window'
  ) {
    return (
      'manual-current-title-adjudication'
    )
  }

  if (
    item.source_id ===
    'pr-0032-non-contents'
  ) {
    return (
      'manual-source-opening-adjudication'
    )
  }

  if (
    item.source_id ===
    'pr-0033-book-3-successor-anchor'
  ) {
    return (
      'manual-successor-anchor-adjudication'
    )
  }

  if (
    item.source_id ===
    'pr-0034-book-2-successor-anchor'
  ) {
    return (
      'manual-current-title-adjudication'
    )
  }

  throw new Error(
    `Unsupported source: ${item.source_id}`,
  )
}

const consolidationIdFor =
  (item) =>
    createHash('sha256')
      .update(
        [
          policy.policy_version,
          item.original_decision_id,
        ].join('|'),
      )
      .digest('hex')
      .slice(0, 24)

const resolved = resolvedAttempts
  .map((item) => ({
    consolidation_id:
      consolidationIdFor(item),
    source_id:
      item.source_id,
    source_artifact:
      item.source_artifact,
    recovery_id:
      item.recovery_id,
    original_decision_id:
      item.original_decision_id,
    analysis_id:
      item.analysis_id,
    inspection_id:
      item.inspection_id,
    packet_id:
      item.packet_id,
    book_id:
      item.book_id,
    book_slug:
      item.book_slug,
    segment_key:
      item.segment_key,
    segment_order:
      item.segment_order,
    display_title:
      item.display_title,
    successor_title:
      item.successor_title,
    final_status:
      'resolved-not-applied',
    selected_decision:
      item.selected_decision,
    reviewer_confidence:
      item.reviewer_confidence,
    supersedes_original_unresolved:
      true,
    boundary_approved:
      false,
    database_change_applied:
      false,
    cutover_enabled:
      false,
  }))
  .sort(
    (left, right) =>
      left.book_id -
        right.book_id ||
      left.segment_order -
        right.segment_order ||
      left.segment_key.localeCompare(
        right.segment_key,
      ),
  )

const unresolved =
  unresolvedAttempts
    .map((item) => {
      const lane =
        laneFor(item)

      return {
        consolidation_id:
          consolidationIdFor(
            item,
          ),
        source_id:
          item.source_id,
        source_artifact:
          item.source_artifact,
        recovery_id:
          item.recovery_id,
        original_decision_id:
          item.original_decision_id,
        analysis_id:
          item.analysis_id,
        inspection_id:
          item.inspection_id,
        packet_id:
          item.packet_id,
        book_id:
          item.book_id,
        book_slug:
          item.book_slug,
        segment_key:
          item.segment_key,
        segment_order:
          item.segment_order,
        display_title:
          item.display_title,
        successor_title:
          item.successor_title,
        final_status:
          'manual-adjudication-required',
        selected_decision:
          'unresolved',
        final_unresolved_reason:
          item.unresolved_reason,
        manual_adjudication_lane:
          lane,
        automated_recovery_exhausted:
          true,
        reviewer_confidence:
          'low',
        source_text_included:
          false,
        source_excerpt_included:
          false,
        boundary_approved:
          false,
        database_change_applied:
          false,
        cutover_enabled:
          false,
      }
    })
    .sort(
      (left, right) =>
        left.book_id -
          right.book_id ||
        left.segment_order -
          right.segment_order ||
        left.segment_key.localeCompare(
          right.segment_key,
        ),
    )

const laneOrder = [
  'manual-current-title-adjudication',
  'manual-source-opening-adjudication',
  'manual-successor-anchor-adjudication',
]

const groups = new Map()

for (const item of unresolved) {
  const key = [
    item.manual_adjudication_lane,
    item.book_id,
  ].join('|')

  if (!groups.has(key)) {
    groups.set(key, [])
  }

  groups.get(key).push(item)
}

const batches = [
  ...groups.entries(),
]
  .map(([key, items]) => {
    const [
      lane,
      bookIdText,
    ] = key.split('|')
    const bookId =
      Number(bookIdText)
    const batchId = [
      lane,
      `book-${bookId}`,
      'batch-01',
    ].join('-')

    return {
      batch_id:
        batchId,
      manual_adjudication_lane:
        lane,
      book_id:
        bookId,
      book_slug:
        items[0].book_slug,
      item_count:
        items.length,
      consolidation_ids:
        items.map(
          (item) =>
            item.consolidation_id,
        ),
      recovery_ids:
        items.map(
          (item) =>
            item.recovery_id,
        ),
      original_decision_ids:
        items.map(
          (item) =>
            item.original_decision_id,
        ),
      segment_keys:
        items.map(
          (item) =>
            item.segment_key,
        ),
      status:
        'manual-adjudication-required-not-reviewed',
      requires_authorized_manual_source_review:
        true,
      source_files_read:
        false,
      source_text_included:
        false,
      decisions_changed:
        false,
      database_change_applied:
        false,
    }
  })
  .sort(
    (left, right) =>
      laneOrder.indexOf(
        left.manual_adjudication_lane,
      ) -
        laneOrder.indexOf(
          right.manual_adjudication_lane,
        ) ||
      left.book_id -
        right.book_id,
  )

if (
  batches.length !== 4 ||
  batches.reduce(
    (sum, batch) =>
      sum + batch.item_count,
    0,
  ) !== 7
) {
  throw new Error(
    'Expected 4 manual-adjudication batches covering 7 items.',
  )
}

const laneCounts =
  Object.fromEntries(
    laneOrder.map((lane) => [
      lane,
      unresolved.filter(
        (item) =>
          item.manual_adjudication_lane ===
          lane,
      ).length,
    ]),
  )

const sourceSummaries =
  sources.map(
    ({
      sourceId,
      artifact,
      items,
    }) => ({
      source_id:
        sourceId,
      source_artifact:
        artifact,
      attempt_count:
        items.length,
      resolved_count:
        items.filter(
          (item) =>
            item.recovery_status ===
            'resolved',
        ).length,
      still_unresolved_count:
        items.filter(
          (item) =>
            item.recovery_status ===
            'still-unresolved',
        ).length,
    }),
  )

const consolidation = {
  schema_version: 1,
  status:
    'unresolved-recovery-outcomes-consolidated-not-applied',
  policy_version:
    policy.policy_version,
  run_id:
    runId,
  rights_status:
    'blocked',
  contains_full_text:
    false,
  contains_source_excerpt:
    false,
  totals: {
    recovery_attempt_count:
      attempts.length,
    resolved_recovery_count:
      resolved.length,
    still_unresolved_count:
      unresolved.length,
    resolved_exclude_structural_heading_count:
      resolved.filter(
        (item) =>
          item.selected_decision ===
          'exclude-structural-heading',
      ).length,
    resolved_retain_intro_segment_count:
      resolved.filter(
        (item) =>
          item.selected_decision ===
          'retain-intro-segment',
      ).length,
    manual_adjudication_item_count:
      unresolved.length,
    manual_adjudication_batch_count:
      batches.length,
    source_file_read_count:
      0,
    source_text_read_count:
      0,
    new_review_decision_count:
      0,
    boundary_approved_count:
      0,
    database_change_count:
      0,
  },
  lane_counts:
    laneCounts,
  source_summaries:
    sourceSummaries,
  resolved_recoveries:
    resolved,
  unresolved_recoveries:
    unresolved,
  consolidation_boundary:
    policy.consolidation_boundary,
}

const queue = {
  schema_version: 1,
  status:
    'manual-adjudication-queue-prepared-not-reviewed',
  policy_version:
    policy.policy_version,
  run_id:
    runId,
  item_count:
    unresolved.length,
  batch_count:
    batches.length,
  lane_counts:
    laneCounts,
  batches,
  queue_boundary: {
    source_files_read:
      false,
    source_text_read:
      false,
    manual_review_completed:
      false,
    decisions_changed:
      false,
    boundary_approved:
      false,
    database_change_applied:
      false,
    cutover_enabled:
      false,
  },
}

const progress =
  structuredClone(
    previousProgress,
  )

progress.status =
  'unresolved-recovery-consolidated-not-applied'
progress.policy_version =
  policy.policy_version
progress.totals.recovery_attempt_count_total =
  14
progress.totals.recovery_resolved_count_total =
  7
progress.totals.recovery_still_unresolved_count_total =
  7
progress.totals.manual_adjudication_item_count =
  7
progress.totals.manual_adjudication_batch_count =
  4

const reportLines = [
  '# Unresolved Recovery Consolidation',
  '',
  (
    '- Status: ' +
    '`unresolved-recovery-outcomes-consolidated-not-applied`'
  ),
  (
    `- Policy version: ` +
    `\`${policy.policy_version}\``
  ),
  (
    `- Migration run ID: ` +
    `\`${runId}\``
  ),
  '- Recovery attempts: `14`',
  '- Resolved recovery outcomes: `7`',
  '- Still unresolved: `7`',
  '- Manual-adjudication batches: `4`',
  '- Source files read: `0`',
  '- Source text read: `0`',
  '- New review decisions: `0`',
  '- Boundary approvals: `0`',
  '- Database changes: `0`',
  '- Cutover enabled: `false`',
  '',
  '## Recovery source summary',
  '',
  '| Recovery source | Attempts | Resolved | Still unresolved |',
  '| --- | ---: | ---: | ---: |',
  ...sourceSummaries.map(
    (source) =>
      `| ${source.source_id} | ` +
      `${source.attempt_count} | ` +
      `${source.resolved_count} | ` +
      `${source.still_unresolved_count} |`,
  ),
  '',
  '## Preserved resolved recoveries',
  '',
  '| Work | Segment | Decision | Confidence |',
  '| --- | --- | --- | --- |',
  ...resolved.map(
    (item) =>
      `| ${item.book_slug} | ` +
      `${item.display_title} | ` +
      `${item.selected_decision} | ` +
      `${item.reviewer_confidence} |`,
  ),
  '',
  '## Manual-adjudication queue',
  '',
  '| Batch | Work | Lane | Items |',
  '| --- | --- | --- | ---: |',
  ...batches.map(
    (batch) =>
      `| ${batch.batch_id} | ` +
      `${batch.book_slug} | ` +
      `${batch.manual_adjudication_lane} | ` +
      `${batch.item_count} |`,
  ),
  '',
  '## Remaining unresolved items',
  '',
  '| Work | Segment | Final reason | Manual lane |',
  '| --- | --- | --- | --- |',
  ...unresolved.map(
    (item) =>
      `| ${item.book_slug} | ` +
      `${item.display_title} | ` +
      `${item.final_unresolved_reason} | ` +
      `${item.manual_adjudication_lane} |`,
  ),
  '',
  '## Cumulative review progress',
  '',
  '- Reviewed items: `11`',
  '- Unresolved items: `7`',
  '- Pending items: `126`',
  '- Public decisions: `18`',
  '- Completed packets: `4`',
  '- Pending packets: `12`',
  '',
  '## Application boundary',
  '',
  (
    'This consolidation does not read source files, ' +
    'create review decisions, approve boundaries, ' +
    'or modify staging or production.'
  ),
  '',
]

await Promise.all([
  writeJson(
    'content/migration/reading-segment-unresolved-recovery-consolidation.json',
    consolidation,
  ),
  writeJson(
    'content/migration/reading-segment-manual-adjudication-queue.json',
    queue,
  ),
  writeJson(
    'content/migration/reading-segment-source-review-progress.json',
    progress,
  ),
  writeFile(
    'content/migration/reports/reading-segment-unresolved-recovery-consolidation-summary.md',
    `${reportLines.join('\n')}\n`,
    'utf8',
  ),
])

console.log(
  'Consolidated 14 recovery attempts.',
)
console.log(
  'Preserved 7 resolved recovery outcomes.',
)
console.log(
  'Prepared 4 manual-adjudication batches for 7 still-unresolved cases.',
)
console.log(
  'Source files read: 0.',
)
console.log(
  'Database changes: 0.',
)
