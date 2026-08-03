import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const [
  policy,
  design,
  proposals,
  application,
  decisions,
  accepted,
  exceptions,
  batches,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-mechanical-review-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-design-manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-resolution-proposals.json',
  ),
  readJson(
    'content/migration/reading-segment-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-review-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-review-accepted.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-review-exceptions.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-review-batches.json',
  ),
])

const errors = []

if (
  decisions.status !== 'reviewed-not-applied'
) {
  errors.push(
    'decision package status must be reviewed-not-applied',
  )
}

if (
  decisions.policy_version !==
  policy.policy_version
) {
  errors.push(
    'review policy version differs',
  )
}

if (
  decisions.run_id !== design.run_id ||
  decisions.run_id !== proposals.run_id ||
  decisions.run_id !== application.run_id
) {
  errors.push('migration run IDs differ')
}

if (
  decisions.totals?.proposal_count !== 166 ||
  decisions.totals?.reviewed_count !== 166 ||
  decisions.decisions?.length !== 166
) {
  errors.push(
    'independent review must contain 166 decisions',
  )
}

if (
  decisions.totals?.accepted_count !== 166 ||
  decisions.totals?.unresolved_count !== 0 ||
  decisions.totals?.rejected_count !== 0
) {
  errors.push(
    'expected all 166 deterministic proposals to pass independent review',
  )
}

if (
  accepted.item_count !== 166 ||
  accepted.items?.length !== 166 ||
  exceptions.item_count !== 0 ||
  exceptions.items?.length !== 0
) {
  errors.push(
    'accepted and exception queue totals are invalid',
  )
}

const decisionIds = new Set()
const resolutionIds = new Set()

for (const decision of decisions.decisions || []) {
  if (
    decisionIds.has(decision.decision_id)
  ) {
    errors.push(
      `duplicate decision ID: ${decision.decision_id}`,
    )
  }

  if (
    resolutionIds.has(
      decision.resolution_id,
    )
  ) {
    errors.push(
      `duplicate resolution ID: ${decision.resolution_id}`,
    )
  }

  decisionIds.add(decision.decision_id)
  resolutionIds.add(decision.resolution_id)

  if (
    decision.decision !==
      'accepted-for-future-application' ||
    decision.decision_status !==
      'recorded-not-applied'
  ) {
    errors.push(
      `${decision.resolution_id}: unexpected decision`,
    )
  }

  for (const [
    check,
    passed,
  ] of Object.entries(
    decision.checks || {},
  )) {
    if (passed !== true) {
      errors.push(
        `${decision.resolution_id}: independent check failed: ${check}`,
      )
    }
  }

  for (const [
    field,
    value,
  ] of Object.entries({
    database_application_authorized:
      decision.database_application_authorized,
    database_change_applied:
      decision.database_change_applied,
    content_approved:
      decision.content_approved,
    content_loaded:
      decision.content_loaded,
    successor_mapping_created:
      decision.successor_mapping_created,
    cutover_enabled:
      decision.cutover_enabled,
  })) {
    if (value !== false) {
      errors.push(
        `${decision.resolution_id}: ${field} must remain false`,
      )
    }
  }
}

const batchDecisionIds = []

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
      batch.decision_ids?.length ||
    batch.item_count !==
      batch.resolution_ids?.length ||
    batch.item_count !==
      batch.segment_keys?.length
  ) {
    errors.push(
      `${batch.batch_id}: batch totals differ`,
    )
  }

  batchDecisionIds.push(
    ...batch.decision_ids,
  )
}

const sorted = (values) =>
  [...values].sort()

if (
  batches.decision_count !== 166 ||
  batches.batch_count !==
    batches.batches?.length
) {
  errors.push(
    'decision batch totals are invalid',
  )
}

if (
  JSON.stringify(
    sorted(batchDecisionIds),
  ) !==
  JSON.stringify(
    sorted(decisionIds),
  )
) {
  errors.push(
    'decision batches do not cover all decisions exactly once',
  )
}

for (const [field, value] of Object.entries(
  decisions.application_boundary || {},
)) {
  if (
    field ===
    'decision_package_generated'
  ) {
    if (value !== true) {
      errors.push(
        'decision_package_generated must be true',
      )
    }
  } else if (value !== false) {
    errors.push(
      `application boundary must keep ${field}=false`,
    )
  }
}

if (
  application.summary
    ?.reading_segment_count !== 812 ||
  application.summary?.content_row_count !== 0 ||
  application.summary
    ?.successor_mapping_count !== 0 ||
  application.summary
    ?.dependency_snapshot_count !== 0 ||
  application.summary?.cutover_enabled !== false
) {
  errors.push(
    'staging boundary changed unexpectedly',
  )
}

const proposalBytes = await readFile(
  'content/migration/reading-segment-mechanical-resolution-proposals.json',
)

if (
  sha256(proposalBytes) !==
  decisions.inputs
    ?.resolution_proposals_sha256
) {
  errors.push(
    'proposal checksum differs from review input',
  )
}

if (errors.length) {
  console.error(
    'Mechanical resolution review validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Validated ${decisions.totals.reviewed_count} independent review decisions.`,
)
console.log(
  `Accepted for future application: ${accepted.item_count}.`,
)
console.log(
  'Unresolved: 0.',
)
console.log(
  'Rejected: 0.',
)
console.log(
  `Prepared ${batches.batch_count} decision batches.`,
)
console.log(
  'No database, content, mapping, production, or cutover change was applied.',
)
