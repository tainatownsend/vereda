import {
  readFile,
} from 'node:fs/promises'
import {
  sha256LegacyCrlf,
} from './hash_utils.mjs'

const readJson = async (filePath) =>
  JSON.parse(
    await readFile(
      filePath,
      'utf8',
    ),
  )

const [
  policy,
  manifest,
  worklist,
  inspectionPackets,
  audit,
  progress,
  corpus,
  application,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-same-page-review-corpus-policy.json',
  ),
  readJson(
    'content/sources/manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-packets.json',
  ),
  readJson(
    'content/migration/reading-segment-pending-source-review-audit.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-review-corpus.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readFile('.gitignore', 'utf8'),
])

const errors = []
const targetPacketIds = new Set(
  policy.target.packet_ids,
)
const worklistByDecision = new Map(
  worklist.items
    .filter(
      (item) =>
        targetPacketIds.has(
          item.packet_id,
        ),
    )
    .map(
      (item) => [
        item.decision_id,
        item,
      ],
    ),
)
const inspectionById = new Map(
  inspectionPackets.packets
    .filter(
      (packet) =>
        targetPacketIds.has(
          packet.packet_id,
        ),
    )
    .flatMap(
      (packet) =>
        packet.items,
    )
    .map(
      (item) => [
        item.inspection_id,
        item,
      ],
    ),
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
    'accepted-for-same-page-review-corpus-preparation' ||
  corpus.status !==
    'same-page-review-corpus-prepared-not-reviewed' ||
  corpus.policy_version !==
    policy.policy_version ||
  corpus.run_id !==
    worklist.run_id ||
  corpus.rights_status !==
    'blocked'
) {
  errors.push(
    'policy, corpus, or migration identity differs',
  )
}

if (
  corpus.contains_full_text !== false ||
  corpus.contains_source_excerpt !==
    false ||
  corpus.totals?.packet_count !== 4 ||
  corpus.totals?.item_count !== 38 ||
  corpus.totals
    ?.manual_review_completed_count !== 0 ||
  corpus.totals
    ?.review_decision_count !== 0 ||
  corpus.totals
    ?.boundary_approved_count !== 0 ||
  corpus.totals
    ?.database_change_count !== 0 ||
  corpus.items?.length !== 38
) {
  errors.push(
    'same-page corpus totals differ',
  )
}

if (
  corpus.totals
    .evidence_prepared_count +
    corpus.totals
      .evidence_ambiguous_count +
    corpus.totals
      .evidence_incomplete_count !==
    38 ||
  corpus.totals
    .items_with_pair_candidates_count +
    corpus.totals
      .items_without_pair_candidates_count !==
    38
) {
  errors.push(
    'corpus evidence-status totals differ',
  )
}

if (
  corpus.counts_by_book?.['1'] !== 23 ||
  corpus.counts_by_book?.['4'] !== 5 ||
  corpus.counts_by_book?.['5'] !== 10 ||
  Object.keys(
    corpus.counts_by_book || {},
  ).length !== 3 ||
  corpus.counts_by_packet
    ?.['container-intro-same-page-book-1-packet-01'] !==
    20 ||
  corpus.counts_by_packet
    ?.['container-intro-same-page-book-1-packet-02'] !==
    3 ||
  corpus.counts_by_packet
    ?.['container-intro-same-page-book-4-packet-01'] !==
    5 ||
  corpus.counts_by_packet
    ?.['container-intro-same-page-book-5-packet-01'] !==
    10
) {
  errors.push(
    'corpus book or packet distribution differs',
  )
}

const expectedImmutableHashes = {
  worklist_sha256: await sha256LegacyCrlf(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  inspection_packets_sha256:
    await sha256LegacyCrlf(
      'content/migration/reading-segment-source-inspection-packets.json',
    ),
  pending_audit_sha256:
    await sha256LegacyCrlf(
      'content/migration/reading-segment-pending-source-review-audit.json',
    ),
}

for (const [
  field,
  value,
] of Object.entries(
  expectedImmutableHashes,
)) {
  if (
    corpus.input_hashes?.[field] !==
    value
  ) {
    errors.push(
      `${field} differs`,
    )
  }
}

const currentProgressHash =
  await sha256LegacyCrlf(
    'content/migration/reading-segment-source-review-progress.json',
  )

if (
  corpus.input_hashes
    ?.progress_sha256 !==
  currentProgressHash
) {
  let historicalProgressHash = null

  try {
    const integrationEvidence =
      await readJson(
        'content/migration/reading-segment-same-page-progress-integration-evidence.json',
      )

    historicalProgressHash =
      integrationEvidence.input_hashes
        ?.progress_before_sha256 ?? null
  } catch {
    historicalProgressHash = null
  }

  if (
    corpus.input_hashes
      ?.progress_sha256 !==
    historicalProgressHash
  ) {
    errors.push(
      'progress_sha256 differs from both current and preserved historical progress',
    )
  }
}

const corpusItemIds = new Set()
const decisionIds = new Set()
const inspectionIds = new Set()
const segmentKeys = new Set()

for (
  const item of
  corpus.items || []
) {
  corpusItemIds.add(
    item.corpus_item_id,
  )
  decisionIds.add(
    item.decision_id,
  )
  inspectionIds.add(
    item.inspection_id,
  )
  segmentKeys.add(
    item.segment_key,
  )

  const baseline =
    worklistByDecision.get(
      item.decision_id,
    )
  const inspection =
    inspectionById.get(
      item.inspection_id,
    )
  const successor =
    inspection?.context?.successor
  const source =
    sourceByBook.get(
      item.book_id,
    )

  if (
    !baseline ||
    !inspection ||
    !successor ||
    !source ||
    baseline.inspection_id !==
      item.inspection_id ||
    baseline.packet_id !==
      item.packet_id ||
    baseline.segment_key !==
      item.segment_key ||
    baseline.segment_order !==
      item.segment_order ||
    baseline.display_title !==
      item.current_title ||
    baseline.book_id !==
      item.book_id ||
    baseline.book_slug !==
      item.book_slug ||
    baseline.inspection_lane !==
      'container-intro-same-page' ||
    successor.segment_key !==
      item.successor_segment_key ||
    successor.display_title !==
      item.successor_title
  ) {
    errors.push(
      `${item.segment_key}: corpus identity differs`,
    )
  }

  if (
    ![
      'evidence-prepared-not-reviewed',
      'evidence-ambiguous-not-reviewed',
      'evidence-incomplete-not-reviewed',
    ].includes(
      item.corpus_status,
    ) ||
    !Number.isInteger(
      item.pair_candidate_count,
    ) ||
    item.pair_candidate_count < 0 ||
    !Number.isInteger(
      item.public_pair_candidate_count,
    ) ||
    item.public_pair_candidate_count < 0 ||
    item.public_pair_candidate_count >
      policy.matching_rules
        .maximum_public_pair_candidates ||
    item.pair_candidates?.length !==
      item.public_pair_candidate_count ||
    item.manual_review_required !==
      true ||
    item.manual_review_completed !==
      false ||
    item.selected_decision !== null ||
    item.reviewer_confidence !== null ||
    item.source_text_included !==
      false ||
    item.source_excerpt_included !==
      false ||
    item.boundary_decision_recorded !==
      false ||
    item.boundary_approved !== false ||
    item.database_change_applied !==
      false ||
    item.content_approved !== false ||
    item.content_loaded !== false ||
    item.cutover_enabled !== false
  ) {
    errors.push(
      `${item.segment_key}: preparation boundary differs`,
    )
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

  if (
    item.corpus_status ===
      'evidence-incomplete-not-reviewed'
  ) {
    if (
      item.pair_candidate_count !== 0 ||
      item.selected_pair !== null
    ) {
      errors.push(
        `${item.segment_key}: incomplete evidence must not select a pair`,
      )
    }
  } else {
    const pair =
      item.selected_pair

    if (
      !pair ||
      item.pair_candidate_count < 1 ||
      pair.current_precedes_successor !==
        true ||
      !Number.isInteger(
        pair.source_pdf_page,
      ) ||
      pair.source_pdf_page <= 0 ||
      pair.current?.match_score <= 0 ||
      pair.successor?.match_score <= 0 ||
      pair.intervening_line_count < 0 ||
      pair.page_distance_from_printed_hint >
        policy.matching_rules
          .maximum_printed_page_distance
    ) {
      errors.push(
        `${item.segment_key}: selected pair differs`,
      )
    }

    if (
      item.corpus_status ===
        'evidence-prepared-not-reviewed' &&
      item.pair_ambiguous !== false
    ) {
      errors.push(
        `${item.segment_key}: prepared evidence cannot be ambiguous`,
      )
    }

    if (
      item.corpus_status ===
        'evidence-ambiguous-not-reviewed' &&
      item.pair_ambiguous !== true
    ) {
      errors.push(
        `${item.segment_key}: ambiguous evidence must be marked`,
      )
    }
  }
}

if (
  corpusItemIds.size !== 38 ||
  decisionIds.size !== 38 ||
  inspectionIds.size !== 38 ||
  segmentKeys.size !== 38
) {
  errors.push(
    'corpus identifiers must be unique',
  )
}

if (
  corpus.sources?.length !== 3
) {
  errors.push(
    'corpus source list differs',
  )
} else {
  for (
    const corpusSource of
    corpus.sources
  ) {
    const source =
      sourceByBook.get(
        corpusSource.book_id,
      )

    if (
      !source ||
      corpusSource.book_slug !==
        source.slug ||
      corpusSource.source_file !==
        source.source_file ||
      corpusSource.source_sha256 !==
        source.source_sha256 ||
      corpusSource.pdf_page_count !==
        source.pdf_page_count
    ) {
      errors.push(
        `Book ${corpusSource.book_id}: source identity differs`,
      )
    }
  }
}

if (
  audit.status !==
    'pending-source-review-backlog-audited-not-reviewed' ||
  audit.totals
    ?.container_intro_same_page_count !== 38 ||
  audit.totals
    ?.same_page_no_semantic_anchor_count !== 88 ||
  ![
    'remaining-manual-adjudication-recorded-not-applied',
    'same-page-review-integrated-not-applied',
  ].includes(progress.status) ||
  progress.totals?.reviewed_count < 16 ||
  progress.totals?.unresolved_count > 2 ||
  progress.totals?.pending_count > 126 ||
  progress.totals
    ?.public_decision_count < 18 ||
  progress.totals
    ?.manual_adjudication_reviewed_count !== 7 ||
  progress.totals
    ?.manual_adjudication_resolved_count !== 5 ||
  progress.totals
    ?.manual_adjudication_still_unresolved_count !== 2 ||
  progress.totals
    ?.manual_adjudication_completed_batch_count !== 4 ||
  progress.totals
    ?.manual_adjudication_pending_batch_count !== 0
) {
  errors.push(
    'PR-0038 audit or cumulative progress changed',
  )
}

const publicText =
  JSON.stringify(corpus)

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
  corpus.preparation_boundary || {},
)) {
  if (
    [
      'canonical_sources_read_locally',
      'private_evidence_generated',
      'public_corpus_generated',
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
    'Same-page review corpus validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated the complete 38-item same-page review corpus.',
)
console.log(
  `Evidence prepared: ${corpus.totals.evidence_prepared_count}.`,
)
console.log(
  `Evidence ambiguous: ${corpus.totals.evidence_ambiguous_count}.`,
)
console.log(
  `Evidence incomplete: ${corpus.totals.evidence_incomplete_count}.`,
)
console.log(
  'Validated public/private evidence separation.',
)
console.log(
  'No review decision, cumulative progress change, database change, or cutover was introduced.',
)
