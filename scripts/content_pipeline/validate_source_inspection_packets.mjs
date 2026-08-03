import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const [
  policy,
  design,
  sourceQueue,
  structuralQueue,
  sizeQueue,
  applicationEvidence,
  manifest,
  packets,
  pageIndex,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-source-inspection-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-design-manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-structural-review-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-size-review-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-packets.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-page-index.json',
  ),
])

const errors = []

if (
  manifest.status !==
  'source-inspection-packets-prepared'
) {
  errors.push(
    'manifest status is invalid',
  )
}

if (
  manifest.policy_version !==
  policy.policy_version ||
  manifest.run_id !==
  design.run_id ||
  manifest.run_id !==
  sourceQueue.run_id ||
  manifest.run_id !==
  applicationEvidence.run_id
) {
  errors.push(
    'policy, design, queue, application, or run identity differs',
  )
}

if (
  manifest.rights_status !== 'blocked' ||
  manifest.contains_full_text !== false
) {
  errors.push(
    'rights and content boundaries are invalid',
  )
}

if (
  manifest.totals
    ?.source_inspection_count !== 144 ||
  manifest.items?.length !== 144 ||
  packets.item_count !== 144 ||
  pageIndex.item_count !== 144
) {
  errors.push(
    'source-inspection totals must equal 144',
  )
}

if (
  manifest.totals
    ?.completed_mechanical_count !== 166 ||
  manifest.totals
    ?.remaining_boundary_review_count !== 646 ||
  manifest.totals
    ?.structural_review_count !== 85 ||
  manifest.totals
    ?.size_review_count !== 10
) {
  errors.push(
    'preserved workload totals differ',
  )
}

const itemIds = new Set()
const segmentKeys = new Set()

for (const item of manifest.items || []) {
  if (
    itemIds.has(item.inspection_id)
  ) {
    errors.push(
      `duplicate inspection ID: ${item.inspection_id}`,
    )
  }

  if (
    segmentKeys.has(item.segment_key)
  ) {
    errors.push(
      `duplicate segment key: ${item.segment_key}`,
    )
  }

  itemIds.add(item.inspection_id)
  segmentKeys.add(item.segment_key)

  if (
    item.inspection_status !==
      'packet-prepared-not-reviewed' ||
    item.review_decision !== null ||
    item.source_text_reviewed !==
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
      `${item.segment_key}: review/application boundary differs`,
    )
  }

  for (const [
    invariant,
    passed,
  ] of Object.entries(
    item.context_invariants || {},
  )) {
    if (
      invariant ===
      'source_text_included'
    ) {
      if (passed !== false) {
        errors.push(
          `${item.segment_key}: source text must remain excluded`,
        )
      }
    } else if (passed !== true) {
      errors.push(
        `${item.segment_key}: context invariant failed: ${invariant}`,
      )
    }
  }

  if (
    !item.context?.current ||
    item.context.current.segment_key !==
      item.segment_key
  ) {
    errors.push(
      `${item.segment_key}: current context differs`,
    )
  }

  if (
    item.context?.successor &&
    item.context.successor
      .segment_order !==
      item.segment_order + 1
  ) {
    errors.push(
      `${item.segment_key}: successor is not adjacent`,
    )
  }

  if (
    item.context?.previous &&
    item.context.previous
      .segment_order !==
      item.segment_order - 1
  ) {
    errors.push(
      `${item.segment_key}: previous segment is not adjacent`,
    )
  }
}

if (
  itemIds.size !== 144 ||
  segmentKeys.size !== 144
) {
  errors.push(
    'inspection identifiers must be unique',
  )
}

const packetIds = new Set()
const packetInspectionIds = []

for (const packet of packets.packets || []) {
  if (
    packetIds.has(packet.packet_id)
  ) {
    errors.push(
      `duplicate packet ID: ${packet.packet_id}`,
    )
  }

  packetIds.add(packet.packet_id)

  if (
    packet.item_count <= 0 ||
    packet.item_count > 20 ||
    packet.item_count !==
      packet.items?.length ||
    packet.item_count !==
      packet.inspection_ids?.length ||
    packet.item_count !==
      packet.segment_keys?.length
  ) {
    errors.push(
      `${packet.packet_id}: invalid packet totals`,
    )
  }

  packetInspectionIds.push(
    ...packet.inspection_ids,
  )
}

const sorted = (values) =>
  [...values].sort()

if (
  JSON.stringify(
    sorted(packetInspectionIds),
  ) !==
  JSON.stringify(
    sorted(itemIds),
  )
) {
  errors.push(
    'packets do not cover all inspection items exactly once',
  )
}

const pageInspectionIds =
  pageIndex.pages.flatMap(
    (page) =>
      page.inspection_ids,
  )

if (
  JSON.stringify(
    sorted(pageInspectionIds),
  ) !==
  JSON.stringify(
    sorted(itemIds),
  )
) {
  errors.push(
    'page index does not cover all inspection items exactly once',
  )
}

for (const [
  field,
  value,
] of Object.entries(
  manifest.review_boundary || {},
)) {
  if (
    field === 'packets_generated'
  ) {
    if (value !== true) {
      errors.push(
        'packets_generated must be true',
      )
    }
  } else if (value !== false) {
    errors.push(
      `${field} must remain false`,
    )
  }
}

if (
  sourceQueue.item_count !== 144 ||
  structuralQueue.item_count !== 85 ||
  sizeQueue.item_count !== 10 ||
  applicationEvidence.totals
    ?.target_content_review_count !== 166 ||
  applicationEvidence.totals
    ?.unaffected_boundary_review_count !== 646 ||
  applicationEvidence.totals
    ?.content_row_count !== 0 ||
  applicationEvidence.totals
    ?.successor_mapping_count !== 0 ||
  applicationEvidence.totals
    ?.dependency_snapshot_count !== 0 ||
  applicationEvidence.totals
    ?.production_section_count !== 908 ||
  applicationEvidence.application_boundary
    ?.cutover_enabled !== false
) {
  errors.push(
    'upstream queues or PR-0025 evidence changed unexpectedly',
  )
}

const sourceQueueBytes = await readFile(
  'content/migration/reading-segment-source-inspection-queue.json',
)

if (
  sha256(sourceQueueBytes) !==
  manifest.inputs
    ?.source_queue_sha256
) {
  errors.push(
    'source queue checksum differs from manifest input',
  )
}

if (errors.length) {
  console.error(
    'Source-inspection packet validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 144 source-inspection items.',
)
console.log(
  `Validated ${packets.packet_count} review packets capped at 20 items.`,
)
console.log(
  `Validated ${pageIndex.page_entry_count} page-index entries.`,
)
console.log(
  'Preserved 166 content-review rows and 646 boundary-review rows.',
)
console.log(
  'No source text, boundary decision, database mutation, or cutover was introduced.',
)
