import {
  createHash,
} from 'node:crypto'
import {
  readFile,
} from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(
    await readFile(filePath, 'utf8'),
  )

const sha256 = async (filePath) =>
  createHash('sha256')
    .update(
      await readFile(filePath),
    )
    .digest('hex')

const [
  policy,
  decisions,
  plan,
  evidence,
  progress,
  audit,
  application,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-same-page-progress-integration-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-review-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-review-integration-plan.json',
  ),
  readJson(
    'content/migration/reading-segment-same-page-progress-integration-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readJson(
    'content/migration/reading-segment-pending-source-review-audit.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
])

const errors = []
const targetPacketIds = new Set(
  policy.target.packet_ids,
)

if (
  policy.status !==
    'accepted-for-same-page-progress-integration' ||
  evidence.status !==
    'same-page-review-progress-integrated-not-applied' ||
  progress.status !==
    'same-page-review-integrated-not-applied' ||
  evidence.policy_version !==
    policy.policy_version ||
  progress.policy_version !==
    policy.policy_version ||
  evidence.run_id !== progress.run_id ||
  decisions.run_id !== progress.run_id ||
  plan.run_id !== progress.run_id
) {
  errors.push(
    'policy, evidence, progress, or migration identity differs',
  )
}

if (
  decisions.totals?.item_count !== 38 ||
  decisions.totals?.reviewed_count !== 38 ||
  decisions.totals?.unresolved_count !== 0 ||
  decisions.totals
    ?.exclude_structural_heading_count !== 38 ||
  decisions.totals
    ?.boundary_approved_count !== 0 ||
  decisions.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'source decision totals differ',
  )
}

const expectedIntegrated = {
  reviewed_count: 54,
  unresolved_count: 2,
  pending_count: 88,
  public_decision_count: 56,
  completed_packet_count: 8,
  pending_packet_count: 8,
}

for (const [
  field,
  expected,
] of Object.entries(
  expectedIntegrated,
)) {
  if (
    progress.totals?.[field] !==
      expected ||
    evidence.integrated_state?.[field] !==
      expected
  ) {
    errors.push(
      `${field}: integrated value differs`,
    )
  }
}

if (
  progress.totals?.item_count !== 144 ||
  progress.totals?.packet_count !== 16 ||
  progress.totals?.in_review_count !== 0 ||
  progress.totals
    ?.same_page_review_item_count !== 38 ||
  progress.totals
    ?.same_page_review_reviewed_count !== 38 ||
  progress.totals
    ?.same_page_review_unresolved_count !== 0 ||
  progress.totals
    ?.same_page_review_excluded_count !== 38 ||
  progress.totals
    ?.same_page_review_completed_packet_count !== 4 ||
  progress.totals
    ?.manual_adjudication_reviewed_count !== 7 ||
  progress.totals
    ?.manual_adjudication_resolved_count !== 5 ||
  progress.totals
    ?.manual_adjudication_still_unresolved_count !== 2 ||
  progress.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'integrated cumulative totals differ',
  )
}

if (
  progress.totals.pending_count +
    progress.totals.reviewed_count +
    progress.totals.unresolved_count !==
    progress.totals.item_count ||
  progress.totals
    .public_decision_count !==
    progress.totals.reviewed_count +
      progress.totals.unresolved_count ||
  progress.totals
    .completed_packet_count +
    progress.totals
      .pending_packet_count !==
    progress.totals.packet_count
) {
  errors.push(
    'integrated cumulative totals do not balance',
  )
}

const targetPackets =
  progress.packets.filter(
    (packet) =>
      targetPacketIds.has(
        packet.packet_id,
      ),
  )

if (
  targetPackets.length !== 4 ||
  targetPackets.reduce(
    (sum, packet) =>
      sum + packet.item_count,
    0,
  ) !== 38
) {
  errors.push(
    'integrated target-packet coverage differs',
  )
}

for (const packet of targetPackets) {
  if (
    packet.pending_count !== 0 ||
    packet.in_review_count !== 0 ||
    packet.reviewed_count !==
      packet.item_count ||
    packet.unresolved_count !== 0 ||
    packet.status !==
      'reviewed-not-applied'
  ) {
    errors.push(
      `${packet.packet_id}: integrated packet state differs`,
    )
  }
}

const pendingPackets =
  progress.packets.filter(
    (packet) =>
      packet.status === 'pending',
  )
const pendingNoAnchor =
  pendingPackets.filter(
    (packet) =>
      packet.inspection_lane ===
      'same-page-no-semantic-anchor',
  )

if (
  pendingPackets.length !== 8 ||
  pendingNoAnchor.length !== 8 ||
  pendingNoAnchor.reduce(
    (sum, packet) =>
      sum + packet.pending_count,
    0,
  ) !== 88 ||
  pendingNoAnchor.some(
    (packet) =>
      packet.reviewed_count !== 0 ||
      packet.unresolved_count !== 0 ||
      packet.in_review_count !== 0,
  )
) {
  errors.push(
    'preserved no-anchor pending lane differs',
  )
}

if (
  evidence.input_hashes
    ?.decision_artifact_sha256 !==
    await sha256(
      'content/migration/reading-segment-same-page-review-decisions.json',
    ) ||
  evidence.input_hashes
    ?.integration_plan_sha256 !==
    await sha256(
      'content/migration/reading-segment-same-page-review-integration-plan.json',
    )
) {
  errors.push(
    'integration input hashes differ',
  )
}

if (
  audit.totals
    ?.container_intro_same_page_count !== 38 ||
  audit.totals
    ?.same_page_no_semantic_anchor_count !== 88 ||
  audit.totals
    ?.pending_item_count !== 126 ||
  audit.totals
    ?.pending_packet_count !== 12
) {
  errors.push(
    'historical PR-0038 audit changed',
  )
}

for (const [
  field,
  value,
] of Object.entries(
  evidence.integration_boundary || {},
)) {
  if (
    [
      'validated_decisions_integrated',
      'cumulative_progress_modified',
      'packet_progress_modified',
      'historical_validator_compatibility_updated',
      'historical_test_compatibility_updated',
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
    'Same-page progress integration validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated integration of 38 same-page review decisions.',
)
console.log(
  'Validated cumulative state: 54 reviewed, 2 unresolved, and 88 pending.',
)
console.log(
  'Validated 8 completed and 8 pending packets.',
)
console.log(
  'Validated preservation of all 88 no-anchor pending items.',
)
console.log(
  'No boundary approval, database change, or cutover was introduced.',
)
