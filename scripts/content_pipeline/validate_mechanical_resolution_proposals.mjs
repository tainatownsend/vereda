import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const readJson = async (path) =>
  JSON.parse(await readFile(path, 'utf8'))

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const [
  candidates,
  application,
  proposals,
  batches,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-mechanical-candidates.json',
  ),
  readJson(
    'content/migration/reading-segment-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-resolution-proposals.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-resolution-review-batches.json',
  ),
])

const errors = []

if (
  proposals.status !== 'proposed-not-applied'
) {
  errors.push(
    'status must be proposed-not-applied',
  )
}

if (
  proposals.totals?.candidate_count !== 166 ||
  proposals.totals?.proposal_count !== 166 ||
  proposals.totals
    ?.continuity_invariants_passed !== 166 ||
  proposals.proposals?.length !== 166
) {
  errors.push(
    'proposal totals must remain 166',
  )
}

const resolutionIds = new Set()
const segmentKeys = new Set()

for (const proposal of proposals.proposals || []) {
  if (
    resolutionIds.has(proposal.resolution_id) ||
    segmentKeys.has(proposal.segment_key)
  ) {
    errors.push(
      `${proposal.segment_key}: duplicate proposal`,
    )
  }

  resolutionIds.add(proposal.resolution_id)
  segmentKeys.add(proposal.segment_key)

  if (
    proposal.proposal_status !==
      'proposed-not-approved' ||
    proposal.resolution_method !==
      'canonical-successor-start-anchor'
  ) {
    errors.push(
      `${proposal.segment_key}: invalid status or method`,
    )
  }

  if (
    proposal.shared_page_evidence
      ?.available !== true ||
    proposal.current_anchor_evidence
      ?.available !== true ||
    proposal.successor_anchor_evidence
      ?.available !== true ||
    proposal.current_anchor_evidence
      ?.signature ===
      proposal.successor_anchor_evidence
        ?.signature
  ) {
    errors.push(
      `${proposal.segment_key}: incomplete anchor evidence`,
    )
  }

  if (
    !Object.values(
      proposal.continuity_evidence || {},
    ).every((value) => value === true)
  ) {
    errors.push(
      `${proposal.segment_key}: continuity evidence failed`,
    )
  }

  for (const value of [
    proposal.boundary_approved,
    proposal.content_approved,
    proposal.database_change_applied,
    proposal.successor_mapping_created,
    proposal.cutover_enabled,
  ]) {
    if (value !== false) {
      errors.push(
        `${proposal.segment_key}: application flag changed`,
      )
    }
  }
}

const batchIds = []

for (const batch of batches.batches || []) {
  if (
    batch.item_count <= 0 ||
    batch.item_count > 25 ||
    batch.item_count !==
      batch.resolution_ids?.length
  ) {
    errors.push(
      `${batch.batch_id}: invalid batch`,
    )
  }

  batchIds.push(...batch.resolution_ids)
}

const sorted = (values) =>
  [...values].sort()

if (
  batches.proposal_count !== 166 ||
  batches.batch_count !==
    batches.batches?.length ||
  JSON.stringify(sorted(batchIds)) !==
    JSON.stringify(sorted(resolutionIds))
) {
  errors.push(
    'review batches do not cover all proposals exactly once',
  )
}

for (const [
  field,
  value,
] of Object.entries(
  proposals.application_boundary || {},
)) {
  if (value !== false) {
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
    'staging application boundary changed unexpectedly',
  )
}

const candidateBytes = await readFile(
  'content/migration/reading-segment-mechanical-candidates.json',
)

if (
  sha256(candidateBytes) !==
  proposals.inputs
    ?.mechanical_candidates_sha256
) {
  errors.push(
    'mechanical-candidate checksum differs',
  )
}

if (errors.length) {
  console.error(
    'Mechanical resolution proposal validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 166 unapproved mechanical resolution proposals.',
)
console.log(
  `Validated ${batches.batch_count} review batches.`,
)
console.log(
  'No database, content, mapping, production, or cutover change was applied.',
)
