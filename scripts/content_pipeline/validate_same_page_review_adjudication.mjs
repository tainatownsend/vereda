import {
  readFile,
} from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(
    await readFile(
      filePath,
      'utf8',
    ),
  )

const [
  policy,
  corpus,
  decisions,
  integration,
  progress,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-same-page-review-adjudication-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-review-corpus.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-review-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-review-integration-plan.json',
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
const corpusById = new Map(
  corpus.items.map(
    (item) => [
      item.corpus_item_id,
      item,
    ],
  ),
)
const overrideBySegment = new Map(
  policy.candidate_selection
    .manual_overrides
    .map(
      (item) => [
        item.segment_key,
        item,
      ],
    ),
)

if (
  policy.status !==
    'accepted-for-same-page-corpus-adjudication' ||
  decisions.status !==
    'same-page-review-adjudication-recorded-not-integrated' ||
  integration.status !==
    'same-page-review-integration-planned-not-applied' ||
  decisions.policy_version !==
    policy.policy_version ||
  integration.policy_version !==
    policy.policy_version ||
  decisions.run_id !== corpus.run_id ||
  integration.run_id !== corpus.run_id
) {
  errors.push(
    'policy, decisions, integration, or migration identity differs',
  )
}

if (
  decisions.contains_full_text !== false ||
  decisions.contains_source_excerpt !==
    false ||
  decisions.totals?.item_count !== 38 ||
  decisions.totals?.reviewed_count !== 38 ||
  decisions.totals?.unresolved_count !== 0 ||
  decisions.totals
    ?.exclude_structural_heading_count !== 38 ||
  decisions.totals
    ?.retain_intro_segment_count !== 0 ||
  decisions.totals
    ?.manual_override_count !== 4 ||
  decisions.totals
    ?.manual_review_completed_count !== 38 ||
  decisions.totals
    ?.boundary_approved_count !== 0 ||
  decisions.totals
    ?.database_change_count !== 0 ||
  decisions.totals
    ?.cumulative_progress_change_count !== 0 ||
  decisions.decisions?.length !== 38
) {
  errors.push(
    'same-page decision totals differ',
  )
}

if (
  decisions.totals
    .high_confidence_count +
    decisions.totals
      .medium_confidence_count !== 38
) {
  errors.push(
    'confidence totals differ',
  )
}

if (
  decisions.counts_by_book?.['1'] !== 23 ||
  decisions.counts_by_book?.['4'] !== 5 ||
  decisions.counts_by_book?.['5'] !== 10 ||
  decisions.counts_by_packet
    ?.['container-intro-same-page-book-1-packet-01'] !== 20 ||
  decisions.counts_by_packet
    ?.['container-intro-same-page-book-1-packet-02'] !== 3 ||
  decisions.counts_by_packet
    ?.['container-intro-same-page-book-4-packet-01'] !== 5 ||
  decisions.counts_by_packet
    ?.['container-intro-same-page-book-5-packet-01'] !== 10
) {
  errors.push(
    'decision distribution differs',
  )
}

const decisionIds = new Set()
const corpusIds = new Set()
const originalDecisionIds = new Set()
const segmentKeys = new Set()
let observedOverrides = 0

for (
  const decision of
  decisions.decisions || []
) {
  decisionIds.add(
    decision.same_page_decision_id,
  )
  corpusIds.add(
    decision.corpus_item_id,
  )
  originalDecisionIds.add(
    decision.original_decision_id,
  )
  segmentKeys.add(
    decision.segment_key,
  )

  const corpusItem =
    corpusById.get(
      decision.corpus_item_id,
    )
  const override =
    overrideBySegment.get(
      decision.segment_key,
    )
  const evidence =
    decision.evidence || {}

  if (
    !corpusItem ||
    decision.original_decision_id !==
      corpusItem.decision_id ||
    decision.inspection_id !==
      corpusItem.inspection_id ||
    decision.packet_id !==
      corpusItem.packet_id ||
    decision.run_id !==
      corpusItem.run_id ||
    decision.book_id !==
      corpusItem.book_id ||
    decision.book_slug !==
      corpusItem.book_slug ||
    decision.segment_key !==
      corpusItem.segment_key ||
    decision.segment_order !==
      corpusItem.segment_order ||
    decision.current_title !==
      corpusItem.current_title ||
    decision.successor_segment_key !==
      corpusItem.successor_segment_key ||
    decision.successor_title !==
      corpusItem.successor_title
  ) {
    errors.push(
      `${decision.segment_key}: decision identity differs`,
    )
  }

  if (
    decision.review_status !==
      'reviewed' ||
    decision.selected_decision !==
      'exclude-structural-heading' ||
    ![
      'high',
      'medium',
    ].includes(
      decision.reviewer_confidence,
    ) ||
    decision.manual_review_completed !==
      true ||
    decision.review_questions_answered !==
      true ||
    decision.boundary_decision_recorded !==
      true ||
    decision.boundary_approved !== false ||
    decision.source_text_included !== false ||
    decision.source_excerpt_included !==
      false ||
    decision.database_change_applied !==
      false ||
    decision.content_approved !== false ||
    decision.content_loaded !== false ||
    decision.cutover_enabled !== false
  ) {
    errors.push(
      `${decision.segment_key}: review or application boundary differs`,
    )
  }

  if (
    !Number.isInteger(
      evidence.source_pdf_page_reviewed,
    ) ||
    evidence.source_pdf_page_reviewed <= 0 ||
    !Number.isInteger(
      evidence.candidate_index_selected,
    ) ||
    evidence.candidate_index_selected < 0 ||
    ![
      'top-ranked-private-pair',
      'manual-private-candidate-override',
    ].includes(
      evidence.selection_method,
    ) ||
    typeof evidence.selection_reason !==
      'string' ||
    evidence.selection_reason.length === 0 ||
    evidence.current_match
      ?.match_score <= 0 ||
    evidence.successor_match
      ?.match_score <= 0 ||
    evidence.current_title_token_coverage <
      0.66 ||
    evidence.successor_title_token_coverage <
      0.66 ||
    evidence.pair_score <= 0 ||
    evidence.current_precedes_successor !==
      true ||
    evidence.intervening_line_count < 0 ||
    ![
      'none',
      'structural-synopsis',
    ].includes(
      evidence.intervening_content_type,
    ) ||
    evidence
      .independent_prose_exists_between !==
      false ||
    evidence
      .source_boundary_is_defensible !==
      true ||
    evidence.source_reference_only !== true
  ) {
    errors.push(
      `${decision.segment_key}: structured evidence differs`,
    )
  }

  if (override) {
    observedOverrides += 1

    if (
      evidence.selection_method !==
        'manual-private-candidate-override' ||
      evidence.candidate_index_selected !==
        override.candidate_index ||
      evidence.source_pdf_page_reviewed !==
        override.expected_source_pdf_page ||
      decision.reviewer_confidence !==
        policy.decision_rules
          .manual_override_confidence
    ) {
      errors.push(
        `${decision.segment_key}: manual override differs`,
      )
    }
  } else if (
    evidence.selection_method !==
      'top-ranked-private-pair' ||
    evidence.candidate_index_selected !== 0
  ) {
    errors.push(
      `${decision.segment_key}: default candidate selection differs`,
    )
  }
}

if (
  decisionIds.size !== 38 ||
  corpusIds.size !== 38 ||
  originalDecisionIds.size !== 38 ||
  segmentKeys.size !== 38 ||
  observedOverrides !== 4
) {
  errors.push(
    'decision identifiers or override coverage differ',
  )
}

if (
  JSON.stringify(
    integration.current_state,
  ) !==
    JSON.stringify({
      reviewed_count: 16,
      unresolved_count: 2,
      pending_count: 126,
      public_decision_count: 18,
      completed_packet_count: 4,
      pending_packet_count: 12,
    }) ||
  JSON.stringify(
    integration.planned_delta,
  ) !==
    JSON.stringify({
      reviewed_count: 38,
      unresolved_count: 0,
      pending_count: -38,
      public_decision_count: 38,
      completed_packet_count: 4,
      pending_packet_count: -4,
    }) ||
  JSON.stringify(
    integration.projected_state,
  ) !==
    JSON.stringify({
      reviewed_count: 54,
      unresolved_count: 2,
      pending_count: 88,
      public_decision_count: 56,
      completed_packet_count: 8,
      pending_packet_count: 8,
    }) ||
  integration.packet_updates?.length !== 4 ||
  integration.packet_updates.reduce(
    (sum, item) =>
      sum + item.reviewed_count,
    0,
  ) !== 38
) {
  errors.push(
    'integration plan differs',
  )
}

if (
  progress.status !==
    'remaining-manual-adjudication-recorded-not-applied' ||
  progress.totals?.reviewed_count !== 16 ||
  progress.totals?.unresolved_count !== 2 ||
  progress.totals?.pending_count !== 126 ||
  progress.totals?.public_decision_count !== 18 ||
  progress.totals?.completed_packet_count !== 4 ||
  progress.totals?.pending_packet_count !== 12
) {
  errors.push(
    'cumulative progress changed in the adjudication PR',
  )
}

const publicText =
  JSON.stringify({
    decisions,
    integration,
  })

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
  decisions.adjudication_boundary || {},
)) {
  if (
    [
      'private_corpus_read',
      'manual_review_completed',
      'structured_decisions_recorded',
      'integration_plan_generated',
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
    'Same-page review adjudication validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated all 38 same-page review decisions.',
)
console.log(
  'Validated 38 structural-heading exclusions and 0 unresolved outcomes.',
)
console.log(
  'Validated 4 manual candidate overrides.',
)
console.log(
  'Validated deferred integration: projected 54 reviewed, 2 unresolved, and 88 pending.',
)
console.log(
  'No source text, cumulative progress change, database change, or cutover was introduced.',
)
