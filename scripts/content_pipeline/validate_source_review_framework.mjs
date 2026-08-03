import {
  readFile,
} from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  decisionSchema,
  inspectionManifest,
  inspectionPackets,
  applicationEvidence,
  worklist,
  packetRegister,
  worklistCsv,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-source-review-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-decision-schema.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-source-inspection-packets.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-packet-register.json',
  ),
  readFile(
    'content/migration/reading-segment-source-review-worklist.csv',
    'utf8',
  ),
  readFile('.gitignore', 'utf8'),
])

const errors = []

if (
  worklist.status !==
    'source-review-framework-prepared-not-reviewed' ||
  worklist.policy_version !==
    policy.policy_version ||
  decisionSchema.policy_version !==
    policy.policy_version ||
  worklist.run_id !==
    inspectionManifest.run_id ||
  worklist.run_id !==
    applicationEvidence.run_id
) {
  errors.push(
    'framework, policy, packet, or migration identity differs',
  )
}

if (
  worklist.rights_status !==
    'blocked' ||
  worklist.contains_full_text !==
    false
) {
  errors.push(
    'rights or full-text boundary differs',
  )
}

const expectedTotals = {
  item_count: 144,
  packet_count: 16,
  pending_count: 144,
  in_review_count: 0,
  reviewed_count: 0,
  unresolved_count: 0,
  public_decision_count: 0,
  source_text_reviewed_count: 0,
  completed_mechanical_count: 166,
  remaining_boundary_review_count: 646,
  structural_review_count: 85,
  size_review_count: 10,
  database_change_count: 0,
}

for (
  const [field, expected] of
  Object.entries(expectedTotals)
) {
  if (
    worklist.totals?.[field] !==
    expected
  ) {
    errors.push(
      `${field}: expected ${expected}; received ${worklist.totals?.[field]}`,
    )
  }
}

if (
  worklist.items?.length !== 144 ||
  packetRegister.packet_count !== 16 ||
  packetRegister.item_count !== 144 ||
  packetRegister.packets?.length !== 16
) {
  errors.push(
    'worklist or packet-register totals differ',
  )
}

const decisionIds = new Set()
const inspectionIds = new Set()
const segmentKeys = new Set()

for (
  const item of
  worklist.items || []
) {
  decisionIds.add(item.decision_id)
  inspectionIds.add(
    item.inspection_id,
  )
  segmentKeys.add(item.segment_key)

  if (
    item.review_status !==
      'pending' ||
    item.selected_decision !==
      null ||
    item.reviewer_confidence !==
      null ||
    item.review_completed_at !==
      null ||
    item.boundary_decision_recorded !==
      false ||
    item.boundary_approved !==
      false ||
    item.database_change_applied !==
      false ||
    item.content_approved !== false ||
    item.content_loaded !== false ||
    item.cutover_enabled !== false ||
    item.source_text_included !==
      false ||
    item.source_excerpt_included !==
      false
  ) {
    errors.push(
      `${item.segment_key}: a review or application value was recorded`,
    )
  }

  for (
    const value of
    Object.values(item.evidence || {})
  ) {
    if (
      value !== null &&
      value !== true
    ) {
      errors.push(
        `${item.segment_key}: pending evidence must remain null`,
      )
    }
  }

  if (
    item.evidence
      ?.source_reference_only !== true
  ) {
    errors.push(
      `${item.segment_key}: source_reference_only must be true`,
    )
  }

  const laneRequirements =
    policy.evidence_requirements[
      item.inspection_lane
    ]

  if (
    !laneRequirements ||
    JSON.stringify(
      item.required_evidence,
    ) !==
      JSON.stringify(
        laneRequirements,
      )
  ) {
    errors.push(
      `${item.segment_key}: lane evidence requirements differ`,
    )
  }

  if (
    !item.decision_options
      ?.length
  ) {
    errors.push(
      `${item.segment_key}: decision options are missing`,
    )
  }
}

if (
  decisionIds.size !== 144 ||
  inspectionIds.size !== 144 ||
  segmentKeys.size !== 144
) {
  errors.push(
    'worklist identifiers must be unique',
  )
}

const registerDecisionIds =
  packetRegister.packets.flatMap(
    (packet) =>
      packet.decision_ids,
  )

if (
  registerDecisionIds.length !==
    144 ||
  new Set(registerDecisionIds).size !==
    144
) {
  errors.push(
    'packet register does not cover 144 decisions exactly once',
  )
}

for (
  const packet of
  packetRegister.packets || []
) {
  if (
    packet.item_count <= 0 ||
    packet.item_count > 20 ||
    packet.pending_count !==
      packet.item_count ||
    packet.in_review_count !== 0 ||
    packet.reviewed_count !== 0 ||
    packet.unresolved_count !== 0
  ) {
    errors.push(
      `${packet.packet_id}: packet review status differs`,
    )
  }
}

const forbiddenFieldPatterns = [
  /"source_text"\s*:/i,
  /"source_excerpt"\s*:/i,
  /"quoted_text"\s*:/i,
  /"quotation"\s*:/i,
  /"full_text"\s*:/i,
  /"normalized_content"\s*:/i,
  /"private_notes"\s*:/i,
  /"reviewer_notes"\s*:/i,
  /"ocr_text"\s*:/i,
]

const publicJson = JSON.stringify(
  worklist,
)

for (
  const pattern of
  forbiddenFieldPatterns
) {
  if (pattern.test(publicJson)) {
    errors.push(
      `forbidden public field found: ${pattern}`,
    )
  }
}

const csvLines = worklistCsv
  .replace(/\r\n?/g, '\n')
  .trimEnd()
  .split('\n')

if (csvLines.length !== 145) {
  errors.push(
    `CSV must contain one header and 144 rows; received ${csvLines.length}`,
  )
}

if (
  !gitignore
    .split(/\r?\n/)
    .includes('.vereda-private/')
) {
  errors.push(
    '.vereda-private/ is not ignored by Git',
  )
}

for (
  const [field, value] of
  Object.entries(
    worklist.review_boundary || {},
  )
) {
  if (
    [
      'framework_generated',
      'private_workspace_generated',
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
  inspectionManifest.totals
    ?.source_inspection_count !== 144 ||
  inspectionPackets.item_count !== 144 ||
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
    'upstream inspection or database evidence changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'Source-review framework validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 144 pending source-review records.',
)
console.log(
  'Validated 16 packet-register entries.',
)
console.log(
  'Validated content-free JSON and CSV worklists.',
)
console.log(
  'Validated private workspace Git exclusion.',
)
console.log(
  'No decision, source text, database change, or cutover was introduced.',
)
