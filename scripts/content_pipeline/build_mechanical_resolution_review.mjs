import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const paths = {
  policy:
    'content/migration/reading-segment-mechanical-review-policy.json',
  design:
    'content/migration/reading-segment-design-manifest.json',
  candidates:
    'content/migration/reading-segment-mechanical-candidates.json',
  proposals:
    'content/migration/reading-segment-mechanical-resolution-proposals.json',
  application:
    'content/migration/reading-segment-application-evidence.json',
  decisions:
    'content/migration/reading-segment-mechanical-review-decisions.json',
  accepted:
    'content/migration/reading-segment-mechanical-review-accepted.json',
  exceptions:
    'content/migration/reading-segment-mechanical-review-exceptions.json',
  batches:
    'content/migration/reading-segment-mechanical-review-batches.json',
  report:
    'content/migration/reports/reading-segment-mechanical-review-summary.md',
}

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const stableJson = (value) =>
  JSON.stringify(sortDeep(value))

const sortDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortDeep)
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) =>
          left.localeCompare(right),
        )
        .map(([key, child]) => [
          key,
          sortDeep(child),
        ]),
    )
  }

  return value
}

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const sha256File = async (filePath) =>
  sha256(await readFile(filePath))

const decisionId = (
  resolutionId,
  policyVersion,
) =>
  sha256(
    `${resolutionId}|${policyVersion}`,
  ).slice(0, 24)

const pageFields = [
  'source_pdf_page',
  'printed_page',
]

const semanticLocator = (startLocator) => {
  const locator = startLocator?.locator

  if (
    !locator ||
    typeof locator !== 'object'
  ) {
    return {
      available: false,
      type: null,
      value: null,
      normalized: null,
    }
  }

  const type = String(
    locator.type ?? '',
  ).trim()
  const rawValue = locator.value
  const value =
    typeof rawValue === 'string'
      ? rawValue.trim()
      : rawValue
  const pageOnlyTypes = new Set([
    'page',
    'pdf_page',
    'printed_page',
  ])
  const available =
    type.length > 0 &&
    !pageOnlyTypes.has(type) &&
    value !== null &&
    value !== undefined &&
    String(value).trim().length > 0

  return {
    available,
    type: type || null,
    value:
      value === undefined ? null : value,
    normalized: available
      ? stableJson({ type, value })
      : null,
  }
}

const sharedPageEvidence = (
  currentStart,
  successorStart,
) => {
  const matches = pageFields
    .filter((field) => {
      const current = currentStart?.[field]
      const successor =
        successorStart?.[field]

      return (
        current !== null &&
        current !== undefined &&
        current === successor
      )
    })
    .map((field) => ({
      field,
      value: currentStart[field],
    }))

  return {
    available: matches.length > 0,
    matches,
  }
}

const makeBatches = (
  decisions,
  maximumSize,
) => {
  const groups = new Map()

  for (const decision of decisions) {
    const key = [
      decision.decision,
      decision.book_id,
    ].join('|')

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key).push(decision)
  }

  const decisionOrder = new Map([
    ['accepted-for-future-application', 0],
    ['unresolved', 1],
    ['rejected', 2],
  ])

  const sortedGroups = [...groups.entries()]
    .map(([key, items]) => ({
      key,
      items,
      decision: items[0].decision,
      bookId: items[0].book_id,
    }))
    .sort(
      (left, right) =>
        decisionOrder.get(left.decision) -
          decisionOrder.get(right.decision) ||
        left.bookId - right.bookId,
    )

  const batches = []

  for (const group of sortedGroups) {
    const items = [...group.items].sort(
      (left, right) =>
        left.segment_order -
          right.segment_order ||
        left.resolution_id.localeCompare(
          right.resolution_id,
        ),
    )

    for (
      let offset = 0;
      offset < items.length;
      offset += maximumSize
    ) {
      const members = items.slice(
        offset,
        offset + maximumSize,
      )
      const batchNumber =
        Math.floor(offset / maximumSize) + 1
      const prefix = {
        'accepted-for-future-application':
          'accepted',
        unresolved: 'unresolved',
        rejected: 'rejected',
      }[group.decision]

      batches.push({
        batch_id:
          `${prefix}-book-${group.bookId}-` +
          `batch-${String(batchNumber).padStart(2, '0')}`,
        decision: group.decision,
        book_id: group.bookId,
        batch_number: batchNumber,
        item_count: members.length,
        decision_ids: members.map(
          (item) => item.decision_id,
        ),
        resolution_ids: members.map(
          (item) => item.resolution_id,
        ),
        segment_keys: members.map(
          (item) => item.segment_key,
        ),
        items: members,
      })
    }
  }

  return batches
}

const [
  policy,
  design,
  candidates,
  proposals,
  application,
] = await Promise.all([
  readJson(paths.policy),
  readJson(paths.design),
  readJson(paths.candidates),
  readJson(paths.proposals),
  readJson(paths.application),
])

if (
  policy.status !==
  'accepted-for-independent-review'
) {
  throw new Error(
    'Mechanical review policy is not accepted.',
  )
}

const designByKey = new Map(
  design.proposals.map((proposal) => [
    proposal.segment_key,
    proposal,
  ]),
)
const candidateByResolutionId = new Map(
  candidates.items.map((candidate) => [
    candidate.resolution_id,
    candidate,
  ]),
)
const candidateBySegmentKey = new Map(
  candidates.items.map((candidate) => [
    candidate.segment_key,
    candidate,
  ]),
)

const decisions = []

for (const proposal of proposals.proposals) {
  const current = designByKey.get(
    proposal.segment_key,
  )
  const successor = designByKey.get(
    proposal.successor_segment_key,
  )
  const candidate =
    candidateByResolutionId.get(
      proposal.resolution_id,
    ) ??
    candidateBySegmentKey.get(
      proposal.segment_key,
    )

  const currentSemantic =
    semanticLocator(
      current?.start_locator,
    )
  const successorSemantic =
    semanticLocator(
      successor?.start_locator,
    )
  const rederivedPageEvidence =
    sharedPageEvidence(
      current?.start_locator,
      successor?.start_locator,
    )

  const proposalFlagsRemainFalse = [
    proposal.boundary_approved,
    proposal.content_approved,
    proposal.database_change_applied,
    proposal.successor_mapping_created,
    proposal.cutover_enabled,
  ].every((value) => value === false)

  const checks = {
    proposal_status:
      proposal.proposal_status ===
      'proposed-not-approved',
    resolution_method:
      proposal.resolution_method ===
      'canonical-successor-start-anchor',
    candidate_present:
      candidate !== undefined,
    candidate_path:
      candidate?.resolution_path ===
      'mechanical-anchor-candidate',
    candidate_rationale:
      candidate?.resolution_rationale ===
      'distinct-non-page-canonical-anchors',
    required_review_reason:
      candidate?.review_reasons?.includes(
        'same-page-successor-boundary',
      ) === true,
    current_design_present:
      current !== undefined,
    successor_design_present:
      successor !== undefined,
    same_migration_run:
      proposal.run_id === design.run_id &&
      proposal.run_id === candidates.run_id &&
      proposal.run_id ===
        application.run_id,
    same_book:
      current !== undefined &&
      successor !== undefined &&
      current.book_id === successor.book_id,
    adjacent_segment_order:
      current !== undefined &&
      successor !== undefined &&
      successor.segment_order ===
        current.segment_order + 1,
    design_successor_link:
      current?.end_locator
        ?.next_segment_key ===
        successor?.segment_key &&
      current?.end_locator
        ?.next_source_key ===
        successor?.source_key,
    proposal_current_start_matches_design:
      current !== undefined &&
      stableJson(
        proposal.current_start_locator,
      ) ===
        stableJson(current.start_locator),
    proposal_end_matches_successor_start:
      successor !== undefined &&
      stableJson(
        proposal
          .proposed_exclusive_end_locator,
      ) ===
        stableJson(successor.start_locator),
    design_next_start_matches_successor_start:
      current !== undefined &&
      successor !== undefined &&
      stableJson(
        current.end_locator
          ?.next_start_locator,
      ) ===
        stableJson(successor.start_locator),
    shared_page_rederived:
      rederivedPageEvidence.available,
    current_locator_is_semantic:
      currentSemantic.available,
    successor_locator_is_semantic:
      successorSemantic.available,
    semantic_locators_differ:
      currentSemantic.available &&
      successorSemantic.available &&
      currentSemantic.normalized !==
        successorSemantic.normalized,
    proposal_application_flags_remain_false:
      proposalFlagsRemainFalse,
  }

  const identityConflict = [
    'proposal_status',
    'resolution_method',
    'same_migration_run',
    'same_book',
    'adjacent_segment_order',
    'design_successor_link',
    'proposal_current_start_matches_design',
    'proposal_end_matches_successor_start',
    'design_next_start_matches_successor_start',
    'proposal_application_flags_remain_false',
  ].some((key) => checks[key] !== true)

  const missingEvidence = [
    'candidate_present',
    'candidate_path',
    'candidate_rationale',
    'required_review_reason',
    'current_design_present',
    'successor_design_present',
    'shared_page_rederived',
    'current_locator_is_semantic',
    'successor_locator_is_semantic',
    'semantic_locators_differ',
  ].some((key) => checks[key] !== true)

  let decision =
    'accepted-for-future-application'
  let decisionReason =
    'independent-canonical-evidence-review-passed'

  if (identityConflict) {
    decision = 'rejected'
    decisionReason =
      'identity-link-or-application-state-conflict'
  } else if (missingEvidence) {
    decision = 'unresolved'
    decisionReason =
      'insufficient-independent-evidence'
  }

  decisions.push({
    decision_id: decisionId(
      proposal.resolution_id,
      policy.policy_version,
    ),
    resolution_id:
      proposal.resolution_id,
    decision,
    decision_reason: decisionReason,
    decision_status:
      'recorded-not-applied',
    policy_version:
      policy.policy_version,
    run_id: design.run_id,
    design_version:
      design.design_version,
    book_id: proposal.book_id,
    book_slug: proposal.book_slug,
    segment_key:
      proposal.segment_key,
    segment_order:
      proposal.segment_order,
    display_title:
      proposal.display_title,
    successor_segment_key:
      proposal.successor_segment_key,
    successor_segment_order:
      proposal.successor_segment_order,
    successor_display_title:
      proposal.successor_display_title,
    independently_rederived: {
      current_start_locator:
        current?.start_locator ?? null,
      successor_start_locator:
        successor?.start_locator ?? null,
      current_semantic_locator:
        currentSemantic,
      successor_semantic_locator:
        successorSemantic,
      shared_page_evidence:
        rederivedPageEvidence,
    },
    checks,
    database_application_authorized:
      false,
    database_change_applied: false,
    content_approved: false,
    content_loaded: false,
    successor_mapping_created: false,
    cutover_enabled: false,
  })
}

decisions.sort(
  (left, right) =>
    left.book_id - right.book_id ||
    left.segment_order -
      right.segment_order ||
    left.resolution_id.localeCompare(
      right.resolution_id,
    ),
)

const resolutionIds = new Set(
  decisions.map(
    (decision) => decision.resolution_id,
  ),
)
const decisionIds = new Set(
  decisions.map(
    (decision) => decision.decision_id,
  ),
)

if (
  decisions.length !== 166 ||
  resolutionIds.size !== 166 ||
  decisionIds.size !== 166
) {
  throw new Error(
    'The review must produce 166 unique decisions.',
  )
}

const accepted = decisions.filter(
  (decision) =>
    decision.decision ===
    'accepted-for-future-application',
)
const exceptions = decisions.filter(
  (decision) =>
    decision.decision !==
    'accepted-for-future-application',
)

const counts = Object.fromEntries(
  [
    'accepted-for-future-application',
    'unresolved',
    'rejected',
  ].map((value) => [
    value,
    decisions.filter(
      (decision) =>
        decision.decision === value,
    ).length,
  ]),
)

const batches = makeBatches(
  decisions,
  policy.batching.maximum_items_per_batch,
)

const batchedDecisionIds = batches.flatMap(
  (batch) => batch.decision_ids,
)

if (
  stableJson(
    [...batchedDecisionIds].sort(),
  ) !==
  stableJson(
    [...decisionIds].sort(),
  )
) {
  throw new Error(
    'Decision batches do not cover every review decision exactly once.',
  )
}

const bookMap = new Map(
  design.books.map((book) => [
    book.book_id,
    book,
  ]),
)

const books = [
  ...new Set(
    decisions.map(
      (decision) => decision.book_id,
    ),
  ),
]
  .sort((left, right) => left - right)
  .map((bookId) => {
    const book = bookMap.get(bookId)
    const bookDecisions = decisions.filter(
      (decision) =>
        decision.book_id === bookId,
    )

    return {
      book_id: bookId,
      slug: book?.slug ?? null,
      title: book?.title ?? null,
      reviewed_count:
        bookDecisions.length,
      accepted_count:
        bookDecisions.filter(
          (decision) =>
            decision.decision ===
            'accepted-for-future-application',
        ).length,
      unresolved_count:
        bookDecisions.filter(
          (decision) =>
            decision.decision ===
            'unresolved',
        ).length,
      rejected_count:
        bookDecisions.filter(
          (decision) =>
            decision.decision ===
            'rejected',
        ).length,
    }
  })

const manifest = {
  schema_version: 1,
  status: 'reviewed-not-applied',
  policy_version:
    policy.policy_version,
  run_id: design.run_id,
  design_version:
    design.design_version,
  inputs: {
    review_policy_sha256:
      await sha256File(paths.policy),
    design_manifest_sha256:
      await sha256File(paths.design),
    mechanical_candidates_sha256:
      await sha256File(paths.candidates),
    resolution_proposals_sha256:
      await sha256File(paths.proposals),
    application_evidence_sha256:
      await sha256File(paths.application),
  },
  totals: {
    staged_segment_count:
      application.summary
        .reading_segment_count,
    proposal_count:
      proposals.totals.proposal_count,
    reviewed_count: decisions.length,
    accepted_count: accepted.length,
    unresolved_count:
      counts.unresolved,
    rejected_count:
      counts.rejected,
    batch_count: batches.length,
    database_application_authorized_count:
      0,
    database_change_count: 0,
    content_approval_count: 0,
  },
  decision_counts: counts,
  books,
  decisions,
  application_boundary:
    policy.application_boundary,
}

const acceptedDocument = {
  schema_version: 1,
  status:
    'accepted-for-future-application-not-applied',
  policy_version:
    policy.policy_version,
  run_id: design.run_id,
  item_count: accepted.length,
  items: accepted,
  application_boundary: {
    database_application_authorized:
      false,
    database_change_applied: false,
    content_approved: false,
    content_loaded: false,
    successor_mapping_created: false,
    cutover_enabled: false,
  },
}

const exceptionDocument = {
  schema_version: 1,
  status: 'review-exceptions',
  policy_version:
    policy.policy_version,
  run_id: design.run_id,
  item_count: exceptions.length,
  unresolved_count:
    counts.unresolved,
  rejected_count:
    counts.rejected,
  items: exceptions,
}

const batchesDocument = {
  schema_version: 1,
  status:
    'mechanical-review-decision-batches',
  policy_version:
    policy.policy_version,
  run_id: design.run_id,
  maximum_batch_size:
    policy.batching.maximum_items_per_batch,
  decision_count: decisions.length,
  batch_count: batches.length,
  batches,
  application_boundary: {
    database_application_authorized:
      false,
    database_change_applied: false,
    content_approved: false,
    cutover_enabled: false,
  },
}

const reportLines = [
  '# Mechanical Resolution Independent Review',
  '',
  `- Status: \`${manifest.status}\``,
  `- Policy version: \`${manifest.policy_version}\``,
  `- Migration run ID: \`${manifest.run_id}\``,
  `- Proposals reviewed: \`${manifest.totals.reviewed_count}\``,
  `- Accepted for future application: \`${manifest.totals.accepted_count}\``,
  `- Unresolved: \`${manifest.totals.unresolved_count}\``,
  `- Rejected: \`${manifest.totals.rejected_count}\``,
  `- Decision batches: \`${manifest.totals.batch_count}\``,
  '- Database application authorized: `0`',
  '- Database changes: `0`',
  '- Content approvals: `0`',
  '- Cutover enabled: `false`',
  '',
  '## Decisions by work',
  '',
  '| Work | Reviewed | Accepted | Unresolved | Rejected |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...books.map(
    (book) =>
      `| ${book.title} | ${book.reviewed_count} | ${book.accepted_count} | ${book.unresolved_count} | ${book.rejected_count} |`,
  ),
  '',
  '## Independent review method',
  '',
  'Each proposal was re-derived from the canonical design manifest and matched against its candidate record.',
  '',
  'The review independently verified identity, migration run, same-work adjacency, successor linkage, canonical locator equality, shared-page evidence, semantic locator availability, and distinct current/successor locator values.',
  '',
  '## Decision',
  '',
  'Accepted records are eligible for a later controlled database-application proposal. They are not yet authorized or applied to staging.',
  '',
  'No content, mapping, dependency snapshot, production record, progress row, reading session, or cutover state was changed.',
  '',
]

await Promise.all([
  writeFile(
    paths.decisions,
    `${JSON.stringify(
      manifest,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.accepted,
    `${JSON.stringify(
      acceptedDocument,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.exceptions,
    `${JSON.stringify(
      exceptionDocument,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.batches,
    `${JSON.stringify(
      batchesDocument,
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
  `Reviewed proposals: ${decisions.length}`,
)
console.log(
  `Accepted for future application: ${accepted.length}`,
)
console.log(
  `Unresolved: ${counts.unresolved}`,
)
console.log(
  `Rejected: ${counts.rejected}`,
)
console.log(
  `Decision batches: ${batches.length}`,
)
console.log(
  'No database operation was executed.',
)
