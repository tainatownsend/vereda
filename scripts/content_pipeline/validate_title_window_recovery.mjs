import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  sources,
  worklist,
  originalDecisions,
  analysis,
  queue,
  recovery,
  progress,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-title-window-recovery-policy.json',
  ),
  readJson(
    'content/sources/manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-container-intro-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-container-intro-unresolved-analysis.json',
  ),
  readJson(
    'content/migration/reading-segment-container-intro-resolution-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-title-window-recovery-decisions.json',
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
const sourceByBook = new Map(
  sources.works.map(
    (work) => [
      work.book_id,
      work,
    ],
  ),
)
const baselineByDecision = new Map(
  originalDecisions.decisions.map(
    (decision) => [
      decision.decision_id,
      decision,
    ],
  ),
)
const worklistByDecision = new Map(
  worklist.items.map(
    (item) => [
      item.decision_id,
      item,
    ],
  ),
)
const analysisByDecision = new Map(
  analysis.items
    .filter(
      (item) =>
        item.resolution_lane ===
        'current-title-window-recovery',
    )
    .map((item) => [
      item.decision_id,
      item,
    ]),
)

if (
  policy.status !==
    'accepted-for-title-window-recovery' ||
  recovery.status !==
    'title-window-recovery-recorded-not-applied' ||
  progress.status !==
    'title-window-recovery-completed-not-applied'
) {
  errors.push(
    'policy, recovery, or progress status differs',
  )
}

if (
  recovery.policy_version !==
    policy.policy_version ||
  progress.policy_version !==
    policy.policy_version ||
  recovery.run_id !==
    analysis.run_id ||
  progress.run_id !==
    analysis.run_id
) {
  errors.push(
    'policy or migration identity differs',
  )
}

if (
  recovery.contains_full_text !== false ||
  recovery.contains_source_excerpt !==
    false ||
  recovery.totals
    ?.target_item_count !== 3 ||
  recovery.recoveries?.length !== 3 ||
  recovery.totals
    ?.resolved_count +
    recovery.totals
      ?.still_unresolved_count !==
    3 ||
  recovery.totals
    ?.boundary_approved_count !== 0 ||
  recovery.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'title-window recovery totals differ',
  )
}

const recoveryIds = new Set()
const originalDecisionIds = new Set()
const segmentKeys = new Set()

for (
  const item of
  recovery.recoveries || []
) {
  recoveryIds.add(
    item.recovery_id,
  )
  originalDecisionIds.add(
    item.original_decision_id,
  )
  segmentKeys.add(
    item.segment_key,
  )

  const original =
    baselineByDecision.get(
      item.original_decision_id,
    )
  const baseline =
    worklistByDecision.get(
      item.original_decision_id,
    )
  const analysisItem =
    analysisByDecision.get(
      item.original_decision_id,
    )
  const source =
    sourceByBook.get(
      item.book_id,
    )
  const evidence =
    item.evidence || {}

  if (
    !original ||
    !baseline ||
    !analysisItem ||
    !source ||
    original.review_status !==
      'unresolved' ||
    original.selected_decision !==
      'unresolved' ||
    analysisItem.segment_key !==
      item.segment_key ||
    baseline.inspection_id !==
      item.inspection_id ||
    source.source_sha256 !==
      evidence.source_sha256 ||
    source.source_file !==
      evidence.source_file
  ) {
    errors.push(
      `${item.segment_key}: recovery baseline or source identity differs`,
    )
  }

  if (
    !Number.isInteger(
      evidence.source_pdf_page_reviewed,
    ) ||
    evidence.source_pdf_page_reviewed <=
      0
  ) {
    errors.push(
      `${item.segment_key}: source-page evidence differs`,
    )
  }

  if (
    item.recovery_status ===
    'resolved'
  ) {
    if (
      typeof evidence
        .current_title_match_method !==
        'string' ||
      evidence.current_title_match_score <=
        0 ||
      evidence
        .current_title_window_line_count <=
        0 ||
      evidence.toc_signal_count !== 0
    ) {
      errors.push(
        `${item.segment_key}: resolved current-title evidence differs`,
      )
    }

    if (
      ![
        'exclude-structural-heading',
        'retain-intro-segment',
      ].includes(
        item.selected_decision,
      ) ||
      !baseline.decision_options.includes(
        item.selected_decision,
      ) ||
      evidence.successor_title_found !==
        true ||
      !Number.isInteger(
        evidence
          .successor_source_pdf_page_reviewed,
      ) ||
      ![
        'high',
        'medium',
      ].includes(
        item.reviewer_confidence,
      ) ||
      item.unresolved_reason !== null ||
      item
        .supersedes_original_unresolved !==
        true
    ) {
      errors.push(
        `${item.segment_key}: resolved outcome differs`,
      )
    }

    if (
      item.selected_decision ===
        'exclude-structural-heading' &&
      (
        evidence
          .visible_prose_presence !==
          'heading-only' ||
        evidence.prose_signal_count !==
          0 ||
        evidence.prose_word_count !== 0
      )
    ) {
      errors.push(
        `${item.segment_key}: heading exclusion requires zero prose evidence`,
      )
    }

    if (
      item.selected_decision ===
        'retain-intro-segment' &&
      (
        evidence
          .visible_prose_presence !==
          'independent-prose' ||
        evidence.prose_signal_count <= 0 ||
        evidence.prose_word_count <= 0
      )
    ) {
      errors.push(
        `${item.segment_key}: retained intro requires prose evidence`,
      )
    }
  } else if (
    item.recovery_status ===
    'still-unresolved'
  ) {
    if (
      item.selected_decision !==
        'unresolved' ||
      item.reviewer_confidence !==
        'low' ||
      typeof item.unresolved_reason !==
        'string' ||
      item.unresolved_reason.length === 0 ||
      item
        .supersedes_original_unresolved !==
        false
    ) {
      errors.push(
        `${item.segment_key}: unresolved recovery outcome differs`,
      )
    }

    if (
      evidence.current_title_match_method ===
        null
    ) {
      if (
        evidence.current_title_match_score !==
          null ||
        evidence
          .current_title_window_line_count !==
          0 ||
        evidence.successor_title_found !==
          false ||
        evidence
          .successor_source_pdf_page_reviewed !==
          null
      ) {
        errors.push(
          `${item.segment_key}: missing-title evidence is inconsistent`,
        )
      }
    } else if (
      typeof evidence
        .current_title_match_method !==
        'string' ||
      evidence.current_title_match_score <=
        0 ||
      evidence
        .current_title_window_line_count <=
        0 ||
      evidence.toc_signal_count !== 0
    ) {
      errors.push(
        `${item.segment_key}: partial unresolved title evidence differs`,
      )
    }
  } else {
    errors.push(
      `${item.segment_key}: unexpected recovery status`,
    )
  }

  if (
    item.source_text_included !==
      false ||
    item.source_excerpt_included !==
      false ||
    item.boundary_approved !== false ||
    item.database_change_applied !==
      false ||
    item.content_approved !== false ||
    item.content_loaded !== false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: recovery application boundary differs`,
    )
  }
}

if (
  recoveryIds.size !== 3 ||
  originalDecisionIds.size !== 3 ||
  segmentKeys.size !== 3
) {
  errors.push(
    'recovery identifiers must be unique',
  )
}

const resolved =
  recovery.totals.resolved_count

if (
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.pending_count !== 126 ||
  progress.totals?.reviewed_count !==
    4 + resolved ||
  progress.totals?.unresolved_count !==
    14 - resolved ||
  progress.totals
    ?.public_decision_count !== 18 ||
  progress.totals
    ?.completed_packet_count !== 4 ||
  progress.totals
    ?.pending_packet_count !== 12 ||
  progress.totals
    ?.title_window_recovered_count !==
    resolved ||
  progress.totals
    ?.title_window_still_unresolved_count !==
    3 - resolved ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'cumulative recovery progress differs',
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
  progress.application_boundary || {},
)) {
  if (
    field ===
    'structured_decisions_recorded'
  ) {
    if (value !== true) {
      errors.push(
        `${field} must remain true`,
      )
    }
  } else if (value !== false) {
    errors.push(
      `${field} must remain false`,
    )
  }
}

const queuedIds =
  queue.batches
    .filter(
      (batch) =>
        batch.resolution_lane ===
        'current-title-window-recovery',
    )
    .flatMap(
      (batch) =>
        batch.decision_ids,
    )

if (
  queuedIds.length !== 3 ||
  JSON.stringify(
    [...queuedIds].sort(),
  ) !==
  JSON.stringify(
    [...originalDecisionIds].sort(),
  )
) {
  errors.push(
    'recovery outcomes do not cover the complete title-window queue',
  )
}

const publicText =
  JSON.stringify(recovery)

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
  !gitignore
    .split(/\r?\n/)
    .includes('.vereda-private/')
) {
  errors.push(
    'private workspace is not ignored by Git',
  )
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
    'historical decision artifact or database state changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'Title-window recovery validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 3 current-title-window recovery attempts.',
)
console.log(
  `Resolved outcomes: ${recovery.totals.resolved_count}.`,
)
console.log(
  `Still unresolved: ${recovery.totals.still_unresolved_count}.`,
)
console.log(
  `Validated cumulative state: ${progress.totals.reviewed_count} reviewed, ${progress.totals.unresolved_count} unresolved, and 126 pending.`,
)
console.log(
  'No source text, boundary approval, database change, or cutover was introduced.',
)
