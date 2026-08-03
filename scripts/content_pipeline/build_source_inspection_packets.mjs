import { createHash } from 'node:crypto'
import {
  readFile,
  writeFile,
} from 'node:fs/promises'

const paths = {
  policy:
    'content/migration/reading-segment-source-inspection-policy.json',
  design:
    'content/migration/reading-segment-design-manifest.json',
  sourceQueue:
    'content/migration/reading-segment-source-inspection-queue.json',
  structuralQueue:
    'content/migration/reading-segment-structural-review-queue.json',
  sizeQueue:
    'content/migration/reading-segment-size-review-queue.json',
  applicationEvidence:
    'content/migration/reading-segment-mechanical-application-evidence.json',
  manifest:
    'content/migration/reading-segment-source-inspection-manifest.json',
  packets:
    'content/migration/reading-segment-source-inspection-packets.json',
  pageIndex:
    'content/migration/reading-segment-source-inspection-page-index.json',
  report:
    'content/migration/reports/reading-segment-source-inspection-packets-summary.md',
}

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const sha256File = async (filePath) =>
  sha256(await readFile(filePath))

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

const pageValue = (startLocator) => {
  const sourcePdfPage =
    startLocator?.source_pdf_page ?? null
  const printedPage =
    startLocator?.printed_page ??
    (
      [
        'printed_page',
        'page',
        'pdf_page',
      ].includes(
        startLocator?.locator?.type,
      )
        ? startLocator.locator.value
        : null
    )

  return {
    source_pdf_page: sourcePdfPage,
    printed_page: printedPage,
  }
}

const laneForReasons = (reasons) => {
  const reasonSet = new Set(reasons)
  const container = reasonSet.has(
    'container-intro-boundary',
  )
  const samePage = reasonSet.has(
    'same-page-successor-boundary',
  )

  if (container && samePage) {
    return 'container-intro-same-page'
  }

  if (container) {
    return 'container-intro-only'
  }

  if (samePage) {
    return 'same-page-no-semantic-anchor'
  }

  return 'other-source-inspection'
}

const compactContext = (proposal) => {
  if (!proposal) {
    return null
  }

  return {
    book_id: proposal.book_id,
    book_slug: proposal.book_slug,
    segment_key: proposal.segment_key,
    source_key: proposal.source_key,
    source_node_id:
      proposal.source_node_id,
    node_type: proposal.node_type,
    proposal_kind:
      proposal.proposal_kind,
    segment_order:
      proposal.segment_order,
    display_title:
      proposal.display_title,
    start_locator:
      proposal.start_locator,
    end_locator:
      proposal.end_locator,
    legacy_word_count_estimate:
      proposal.legacy_word_count_estimate,
    estimated_size_band:
      proposal.estimated_size_band,
    review_reasons:
      proposal.review_reasons,
  }
}

const inspectionId = (
  runId,
  segmentKey,
  policyVersion,
) =>
  sha256(
    [
      runId,
      segmentKey,
      policyVersion,
    ].join('|'),
  ).slice(0, 24)

const [
  policy,
  design,
  sourceQueue,
  structuralQueue,
  sizeQueue,
  applicationEvidence,
] = await Promise.all([
  readJson(paths.policy),
  readJson(paths.design),
  readJson(paths.sourceQueue),
  readJson(paths.structuralQueue),
  readJson(paths.sizeQueue),
  readJson(paths.applicationEvidence),
])

if (
  policy.status !==
  'accepted-for-packet-generation'
) {
  throw new Error(
    'Source-inspection policy is not accepted.',
  )
}

const proposalByKey = new Map(
  design.proposals.map((proposal) => [
    proposal.segment_key,
    proposal,
  ]),
)

const orderedByBook = new Map()

for (const proposal of design.proposals) {
  if (!orderedByBook.has(proposal.book_id)) {
    orderedByBook.set(
      proposal.book_id,
      [],
    )
  }

  orderedByBook
    .get(proposal.book_id)
    .push(proposal)
}

const neighborIndex = new Map()

for (const proposals of orderedByBook.values()) {
  proposals.sort(
    (left, right) =>
      left.segment_order -
        right.segment_order ||
      left.segment_key.localeCompare(
        right.segment_key,
      ),
  )

  for (
    let index = 0;
    index < proposals.length;
    index += 1
  ) {
    neighborIndex.set(
      proposals[index].segment_key,
      {
        previous:
          proposals[index - 1] ?? null,
        current: proposals[index],
        successor:
          proposals[index + 1] ?? null,
      },
    )
  }
}

const lanePriority = Object.fromEntries(
  Object.entries(
    policy.inspection_lanes,
  ).map(([lane, definition]) => [
    lane,
    definition.priority,
  ]),
)

const items = sourceQueue.items.map(
  (queueItem) => {
    const current = proposalByKey.get(
      queueItem.segment_key,
    )
    const neighbors = neighborIndex.get(
      queueItem.segment_key,
    )

    if (!current || !neighbors) {
      throw new Error(
        `${queueItem.segment_key}: canonical design context is missing.`,
      )
    }

    if (
      current.book_id !==
        queueItem.book_id ||
      current.segment_order !==
        queueItem.segment_order ||
      current.source_node_id !==
        queueItem.source_node_id
    ) {
      throw new Error(
        `${queueItem.segment_key}: queue identity differs from canonical design.`,
      )
    }

    const lane = laneForReasons(
      queueItem.review_reasons || [],
    )
    const laneDefinition =
      policy.inspection_lanes[lane]
    const currentPage = pageValue(
      current.start_locator,
    )
    const successorPage = pageValue(
      neighbors.successor?.start_locator,
    )
    const previousPage = pageValue(
      neighbors.previous?.start_locator,
    )
    const samePdfPage =
      currentPage.source_pdf_page !== null &&
      currentPage.source_pdf_page ===
        successorPage.source_pdf_page
    const samePrintedPage =
      currentPage.printed_page !== null &&
      currentPage.printed_page ===
        successorPage.printed_page
    const hasPageEvidence =
      currentPage.source_pdf_page !== null ||
      currentPage.printed_page !== null ||
      successorPage.source_pdf_page !== null ||
      successorPage.printed_page !== null

    const sourceReference = {
      previous: previousPage,
      current: currentPage,
      successor: successorPage,
      same_source_pdf_page:
        samePdfPage,
      same_printed_page:
        samePrintedPage,
      page_evidence_available:
        hasPageEvidence,
      review_page_start:
        currentPage.source_pdf_page ??
        successorPage.source_pdf_page ??
        previousPage.source_pdf_page ??
        null,
      review_page_end:
        successorPage.source_pdf_page ??
        currentPage.source_pdf_page ??
        previousPage.source_pdf_page ??
        null,
    }

    return {
      inspection_id: inspectionId(
        design.run_id,
        queueItem.segment_key,
        policy.policy_version,
      ),
      inspection_status:
        'packet-prepared-not-reviewed',
      policy_version:
        policy.policy_version,
      run_id: design.run_id,
      design_version:
        design.design_version,
      book_id: queueItem.book_id,
      book_slug:
        queueItem.book_slug,
      segment_key:
        queueItem.segment_key,
      segment_order:
        queueItem.segment_order,
      source_key:
        queueItem.source_key,
      source_node_id:
        queueItem.source_node_id,
      node_type:
        queueItem.node_type,
      proposal_kind:
        queueItem.proposal_kind,
      display_title:
        queueItem.display_title,
      review_reasons:
        queueItem.review_reasons,
      resolution_rationale:
        queueItem.resolution_rationale,
      inspection_lane: lane,
      inspection_lane_priority:
        lanePriority[lane],
      decision_options:
        laneDefinition.decision_options,
      required_review_questions: [
        'Does the visible source contain independent introductory prose for the current canonical node?',
        'Where does the current segment end immediately before the verified successor begins?',
        'Does the source support retaining, merging, adjusting, or excluding the proposed segment?',
        'Can the decision be recorded without reproducing source text in the repository?',
      ],
      source_reference:
        sourceReference,
      context: {
        previous:
          compactContext(
            neighbors.previous,
          ),
        current:
          compactContext(current),
        successor:
          compactContext(
            neighbors.successor,
          ),
      },
      context_invariants: {
        current_matches_queue:
          true,
        previous_is_adjacent:
          neighbors.previous === null ||
          neighbors.previous.segment_order ===
            current.segment_order - 1,
        successor_is_adjacent:
          neighbors.successor === null ||
          neighbors.successor.segment_order ===
            current.segment_order + 1,
        design_successor_link_matches:
          neighbors.successor === null
            ? current.end_locator
                ?.next_segment_key == null
            : current.end_locator
                ?.next_segment_key ===
              neighbors.successor
                .segment_key,
        source_text_included: false,
      },
      review_decision: null,
      review_notes: null,
      source_text_reviewed: false,
      boundary_decision_recorded:
        false,
      boundary_approved: false,
      database_change_applied:
        false,
      content_approved: false,
      content_loaded: false,
      cutover_enabled: false,
    }
  },
)

items.sort(
  (left, right) =>
    left.inspection_lane_priority -
      right.inspection_lane_priority ||
    left.book_id - right.book_id ||
    (
      left.source_reference
        .review_page_start ??
      Number.MAX_SAFE_INTEGER
    ) -
      (
        right.source_reference
          .review_page_start ??
        Number.MAX_SAFE_INTEGER
      ) ||
    left.segment_order -
      right.segment_order ||
    left.segment_key.localeCompare(
      right.segment_key,
    ),
)

const inspectionIds = new Set(
  items.map(
    (item) => item.inspection_id,
  ),
)
const segmentKeys = new Set(
  items.map(
    (item) => item.segment_key,
  ),
)

if (
  items.length !== 144 ||
  inspectionIds.size !== 144 ||
  segmentKeys.size !== 144
) {
  throw new Error(
    'Source inspection must contain 144 unique items.',
  )
}

for (const item of items) {
  if (
    !Object.values(
      item.context_invariants,
    ).every(
      (value) =>
        value === true ||
        value === false,
    )
  ) {
    throw new Error(
      `${item.segment_key}: invalid context invariant value.`,
    )
  }

  if (
    item.context_invariants
      .current_matches_queue !== true ||
    item.context_invariants
      .previous_is_adjacent !== true ||
    item.context_invariants
      .successor_is_adjacent !== true ||
    item.context_invariants
      .design_successor_link_matches !==
      true ||
    item.context_invariants
      .source_text_included !== false
  ) {
    throw new Error(
      `${item.segment_key}: context invariants failed.`,
    )
  }
}

const maximumPacketSize =
  policy.packet_rules
    .maximum_items_per_packet
const groups = new Map()

for (const item of items) {
  const groupKey = [
    item.inspection_lane,
    item.book_id,
  ].join('|')

  if (!groups.has(groupKey)) {
    groups.set(groupKey, [])
  }

  groups.get(groupKey).push(item)
}

const packets = []

for (const [
  groupKey,
  groupItems,
] of groups) {
  const [
    inspectionLane,
    bookIdText,
  ] = groupKey.split('|')
  const bookId = Number(bookIdText)

  for (
    let offset = 0;
    offset < groupItems.length;
    offset += maximumPacketSize
  ) {
    const members = groupItems.slice(
      offset,
      offset + maximumPacketSize,
    )
    const packetNumber =
      Math.floor(
        offset / maximumPacketSize,
      ) + 1

    packets.push({
      packet_id:
        `${inspectionLane}-book-${bookId}-` +
        `packet-${String(packetNumber).padStart(2, '0')}`,
      inspection_lane:
        inspectionLane,
      inspection_lane_priority:
        lanePriority[inspectionLane],
      book_id: bookId,
      packet_number:
        packetNumber,
      item_count:
        members.length,
      source_pdf_page_start:
        members
          .map(
            (item) =>
              item.source_reference
                .review_page_start,
          )
          .filter(
            (value) =>
              value !== null,
          )
          .reduce(
            (minimum, value) =>
              Math.min(minimum, value),
            Number.POSITIVE_INFINITY,
          ) === Number.POSITIVE_INFINITY
          ? null
          : members
              .map(
                (item) =>
                  item.source_reference
                    .review_page_start,
              )
              .filter(
                (value) =>
                  value !== null,
              )
              .reduce(
                (minimum, value) =>
                  Math.min(
                    minimum,
                    value,
                  ),
                Number.POSITIVE_INFINITY,
              ),
      source_pdf_page_end:
        members
          .map(
            (item) =>
              item.source_reference
                .review_page_end,
          )
          .filter(
            (value) =>
              value !== null,
          )
          .reduce(
            (maximum, value) =>
              Math.max(maximum, value),
            Number.NEGATIVE_INFINITY,
          ) === Number.NEGATIVE_INFINITY
          ? null
          : members
              .map(
                (item) =>
                  item.source_reference
                    .review_page_end,
              )
              .filter(
                (value) =>
                  value !== null,
              )
              .reduce(
                (maximum, value) =>
                  Math.max(
                    maximum,
                    value,
                  ),
                Number.NEGATIVE_INFINITY,
              ),
      inspection_ids:
        members.map(
          (item) =>
            item.inspection_id,
        ),
      segment_keys:
        members.map(
          (item) =>
            item.segment_key,
        ),
      items: members,
    })
  }
}

packets.sort(
  (left, right) =>
    left.inspection_lane_priority -
      right.inspection_lane_priority ||
    left.book_id - right.book_id ||
    left.packet_number -
      right.packet_number,
)

const packetInspectionIds =
  packets.flatMap(
    (packet) =>
      packet.inspection_ids,
  )

if (
  stableJson(
    [...packetInspectionIds].sort(),
  ) !==
  stableJson(
    [...inspectionIds].sort(),
  )
) {
  throw new Error(
    'Packets do not cover every inspection item exactly once.',
  )
}

const pageGroups = new Map()

for (const item of items) {
  const pageKey = [
    item.book_id,
    item.source_reference
      .review_page_start ?? 'unknown',
  ].join('|')

  if (!pageGroups.has(pageKey)) {
    pageGroups.set(pageKey, [])
  }

  pageGroups.get(pageKey).push(item)
}

const pageIndex = [
  ...pageGroups.entries(),
]
  .map(([key, pageItems]) => {
    const [bookIdText, pageText] =
      key.split('|')

    return {
      book_id: Number(bookIdText),
      source_pdf_page:
        pageText === 'unknown'
          ? null
          : Number(pageText),
      item_count:
        pageItems.length,
      inspection_lanes: [
        ...new Set(
          pageItems.map(
            (item) =>
              item.inspection_lane,
          ),
        ),
      ].sort(),
      segment_keys:
        pageItems.map(
          (item) =>
            item.segment_key,
        ),
      inspection_ids:
        pageItems.map(
          (item) =>
            item.inspection_id,
        ),
    }
  })
  .sort(
    (left, right) =>
      left.book_id - right.book_id ||
      (
        left.source_pdf_page ??
        Number.MAX_SAFE_INTEGER
      ) -
        (
          right.source_pdf_page ??
          Number.MAX_SAFE_INTEGER
        ),
  )

const booksById = new Map(
  design.books.map((book) => [
    book.book_id,
    book,
  ]),
)

const laneCounts = Object.fromEntries(
  Object.keys(
    policy.inspection_lanes,
  ).map((lane) => [
    lane,
    items.filter(
      (item) =>
        item.inspection_lane === lane,
    ).length,
  ]),
)

const books = [
  ...new Set(
    items.map(
      (item) => item.book_id,
    ),
  ),
]
  .sort(
    (left, right) =>
      left - right,
  )
  .map((bookId) => {
    const book =
      booksById.get(bookId)
    const bookItems = items.filter(
      (item) =>
        item.book_id === bookId,
    )

    return {
      book_id: bookId,
      slug: book?.slug ?? null,
      title: book?.title ?? null,
      inspection_count:
        bookItems.length,
      packet_count:
        packets.filter(
          (packet) =>
            packet.book_id ===
            bookId,
        ).length,
      page_index_count:
        pageIndex.filter(
          (page) =>
            page.book_id ===
            bookId,
        ).length,
      lane_counts:
        Object.fromEntries(
          Object.keys(
            policy.inspection_lanes,
          ).map((lane) => [
            lane,
            bookItems.filter(
              (item) =>
                item.inspection_lane ===
                lane,
            ).length,
          ]),
        ),
    }
  })

const manifest = {
  schema_version: 1,
  status:
    'source-inspection-packets-prepared',
  policy_version:
    policy.policy_version,
  run_id: design.run_id,
  design_version:
    design.design_version,
  rights_status:
    design.rights_status,
  contains_full_text: false,
  inputs: {
    policy_sha256:
      await sha256File(paths.policy),
    design_manifest_sha256:
      await sha256File(paths.design),
    source_queue_sha256:
      await sha256File(
        paths.sourceQueue,
      ),
    structural_queue_sha256:
      await sha256File(
        paths.structuralQueue,
      ),
    size_queue_sha256:
      await sha256File(
        paths.sizeQueue,
      ),
    mechanical_application_evidence_sha256:
      await sha256File(
        paths.applicationEvidence,
      ),
  },
  totals: {
    source_inspection_count:
      items.length,
    packet_count:
      packets.length,
    page_index_count:
      pageIndex.length,
    completed_mechanical_count:
      applicationEvidence.totals
        .target_content_review_count,
    remaining_boundary_review_count:
      applicationEvidence.totals
        .unaffected_boundary_review_count,
    structural_review_count:
      structuralQueue.item_count,
    size_review_count:
      sizeQueue.item_count,
    source_text_reviewed_count: 0,
    boundary_decision_count: 0,
    database_change_count: 0,
  },
  lane_counts:
    laneCounts,
  books,
  items,
  review_boundary:
    policy.review_boundary,
}

const packetsDocument = {
  schema_version: 1,
  status:
    'source-inspection-review-packets',
  policy_version:
    policy.policy_version,
  run_id: design.run_id,
  maximum_items_per_packet:
    maximumPacketSize,
  item_count:
    items.length,
  packet_count:
    packets.length,
  packets,
  review_boundary: {
    source_text_reviewed: false,
    boundary_decision_recorded:
      false,
    boundary_approved: false,
    database_change_applied:
      false,
    content_loaded: false,
    cutover_enabled: false,
  },
}

const pageIndexDocument = {
  schema_version: 1,
  status:
    'source-inspection-page-index',
  policy_version:
    policy.policy_version,
  run_id: design.run_id,
  item_count:
    items.length,
  page_entry_count:
    pageIndex.length,
  pages:
    pageIndex,
  contains_full_text: false,
}

const reportLines = [
  '# Source Inspection Review Packets',
  '',
  `- Status: \`${manifest.status}\``,
  `- Policy version: \`${manifest.policy_version}\``,
  `- Migration run ID: \`${manifest.run_id}\``,
  `- Source-inspection cases: \`${manifest.totals.source_inspection_count}\``,
  `- Review packets: \`${manifest.totals.packet_count}\``,
  `- Page-index entries: \`${manifest.totals.page_index_count}\``,
  `- Completed mechanical cases preserved: \`${manifest.totals.completed_mechanical_count}\``,
  `- Remaining boundary-review rows preserved: \`${manifest.totals.remaining_boundary_review_count}\``,
  `- Structural-review cases preserved: \`${manifest.totals.structural_review_count}\``,
  `- Size-review cases preserved: \`${manifest.totals.size_review_count}\``,
  '- Source text reviewed: `0`',
  '- Boundary decisions recorded: `0`',
  '- Database changes: `0`',
  '- Cutover enabled: `false`',
  '',
  '## Inspection lanes',
  '',
  '| Inspection lane | Items |',
  '| --- | ---: |',
  ...Object.entries(
    laneCounts,
  ).map(
    ([lane, count]) =>
      `| ${lane} | ${count} |`,
  ),
  '',
  '## Review workload by work',
  '',
  '| Work | Cases | Packets | Page entries |',
  '| --- | ---: | ---: | ---: |',
  ...books.map(
    (book) =>
      `| ${book.title} | ${book.inspection_count} | ${book.packet_count} | ${book.page_index_count} |`,
  ),
  '',
  '## Packet contents',
  '',
  'Each packet contains the canonical previous/current/successor metadata, page references, review reasons, allowed decision options, and explicit non-approval flags.',
  '',
  'No source text or source excerpt is included.',
  '',
  '## Decision',
  '',
  'PR-0026 prepares the editorial inspection workload but does not perform source review or approve any boundary.',
  '',
  'The 166 mechanically completed rows remain in `content-review`. The source-inspection, structural-review, and size-review queues remain unapplied.',
  '',
]

await Promise.all([
  writeFile(
    paths.manifest,
    `${JSON.stringify(
      manifest,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.packets,
    `${JSON.stringify(
      packetsDocument,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.pageIndex,
    `${JSON.stringify(
      pageIndexDocument,
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
  `Source-inspection cases: ${items.length}`,
)
console.log(
  `Review packets: ${packets.length}`,
)
console.log(
  `Page-index entries: ${pageIndex.length}`,
)
console.log(
  `Inspection lanes: ${JSON.stringify(laneCounts)}`,
)
console.log(
  'No source text was read or committed.',
)
console.log(
  'No boundary or database change was applied.',
)
