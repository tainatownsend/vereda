import {
  createHash,
} from 'node:crypto'
import {
  readFile,
} from 'node:fs/promises'

const readJson = async (path) =>
  JSON.parse(await readFile(path, 'utf8'))

const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')

const [
  policy,
  packet,
  corpus,
  progress,
  decisions,
  plan,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-no-anchor-ambiguous-adjudication-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
  ),
  readJson(
    'content/migration/reading-segment-no-anchor-discovery-corpus.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readJson(
    'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-no-anchor-ambiguous-integration-plan.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readFile('.gitignore', 'utf8'),
])

const errors = []
const expectedTotals = {
  item_count: 25,
  resolved_count: 16,
  unresolved_count: 9,
  confirm_successor_start_count: 10,
  adjust_successor_start_count: 6,
  merge_with_successor_count: 0,
  candidate_override_count: 8,
  high_confidence_count: 10,
  medium_confidence_count: 6,
  low_confidence_count: 9,
  manual_review_completed_count: 25,
  review_decision_count: 25,
  prepared_lane_preserved_count: 63,
  cumulative_progress_change_count: 0,
  boundary_approved_count: 0,
  database_change_count: 0,
}

if (
  policy.status !==
    'accepted-for-no-anchor-ambiguous-adjudication' ||
  decisions.status !==
    'no-anchor-ambiguous-adjudication-recorded-not-integrated' ||
  plan.status !==
    'no-anchor-ambiguous-integration-planned-not-applied'
) {
  errors.push(
    'policy, decision, or integration-plan status differs',
  )
}

if (
  decisions.policy_version !==
    policy.policy_version ||
  plan.policy_version !==
    policy.policy_version ||
  decisions.run_id !== packet.run_id ||
  plan.run_id !== packet.run_id
) {
  errors.push(
    'policy, run, or migration identity differs',
  )
}

for (const [
  field,
  expected,
] of Object.entries(expectedTotals)) {
  if (
    decisions.totals?.[field] !==
    expected
  ) {
    errors.push(
      `${field}: expected ${expected}; received ${decisions.totals?.[field]}`,
    )
  }
}

if (
  decisions.contains_full_text !== false ||
  decisions.contains_source_excerpt !== false ||
  decisions.rights_status !== 'blocked' ||
  decisions.decisions?.length !== 25
) {
  errors.push(
    'public adjudication content boundary differs',
  )
}

if (
  JSON.stringify(
    decisions.counts_by_outcome,
  ) !==
  JSON.stringify({
    'confirm-successor-start': 10,
    'adjust-successor-start': 6,
    'merge-with-successor': 0,
    unresolved: 9,
  }) ||
  JSON.stringify(
    decisions.counts_by_confidence,
  ) !==
  JSON.stringify({
    high: 10,
    medium: 6,
    low: 9,
  })
) {
  errors.push(
    'outcome or confidence totals differ',
  )
}

const expectedHashes = {
  review_packet_sha256:
    await sha256(
      'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
    ),
  discovery_corpus_sha256:
    await sha256(
      'content/migration/reading-segment-no-anchor-discovery-corpus.json',
    ),
  progress_sha256:
    await sha256(
      'content/migration/reading-segment-source-review-progress.json',
    ),
}

for (const [
  field,
  expected,
] of Object.entries(expectedHashes)) {
  if (
    decisions.input_hashes?.[field] !==
    expected
  ) {
    errors.push(
      `${field} differs`,
    )
  }
}

if (
  typeof decisions.input_hashes
    ?.private_review_packet_sha256 !==
    'string' ||
  decisions.input_hashes
    .private_review_packet_sha256.length !== 64
) {
  errors.push(
    'private review packet hash is missing',
  )
}

const packetById = new Map(
  (packet.items || []).map(
    (item) => [
      item.review_packet_item_id,
      item,
    ],
  ),
)
const adjudicationIds = new Set()
const packetItemIds = new Set()
const segmentKeys = new Set()
let overrides = 0
let reviewed = 0
let unresolved = 0

for (
  const decision of
  decisions.decisions || []
) {
  adjudicationIds.add(
    decision.adjudication_id,
  )
  packetItemIds.add(
    decision.review_packet_item_id,
  )
  segmentKeys.add(
    decision.segment_key,
  )

  const source = packetById.get(
    decision.review_packet_item_id,
  )

  if (
    !source ||
    source.discovery_item_id !==
      decision.discovery_item_id ||
    source.decision_id !==
      decision.decision_id ||
    source.inspection_id !==
      decision.inspection_id ||
    source.packet_id !==
      decision.packet_id ||
    source.segment_key !==
      decision.segment_key ||
    source.current_title !==
      decision.current_title ||
    source.successor_segment_key !==
      decision.successor_segment_key ||
    source.successor_title !==
      decision.successor_title
  ) {
    errors.push(
      `${decision.segment_key}: source identity differs`,
    )
  }

  if (
    decision.manual_review_required !==
      true ||
    decision.manual_review_completed !==
      true ||
    decision.review_questions_answered !==
      true ||
    decision.boundary_decision_recorded !==
      true ||
    decision.boundary_approved !== false ||
    decision.source_text_included !==
      false ||
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
    ![
      'confirm-successor-start',
      'adjust-successor-start',
      'merge-with-successor',
      'unresolved',
    ].includes(
      decision.selected_outcome,
    ) ||
    ![
      'high',
      'medium',
      'low',
    ].includes(
      decision.reviewer_confidence,
    ) ||
    typeof decision.rationale_code !==
      'string' ||
    decision.rationale_code.length === 0
  ) {
    errors.push(
      `${decision.segment_key}: structured outcome differs`,
    )
  }

  if (
    decision.selected_outcome ===
      'unresolved'
  ) {
    unresolved += 1

    if (
      decision.review_status !==
        'unresolved' ||
      decision.selected_candidate_index !==
        null ||
      decision.selected_pair !== null ||
      decision.reviewer_confidence !==
        'low'
    ) {
      errors.push(
        `${decision.segment_key}: unresolved decision boundary differs`,
      )
    }
  } else {
    reviewed += 1
    const selected =
      (source?.candidates || []).find(
        (candidate) =>
          candidate.candidate_index ===
          decision.selected_candidate_index,
      )

    if (
      decision.review_status !==
        'reviewed' ||
      !Number.isInteger(
        decision.selected_candidate_index,
      ) ||
      !selected ||
      JSON.stringify(selected) !==
        JSON.stringify(
          decision.selected_pair,
        ) ||
      selected.current_precedes_successor !==
        true ||
      decision.reviewer_confidence ===
        'low'
    ) {
      errors.push(
        `${decision.segment_key}: resolved candidate differs`,
      )
    }

    if (
      decision.selected_candidate_index !==
        0
    ) {
      overrides += 1
    }
  }
}

if (
  adjudicationIds.size !== 25 ||
  packetItemIds.size !== 25 ||
  segmentKeys.size !== 25 ||
  reviewed !== 16 ||
  unresolved !== 9 ||
  overrides !== 8
) {
  errors.push(
    'decision coverage, resolution, or override totals differ',
  )
}

if (
  corpus.totals
    ?.evidence_prepared_count !== 63 ||
  corpus.totals
    ?.evidence_ambiguous_count !== 25 ||
  corpus.totals
    ?.evidence_incomplete_count !== 0 ||
  packet.totals?.item_count !== 25 ||
  packet.totals?.candidate_count !== 125
) {
  errors.push(
    'PR-0042 or PR-0043 source totals differ',
  )
}

if (
  progress.status !==
    'same-page-review-integrated-not-applied' ||
  progress.totals?.reviewed_count !== 54 ||
  progress.totals?.unresolved_count !== 2 ||
  progress.totals?.pending_count !== 88 ||
  progress.totals
    ?.public_decision_count !== 56 ||
  progress.totals
    ?.completed_packet_count !== 8 ||
  progress.totals
    ?.pending_packet_count !== 8
) {
  errors.push(
    'cumulative progress changed unexpectedly',
  )
}

if (
  JSON.stringify(
    plan.current_state,
  ) !==
  JSON.stringify({
    reviewed_count: 54,
    unresolved_count: 2,
    pending_count: 88,
    public_decision_count: 56,
    completed_packet_count: 8,
    pending_packet_count: 8,
  }) ||
  JSON.stringify(
    plan.planned_delta,
  ) !==
  JSON.stringify({
    reviewed_count: 16,
    unresolved_count: 9,
    pending_count: -25,
    public_decision_count: 25,
    completed_packet_count: 0,
    pending_packet_count: 0,
  }) ||
  JSON.stringify(
    plan.projected_state,
  ) !==
  JSON.stringify({
    reviewed_count: 70,
    unresolved_count: 11,
    pending_count: 63,
    public_decision_count: 81,
    completed_packet_count: 8,
    pending_packet_count: 8,
  }) ||
  plan.preserved_prepared_lane
    ?.item_count !== 63 ||
  plan.integration_boundary
    ?.progress_update_applied !== false
) {
  errors.push(
    'integration plan or projected state differs',
  )
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

for (const [
  field,
  value,
] of Object.entries(
  decisions.adjudication_boundary || {},
)) {
  if (
    [
      'private_review_packet_read',
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
    'No-anchor ambiguous adjudication validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated all 25 ambiguous no-anchor adjudications.',
)
console.log(
  'Validated 16 resolved and 9 unresolved outcomes.',
)
console.log(
  'Validated 10 confirmations, 6 adjustments, and 8 candidate overrides.',
)
console.log(
  'Validated deferred integration: projected 70 reviewed, 11 unresolved, and 63 pending.',
)
console.log(
  'No cumulative progress, database, production, or cutover change was introduced.',
)
