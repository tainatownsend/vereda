import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  manifest,
  queue,
  consolidation,
  book3,
  decisions,
  closure,
  audit,
  progress,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-remaining-manual-adjudication-policy.json',
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
    'content/migration/reading-segment-book-3-manual-adjudication-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-remaining-manual-adjudication-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-manual-adjudication-closure.json',
  ),
  readJson(
    'content/migration/reading-segment-pending-source-review-audit.json',
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
const targetBySegment = new Map(
  policy.targets.map(
    (item) => [
      item.segment_key,
      item,
    ],
  ),
)
const consolidationBySegment = new Map(
  consolidation
    .unresolved_recoveries
    .map((item) => [
      item.segment_key,
      item,
    ]),
)
const sourceByBook = new Map(
  manifest.works.map(
    (item) => [
      item.book_id,
      item,
    ],
  ),
)

if (
  policy.status !==
    'accepted-for-remaining-manual-adjudication' ||
  decisions.status !==
    'remaining-manual-adjudication-recorded-not-applied' ||
  progress.status !==
    'remaining-manual-adjudication-recorded-not-applied' ||
  audit.status !==
    'pending-source-review-backlog-audited-not-reviewed'
) {
  errors.push(
    'policy, decisions, progress, or audit status differs',
  )
}

if (
  decisions.policy_version !==
    policy.policy_version ||
  closure.policy_version !==
    policy.policy_version ||
  audit.policy_version !==
    policy.policy_version ||
  progress.policy_version !==
    policy.policy_version ||
  decisions.run_id !==
    consolidation.run_id ||
  closure.run_id !==
    consolidation.run_id ||
  audit.run_id !==
    consolidation.run_id ||
  progress.run_id !==
    consolidation.run_id
) {
  errors.push(
    'policy or migration identity differs',
  )
}

if (
  queue.item_count !== 7 ||
  queue.batch_count !== 4 ||
  book3.totals?.reviewed_count !== 2 ||
  book3.totals?.unresolved_count !== 0 ||
  decisions.totals?.item_count !== 5 ||
  decisions.totals
    ?.manual_review_completed_count !== 5 ||
  decisions.totals
    ?.new_public_decision_identity_count !== 0 ||
  decisions.totals
    ?.boundary_approved_count !== 0 ||
  decisions.totals
    ?.database_change_count !== 0 ||
  decisions.decisions?.length !== 5
) {
  errors.push(
    'manual backlog totals differ',
  )
}

const resolved = decisions.decisions.filter(
  (item) =>
    item.review_status === 'reviewed',
)
const unresolved =
  decisions.decisions.filter(
    (item) =>
      item.review_status ===
      'unresolved',
  )

if (
  decisions.totals.reviewed_count !==
    resolved.length ||
  decisions.totals.unresolved_count !==
    unresolved.length ||
  resolved.length +
    unresolved.length !== 5 ||
  decisions.totals
    .exclude_structural_heading_count +
    decisions.totals
      .retain_intro_segment_count !==
    resolved.length
) {
  errors.push(
    'manual decision classifications differ',
  )
}

const manualDecisionIds = new Set()
const originalDecisionIds = new Set()
const segmentKeys = new Set()

for (
  const decision of
  decisions.decisions || []
) {
  manualDecisionIds.add(
    decision.manual_decision_id,
  )
  originalDecisionIds.add(
    decision.original_decision_id,
  )
  segmentKeys.add(
    decision.segment_key,
  )

  const target = targetBySegment.get(
    decision.segment_key,
  )
  const baseline =
    consolidationBySegment.get(
      decision.segment_key,
    )
  const source = sourceByBook.get(
    decision.book_id,
  )
  const evidence =
    decision.evidence || {}

  if (
    !target ||
    !baseline ||
    !source ||
    decision.original_decision_id !==
      baseline.original_decision_id ||
    decision.recovery_id !==
      baseline.recovery_id ||
    decision.consolidation_id !==
      baseline.consolidation_id ||
    decision.analysis_id !==
      baseline.analysis_id ||
    decision.inspection_id !==
      baseline.inspection_id ||
    decision.source_packet_id !==
      baseline.packet_id ||
    decision.book_id !==
      target.book_id ||
    decision.display_title !==
      target.display_title ||
    decision.successor_title !==
      target.successor_title ||
    decision.manual_batch_id !==
      target.manual_batch_id ||
    evidence.source_file !==
      source.source_file ||
    evidence.source_sha256 !==
      source.source_sha256
  ) {
    errors.push(
      `${decision.segment_key}: decision identity differs`,
    )
  }

  if (
    decision.manual_review_completed !==
      true ||
    decision.review_questions_answered !==
      true ||
    decision.source_text_included !==
      false ||
    decision.source_excerpt_included !==
      false ||
    decision.boundary_approved !== false ||
    decision.database_change_applied !==
      false ||
    decision.content_approved !== false ||
    decision.content_loaded !== false ||
    decision.cutover_enabled !== false ||
    evidence.source_reference_only !==
      true ||
    !Number.isInteger(
      evidence.current_candidate_count,
    ) ||
    !Number.isInteger(
      evidence.successor_candidate_count,
    ) ||
    !Number.isInteger(
      evidence.pair_candidate_count,
    ) ||
    evidence.current_candidates?.length >
      policy.matching_rules
        .maximum_public_candidates_per_item ||
    evidence.successor_candidates?.length >
      policy.matching_rules
        .maximum_public_candidates_per_item
  ) {
    errors.push(
      `${decision.segment_key}: evidence boundary differs`,
    )
  }

  if (
    decision.review_status ===
    'reviewed'
  ) {
    if (
      ![
        'exclude-structural-heading',
        'retain-intro-segment',
      ].includes(
        decision.selected_decision,
      ) ||
      ![
        'high',
        'medium',
      ].includes(
        decision.reviewer_confidence,
      ) ||
      decision.unresolved_reason !==
        null ||
      decision
        .supersedes_original_unresolved !==
        true ||
      decision
        .boundary_decision_recorded !==
        true ||
      evidence.current_title_found !==
        true ||
      evidence.successor_title_found !==
        true ||
      evidence.pair_ambiguous !== false ||
      evidence
        .source_boundary_is_defensible !==
        true ||
      !Number.isInteger(
        evidence
          .source_pdf_page_reviewed,
      ) ||
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
          .maximum_successor_distance_pages
    ) {
      errors.push(
        `${decision.segment_key}: resolved outcome differs`,
      )
    }

    if (
      decision.selected_decision ===
        'exclude-structural-heading' &&
      (
        evidence
          .visible_prose_presence !==
          'heading-only' ||
        evidence.prose_signal_count !== 0 ||
        evidence.prose_word_count !== 0 ||
        evidence
          .independent_prose_exists_between !==
          false
      )
    ) {
      errors.push(
        `${decision.segment_key}: structural exclusion requires zero prose evidence`,
      )
    }

    if (
      decision.selected_decision ===
        'retain-intro-segment' &&
      (
        evidence
          .visible_prose_presence !==
          'independent-prose' ||
        evidence.prose_signal_count <= 0 ||
        evidence.prose_word_count <= 0 ||
        evidence
          .independent_prose_exists_between !==
          true
      )
    ) {
      errors.push(
        `${decision.segment_key}: retained intro requires prose evidence`,
      )
    }
  } else if (
    decision.review_status ===
    'unresolved'
  ) {
    if (
      decision.selected_decision !==
        'unresolved' ||
      decision.reviewer_confidence !==
        'low' ||
      typeof decision.unresolved_reason !==
        'string' ||
      decision.unresolved_reason.length ===
        0 ||
      decision
        .supersedes_original_unresolved !==
        false ||
      decision
        .boundary_decision_recorded !==
        false ||
      evidence
        .source_boundary_is_defensible !==
        false
    ) {
      errors.push(
        `${decision.segment_key}: unresolved outcome differs`,
      )
    }
  } else {
    errors.push(
      `${decision.segment_key}: unexpected review status`,
    )
  }
}

if (
  manualDecisionIds.size !== 5 ||
  originalDecisionIds.size !== 5 ||
  segmentKeys.size !== 5 ||
  JSON.stringify(
    [...segmentKeys].sort(),
  ) !==
  JSON.stringify(
    [...targetBySegment.keys()].sort(),
  )
) {
  errors.push(
    'manual backlog identifiers must be unique and complete',
  )
}

const resolvedCount = resolved.length
const unresolvedCount =
  unresolved.length

if (
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.pending_count !== 126 ||
  progress.totals?.reviewed_count !==
    13 + resolvedCount ||
  progress.totals?.unresolved_count !==
    5 - resolvedCount ||
  progress.totals
    ?.public_decision_count !== 18 ||
  progress.totals
    ?.manual_adjudication_item_count !== 7 ||
  progress.totals
    ?.manual_adjudication_batch_count !== 4 ||
  progress.totals
    ?.manual_adjudication_packet_prepared_count !== 4 ||
  progress.totals
    ?.manual_adjudication_item_prepared_count !== 7 ||
  progress.totals
    ?.manual_adjudication_reviewed_count !== 7 ||
  progress.totals
    ?.manual_adjudication_resolved_count !==
    2 + resolvedCount ||
  progress.totals
    ?.manual_adjudication_still_unresolved_count !==
    unresolvedCount ||
  progress.totals
    ?.manual_adjudication_remaining_count !==
    unresolvedCount ||
  progress.totals
    ?.manual_adjudication_completed_batch_count !== 4 ||
  progress.totals
    ?.manual_adjudication_pending_batch_count !== 0 ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'cumulative manual backlog progress differs',
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

const resolvedByBook = new Map([
  [
    1,
    resolved.filter(
      (item) =>
        item.book_id === 1,
    ).length,
  ],
  [
    2,
    resolved.filter(
      (item) =>
        item.book_id === 2,
    ).length,
  ],
])

const book1Packet =
  progress.packets.find(
    (item) =>
      item.packet_id ===
      'container-intro-only-book-1-packet-01',
  )
const book2Packet =
  progress.packets.find(
    (item) =>
      item.packet_id ===
      'container-intro-only-book-2-packet-01',
  )
const book3Packet =
  progress.packets.find(
    (item) =>
      item.packet_id ===
      'container-intro-only-book-3-packet-01',
  )

if (
  !book1Packet ||
  book1Packet.item_count !== 4 ||
  book1Packet.reviewed_count !==
    1 + resolvedByBook.get(1) ||
  book1Packet.unresolved_count !==
    3 - resolvedByBook.get(1) ||
  book1Packet.reviewed_count +
    book1Packet.unresolved_count !== 4 ||
  !book2Packet ||
  book2Packet.item_count !== 9 ||
  book2Packet.reviewed_count !==
    7 + resolvedByBook.get(2) ||
  book2Packet.unresolved_count !==
    2 - resolvedByBook.get(2) ||
  book2Packet.reviewed_count +
    book2Packet.unresolved_count !== 9 ||
  !book3Packet ||
  book3Packet.reviewed_count !== 3 ||
  book3Packet.unresolved_count !== 0
) {
  errors.push(
    'Book 1, Book 2, or Book 3 packet progress differs',
  )
}

if (
  closure.totals
    ?.original_item_count !== 7 ||
  closure.totals
    ?.reviewed_item_count !== 7 ||
  closure.totals
    ?.resolved_item_count !==
    2 + resolvedCount ||
  closure.totals
    ?.unresolved_item_count !==
    unresolvedCount ||
  closure.totals
    ?.completed_batch_count !== 4 ||
  closure.totals
    ?.pending_batch_count !== 0 ||
  closure.totals
    ?.database_change_count !== 0 ||
  closure.batches?.length !== 4
) {
  errors.push(
    'manual-adjudication closure totals differ',
  )
}

if (
  audit.totals
    ?.pending_packet_count !== 12 ||
  audit.totals
    ?.pending_item_count !== 126 ||
  audit.totals
    ?.container_intro_same_page_count !== 38 ||
  audit.totals
    ?.same_page_no_semantic_anchor_count !== 88 ||
  audit.totals
    ?.database_change_count !== 0 ||
  audit.packets?.length !== 12 ||
  audit.packets.reduce(
    (sum, item) =>
      sum + item.pending_count,
    0,
  ) !== 126 ||
  audit.counts_by_book?.['1'] !== 29 ||
  audit.counts_by_book?.['2'] !== 70 ||
  audit.counts_by_book?.['3'] !== 1 ||
  audit.counts_by_book?.['4'] !== 6 ||
  audit.counts_by_book?.['5'] !== 20
) {
  errors.push(
    'pending source-review audit differs',
  )
}

const publicText =
  JSON.stringify({
    decisions,
    closure,
    audit,
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
      'local_sources_read',
      'private_evidence_generated',
      'structured_diagnostics_recorded',
      'manual_review_completed',
      'structured_decisions_recorded',
      'pending_backlog_audited',
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
    'Remaining manual backlog validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated all 5 remaining manual-adjudication diagnostics.',
)
console.log(
  `Validated ${resolvedCount} newly resolved and ${unresolvedCount} still-unresolved outcomes.`,
)
console.log(
  'Validated the complete 126-item pending source-review audit.',
)
console.log(
  `Validated cumulative state: ${progress.totals.reviewed_count} reviewed, ${progress.totals.unresolved_count} unresolved, and 126 pending.`,
)
console.log(
  'No source text, boundary approval, database change, or cutover was introduced.',
)
