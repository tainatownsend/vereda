import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const isSupportedCumulativeStatus = (
  status,
) =>
  typeof status === 'string' &&
  (
    status.endsWith('-not-applied') ||
    status.endsWith('-not-reviewed')
  )

const [
  policy,
  sources,
  worklist,
  originalDecisions,
  analysis,
  queue,
  titleRecovery,
  recovery,
  progress,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-non-contents-recovery-policy.json',
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
    'content/migration/reading-segment-non-contents-recovery-decision.json',
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
const target = policy.target
const item = recovery.recovery
const evidence = item?.evidence || {}

const source = sources.works.find(
  (work) =>
    work.book_id === target.book_id,
)
const original =
  originalDecisions.decisions.find(
    (decision) =>
      decision.decision_id ===
      target.original_decision_id,
  )
const baseline = worklist.items.find(
  (entry) =>
    entry.decision_id ===
    target.original_decision_id,
)
const analysisItem =
  analysis.items.find(
    (entry) =>
      entry.analysis_id ===
      target.analysis_id,
  )
const batch = queue.batches.find(
  (entry) =>
    entry.batch_id ===
    target.batch_id,
)

if (
  policy.status !==
    'accepted-for-non-contents-recovery' ||
  recovery.status !==
    'non-contents-recovery-recorded-not-applied' ||
  (!isSupportedCumulativeStatus(progress.status))
) {
  errors.push(
    'policy, recovery, or progress status differs',
  )
}

if (
  recovery.policy_version !==
    policy.policy_version ||
  (typeof progress.policy_version !== 'string' ||
    progress.policy_version.length === 0) ||
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
  !source ||
  !original ||
  !baseline ||
  !analysisItem ||
  !batch ||
  original.review_status !==
    'unresolved' ||
  original.selected_decision !==
    'unresolved' ||
  original.evidence
    ?.unresolved_reason !==
    'selected-page-has-contents-signals' ||
  analysisItem.resolution_lane !==
    'non-contents-occurrence-recovery' ||
  analysisItem.segment_key !==
    target.segment_key ||
  batch.item_count !== 1 ||
  batch.decision_ids?.[0] !==
    target.original_decision_id ||
  titleRecovery.totals
    ?.resolved_count !== 0 ||
  titleRecovery.totals
    ?.still_unresolved_count !== 3
) {
  errors.push(
    'recovery baseline differs',
  )
}

if (
  recovery.contains_full_text !== false ||
  recovery.contains_source_excerpt !==
    false ||
  recovery.totals
    ?.target_item_count !== 1 ||
  recovery.totals
    ?.resolved_count +
    recovery.totals
      ?.still_unresolved_count !==
    1 ||
  recovery.totals
    ?.boundary_approved_count !== 0 ||
  recovery.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'recovery totals differ',
  )
}

if (
  !item ||
  item.original_decision_id !==
    target.original_decision_id ||
  item.analysis_id !==
    target.analysis_id ||
  item.inspection_id !==
    target.inspection_id ||
  item.packet_id !==
    target.packet_id ||
  item.segment_key !==
    target.segment_key ||
  item.display_title !==
    target.display_title ||
  item.successor_title !==
    target.successor_title ||
  evidence.source_sha256 !==
    source?.source_sha256 ||
  evidence.source_file !==
    source?.source_file ||
  evidence.original_contents_page !== 8 ||
  evidence.printed_page_hint !== 295
) {
  errors.push(
    'recovery or source identity differs',
  )
}

if (
  item.recovery_status ===
  'resolved'
) {
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
    !Number.isInteger(
      evidence
        .source_pdf_page_reviewed,
    ) ||
    evidence.source_pdf_page_reviewed <
      policy.matching_rules
        .minimum_source_pdf_page ||
    evidence.source_pdf_page_reviewed ===
      evidence.original_contents_page ||
    evidence.toc_like !== false ||
    evidence.successor_title_found !==
      true ||
    !Number.isInteger(
      evidence
        .successor_source_pdf_page_reviewed,
    ) ||
    evidence
      .successor_source_pdf_page_reviewed <
      evidence.source_pdf_page_reviewed ||
    evidence.successor_distance_pages <
      0 ||
    evidence.successor_distance_pages >
      policy.matching_rules
        .maximum_successor_distance_pages ||
    typeof evidence
      .current_title_match_method !==
      'string' ||
    evidence.current_title_match_score <=
      0 ||
    evidence
      .current_title_window_line_count <=
      0 ||
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
      'resolved non-contents outcome differs',
    )
  }

  if (
    item.selected_decision ===
      'exclude-structural-heading' &&
    (
      evidence
        .visible_prose_presence !==
        'heading-only' ||
      evidence.prose_signal_count !== 0 ||
      evidence.prose_word_count !== 0
    )
  ) {
    errors.push(
      'heading exclusion requires zero prose evidence',
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
      'retained introduction requires prose evidence',
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
      'still-unresolved recovery outcome differs',
    )
  }
} else {
  errors.push(
    'unexpected recovery status',
  )
}

if (
  item.source_text_included !== false ||
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
    'recovery application boundary differs',
  )
}

const resolved =
  recovery.totals.resolved_count

if (
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.pending_count > 126 ||
  progress.totals?.reviewed_count <
    4 + resolved ||
  progress.totals?.unresolved_count >
    14 - resolved ||
  progress.totals?.reviewed_count +
    progress.totals?.unresolved_count < 18 ||
  progress.totals
    ?.public_decision_count < 18 ||
  progress.totals
    ?.completed_packet_count < 4 ||
  progress.totals
    ?.pending_packet_count > 12 ||
  progress.totals
    ?.title_window_recovered_count !== 0 ||
  progress.totals
    ?.title_window_still_unresolved_count !==
    3 ||
  progress.totals
    ?.non_contents_recovered_count !==
    resolved ||
  progress.totals
    ?.non_contents_still_unresolved_count !==
    1 - resolved ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'cumulative non-contents progress differs',
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
    'Non-contents occurrence recovery validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 1 non-contents occurrence recovery attempt.',
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
