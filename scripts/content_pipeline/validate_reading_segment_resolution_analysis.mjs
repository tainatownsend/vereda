import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const [
  policy,
  design,
  active,
  triage,
  application,
  analysis,
  mechanical,
  sourceInspection,
  structural,
  size,
  batches,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-resolution-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-design-manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-active-review-queue.json',
  ),
  readJson(
    'content/migration/reading-segment-review-triage.json',
  ),
  readJson(
    'content/migration/reading-segment-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-resolution-analysis.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-candidates.json',
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
    'content/migration/reading-segment-resolution-batches.json',
  ),
])

const errors = []

if (analysis.status !== 'analyzed-not-applied') {
  errors.push(
    'analysis status must be analyzed-not-applied',
  )
}

if (
  analysis.policy_version !==
  policy.policy_version
) {
  errors.push(
    'analysis policy version differs',
  )
}

if (
  analysis.run_id !== design.run_id ||
  analysis.run_id !== active.run_id ||
  analysis.run_id !== triage.run_id ||
  analysis.run_id !== application.run_id
) {
  errors.push('migration run IDs differ')
}

if (
  analysis.totals?.staged_segment_count !== 812
) {
  errors.push(
    'staged segment count must remain 812',
  )
}

if (
  analysis.totals?.active_item_count !== 405 ||
  analysis.items?.length !== 405
) {
  errors.push(
    'resolution analysis must contain 405 items',
  )
}

const queueDocuments = [
  [
    'mechanical-anchor-candidate',
    mechanical,
  ],
  [
    'source-inspection-required',
    sourceInspection,
  ],
  [
    'structural-review-required',
    structural,
  ],
  [
    'delivery-size-review-required',
    size,
  ],
]

const analysisKeys = new Set()
const partitionKeys = []
const countsByPath = new Map()

for (const item of analysis.items || []) {
  if (analysisKeys.has(item.segment_key)) {
    errors.push(
      `duplicate analysis item: ${item.segment_key}`,
    )
  }

  analysisKeys.add(item.segment_key)

  if (
    item.boundary_approved !== false ||
    item.content_approved !== false ||
    item.database_change_applied !== false
  ) {
    errors.push(
      `${item.segment_key}: approvals and database changes must remain false`,
    )
  }

  countsByPath.set(
    item.resolution_path,
    (countsByPath.get(
      item.resolution_path,
    ) || 0) + 1,
  )
}

for (const [path, document] of queueDocuments) {
  if (
    document.item_count !==
    document.items?.length
  ) {
    errors.push(
      `${path}: queue count differs from items`,
    )
  }

  if (
    document.item_count !==
    analysis.resolution_path_counts?.[path]
  ) {
    errors.push(
      `${path}: queue count differs from analysis`,
    )
  }

  for (const item of document.items || []) {
    partitionKeys.push(item.segment_key)

    if (item.resolution_path !== path) {
      errors.push(
        `${item.segment_key}: unexpected resolution path`,
      )
    }
  }
}

const sorted = (values) =>
  [...values].sort()

if (
  JSON.stringify(
    sorted(analysisKeys),
  ) !==
  JSON.stringify(
    sorted(partitionKeys),
  )
) {
  errors.push(
    'resolution queues do not partition the 405 analyzed items',
  )
}

for (const item of mechanical.items || []) {
  if (
    item.resolution_rationale !==
    'distinct-non-page-canonical-anchors'
  ) {
    errors.push(
      `${item.segment_key}: invalid mechanical rationale`,
    )
  }

  if (
    item.current_anchor_evidence
      ?.available !== true ||
    item.successor_anchor_evidence
      ?.available !== true
  ) {
    errors.push(
      `${item.segment_key}: mechanical candidate lacks anchor evidence`,
    )
  }

  if (
    item.current_anchor_evidence
      ?.signature ===
    item.successor_anchor_evidence
      ?.signature
  ) {
    errors.push(
      `${item.segment_key}: mechanical anchors must differ`,
    )
  }

  if (
    !item.review_reasons.includes(
      'same-page-successor-boundary',
    )
  ) {
    errors.push(
      `${item.segment_key}: mechanical candidate lacks same-page reason`,
    )
  }

  for (const forbiddenReason of [
    'missing-start-locator',
    'split-required-by-reconstruction-plan',
    'manual-reconstruction-review',
    'container-intro-boundary',
    'legacy-word-count-oversized',
  ]) {
    if (
      item.review_reasons.includes(
        forbiddenReason,
      )
    ) {
      errors.push(
        `${item.segment_key}: mechanical candidate includes forbidden reason ${forbiddenReason}`,
      )
    }
  }
}

const batchKeys = []

for (const batch of batches.batches || []) {
  if (
    batch.item_count <= 0 ||
    batch.item_count > 25
  ) {
    errors.push(
      `${batch.batch_id}: invalid batch size`,
    )
  }

  if (
    batch.item_count !==
    batch.segment_keys?.length
  ) {
    errors.push(
      `${batch.batch_id}: batch count differs from keys`,
    )
  }

  batchKeys.push(...batch.segment_keys)
}

if (
  batches.item_count !== 405 ||
  batches.batch_count !==
    batches.batches?.length
) {
  errors.push(
    'resolution batch totals are invalid',
  )
}

if (
  JSON.stringify(
    sorted(batchKeys),
  ) !==
  JSON.stringify(
    sorted(analysisKeys),
  )
) {
  errors.push(
    'resolution batches do not cover every analyzed item exactly once',
  )
}

for (const [path, count] of countsByPath) {
  if (
    analysis.resolution_path_counts?.[
      path
    ] !== count
  ) {
    errors.push(
      `${path}: analysis path count mismatch`,
    )
  }
}

for (const [field, value] of Object.entries(
  analysis.application_boundary || {},
)) {
  if (value !== false) {
    errors.push(
      `application boundary must keep ${field}=false`,
    )
  }
}

if (
  application.summary?.reading_segment_count !== 812 ||
  application.summary?.content_row_count !== 0 ||
  application.summary?.successor_mapping_count !== 0 ||
  application.summary?.dependency_snapshot_count !== 0 ||
  application.summary?.cutover_enabled !== false
) {
  errors.push(
    'PR-0019 staging boundary changed unexpectedly',
  )
}

const activeBytes = await readFile(
  'content/migration/reading-segment-active-review-queue.json',
)

if (
  sha256(activeBytes) !==
  analysis.inputs?.active_queue_sha256
) {
  errors.push(
    'active queue checksum differs from analysis input',
  )
}

if (errors.length) {
  console.error(
    'Reading-segment resolution analysis validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Validated resolution analysis for ${analysis.totals.active_item_count} active items.`,
)
console.log(
  `Mechanical candidates: ${mechanical.item_count}.`,
)
console.log(
  `Source inspection: ${sourceInspection.item_count}.`,
)
console.log(
  `Structural review: ${structural.item_count}.`,
)
console.log(
  `Delivery-size review: ${size.item_count}.`,
)
console.log(
  `Prepared ${batches.batch_count} deterministic batches.`,
)
console.log(
  'No boundary, content, database, mapping, production, or cutover change was applied.',
)
