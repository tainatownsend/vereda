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
  application,
  triage,
  activeQueue,
  deferred,
  batches,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-review-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-design-manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-review-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-review-triage.json',
  ),
  readJson(
    'content/migration/reading-segment-active-review-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-deferred-metadata.json',
  ),
  readJson(
    'content/migration/reading-segment-review-batches.json',
  ),
])

const errors = []

if (triage.status !== 'triaged-not-applied') {
  errors.push(
    'triage status must be triaged-not-applied',
  )
}

if (
  triage.policy_version !==
  policy.policy_version
) {
  errors.push(
    'policy version differs from triage manifest',
  )
}

if (
  triage.run_id !== design.run_id ||
  triage.run_id !== application.run_id
) {
  errors.push('migration run IDs differ')
}

if (
  triage.totals?.staged_segment_count !== 812
) {
  errors.push(
    'staged segment count must remain 812',
  )
}

if (
  triage.totals?.original_review_count !== 455
) {
  errors.push(
    'original review count must remain 455',
  )
}

if (
  sourceQueue.proposal_count !== 455 ||
  sourceQueue.proposals?.length !== 455
) {
  errors.push(
    'source review queue no longer contains 455 proposals',
  )
}

if (
  activeQueue.item_count +
    deferred.item_count !==
  455
) {
  errors.push(
    'active and deferred queues must account for all 455 items',
  )
}

if (
  activeQueue.item_count !==
  triage.totals.active_manual_review_count
) {
  errors.push(
    'active queue count differs from triage total',
  )
}

if (
  deferred.item_count !==
  triage.totals.deferred_metadata_count
) {
  errors.push(
    'deferred count differs from triage total',
  )
}

if (
  batches.active_item_count !==
  activeQueue.item_count
) {
  errors.push(
    'review batches do not match the active queue count',
  )
}

if (
  batches.batch_count !==
  triage.totals.batch_count
) {
  errors.push(
    'batch count differs from triage total',
  )
}

const triageKeys = new Set()
const activeKeys = new Set()
const deferredKeys = new Set()
const batchKeys = []

for (const item of triage.triage_items || []) {
  if (triageKeys.has(item.segment_key)) {
    errors.push(
      `duplicate triage item: ${item.segment_key}`,
    )
  }

  triageKeys.add(item.segment_key)

  if (
    item.boundary_approved !== false ||
    item.content_approved !== false ||
    item.database_change_applied !== false
  ) {
    errors.push(
      `${item.segment_key}: approvals and database changes must remain false`,
    )
  }
}

for (const item of activeQueue.items || []) {
  activeKeys.add(item.segment_key)

  if (
    item.active_boundary_review !== true ||
    item.metadata_deferred !== false
  ) {
    errors.push(
      `${item.segment_key}: invalid active queue flags`,
    )
  }
}

for (const item of deferred.items || []) {
  deferredKeys.add(item.segment_key)

  if (
    item.disposition !==
      'defer-metadata-only' ||
    item.active_boundary_review !== false ||
    item.metadata_deferred !== true
  ) {
    errors.push(
      `${item.segment_key}: invalid deferred metadata disposition`,
    )
  }

  if (
    JSON.stringify(item.review_reasons) !==
    JSON.stringify([
      'no-legacy-word-count-estimate',
    ])
  ) {
    errors.push(
      `${item.segment_key}: only metadata-only items may be deferred`,
    )
  }
}

for (const batch of batches.batches || []) {
  if (batch.item_count > 25) {
    errors.push(
      `${batch.batch_id}: batch exceeds 25 items`,
    )
  }

  batchKeys.push(...batch.segment_keys)
}

const sorted = (values) =>
  [...values].sort()

if (
  JSON.stringify(
    sorted(triageKeys),
  ) !==
  JSON.stringify(
    sorted([
      ...activeKeys,
      ...deferredKeys,
    ]),
  )
) {
  errors.push(
    'active and deferred queues do not partition the triage manifest',
  )
}

if (
  JSON.stringify(
    sorted(batchKeys),
  ) !==
  JSON.stringify(
    sorted(activeKeys),
  )
) {
  errors.push(
    'review batches do not cover the active queue exactly once',
  )
}

for (const field of [
  'database_update_generated',
  'database_update_applied',
  'staged_status_changed',
  'boundaries_approved',
  'content_approved',
  'successor_mappings_created',
  'dependency_snapshot_captured',
  'production_modified',
  'progress_migrated',
  'reading_sessions_rewritten',
  'cutover_enabled',
]) {
  if (
    triage.application_boundary?.[field] !==
    false
  ) {
    errors.push(
      `application boundary must keep ${field}=false`,
    )
  }
}

if (
  application.summary?.reading_segment_count !==
    812 ||
  application.summary?.content_row_count !== 0 ||
  application.summary?.successor_mapping_count !==
    0 ||
  application.summary
    ?.dependency_snapshot_count !== 0 ||
  application.summary?.cutover_enabled !== false
) {
  errors.push(
    'PR-0019 application boundary changed unexpectedly',
  )
}

const sourceQueueBytes = await readFile(
  'content/migration/reading-segment-review-queue.json',
)
const recordedQueueHash =
  triage.inputs?.review_queue_sha256

if (
  sha256(sourceQueueBytes) !== recordedQueueHash
) {
  errors.push(
    'source review queue checksum differs from triage input',
  )
}

if (errors.length) {
  console.error(
    'Reading-segment review triage validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Validated triage of ${triage.totals.original_review_count} review items.`,
)
console.log(
  `Active manual queue: ${activeQueue.item_count}.`,
)
console.log(
  `Deferred metadata-only items: ${deferred.item_count}.`,
)
console.log(
  `Prepared ${batches.batch_count} review batches.`,
)
console.log(
  'No boundary, content, database, mapping, production, or cutover change was applied.',
)
