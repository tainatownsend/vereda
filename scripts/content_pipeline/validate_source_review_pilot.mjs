import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  sourceManifest,
  worklist,
  packetRegister,
  applicationEvidence,
  decisions,
  progress,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-source-review-pilot-policy.json',
  ),
  readJson(
    'content/sources/manifest.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-worklist.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-packet-register.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-pilot-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readFile('.gitignore', 'utf8'),
])

const errors = []
const expectedPacket =
  'container-intro-only-book-4-packet-01'
const expectedTitles = new Set([
  'PRIMEIRA PARTE — Doutrina',
  'SEGUNDA PARTE — Exemplos',
])

const sourceWork =
  sourceManifest.works?.find(
    (work) =>
      work.book_id === 4,
  )

if (
  policy.status !==
    'accepted-for-pilot-source-review' ||
  decisions.status !==
    'pilot-source-review-recorded-not-applied'
) {
  errors.push(
    'pilot policy or decision status differs',
  )
}

if (
  ![
    'pilot-packet-reviewed-not-applied',
    'container-intro-review-completed-not-applied',
    'title-window-recovery-completed-not-applied',
  ].includes(progress.status)
) {
  errors.push(
    'cumulative progress status is unsupported',
  )
}

if (
  decisions.policy_version !==
    policy.policy_version ||
  decisions.run_id !==
    worklist.run_id ||
  progress.run_id !==
    worklist.run_id ||
  decisions.packet_id !==
    expectedPacket
) {
  errors.push(
    'pilot decision or migration identity differs',
  )
}

if (
  typeof progress.policy_version !==
    'string' ||
  progress.policy_version.length === 0
) {
  errors.push(
    'cumulative progress policy version is missing',
  )
}

if (
  !sourceWork ||
  sourceWork.source_sha256 !==
    policy.source.source_sha256 ||
  decisions.source?.source_sha256 !==
    policy.source.source_sha256 ||
  sourceWork.pdf_page_count !== 409 ||
  decisions.source?.pdf_page_count !== 409
) {
  errors.push(
    'source identity or page count differs',
  )
}

if (
  decisions.contains_full_text !== false ||
  decisions.contains_source_excerpt !== false ||
  decisions.totals
    ?.packet_item_count !== 2 ||
  decisions.totals
    ?.reviewed_count !== 2 ||
  decisions.totals
    ?.unresolved_count !== 0 ||
  decisions.totals
    ?.excluded_structural_heading_count !== 2 ||
  decisions.totals
    ?.boundary_approved_count !== 0 ||
  decisions.totals
    ?.database_change_count !== 0 ||
  decisions.decisions?.length !== 2
) {
  errors.push(
    'pilot decision totals differ',
  )
}

const decisionIds = new Set()
const inspectionIds = new Set()
const segmentKeys = new Set()
const selectedPages = new Set()

for (
  const decision of
  decisions.decisions || []
) {
  decisionIds.add(
    decision.decision_id,
  )
  inspectionIds.add(
    decision.inspection_id,
  )
  segmentKeys.add(
    decision.segment_key,
  )
  selectedPages.add(
    decision.evidence
      ?.source_pdf_page_reviewed,
  )

  if (
    decision.packet_id !==
      expectedPacket ||
    decision.book_id !== 4 ||
    decision.book_slug !==
      'o-ceu-e-o-inferno' ||
    decision.inspection_lane !==
      'container-intro-only' ||
    !expectedTitles.has(
      decision.display_title,
    )
  ) {
    errors.push(
      `${decision.segment_key}: pilot identity differs`,
    )
  }

  if (
    decision.review_status !==
      'reviewed' ||
    decision.selected_decision !==
      'exclude-structural-heading' ||
    decision.reviewer_confidence !==
      'high' ||
    decision.boundary_decision_recorded !==
      true ||
    decision.boundary_approved !==
      false ||
    decision.database_change_applied !==
      false ||
    decision.content_approved !==
      false ||
    decision.content_loaded !==
      false ||
    decision.cutover_enabled !== false ||
    decision.source_text_included !==
      false ||
    decision.source_excerpt_included !==
      false
  ) {
    errors.push(
      `${decision.segment_key}: review or application boundary differs`,
    )
  }

  const evidence =
    decision.evidence || {}

  if (
    evidence.source_sha256 !==
      policy.source.source_sha256 ||
    evidence.visible_prose_presence !==
      'heading-only' ||
    evidence.successor_anchor_type !==
      'heading' ||
    evidence.locator_type !==
      'structural-heading' ||
    evidence.locator_value !==
      decision.display_title ||
    evidence.source_reference_only !==
      true ||
    !Number.isInteger(
      evidence.source_pdf_page_reviewed,
    ) ||
    evidence.source_pdf_page_reviewed <=
      8 ||
    evidence.candidate_page_count < 2 ||
    evidence.toc_signal_count !== 0 ||
    evidence.prose_signal_count !== 0 ||
    evidence.structural_line_count <= 0
  ) {
    errors.push(
      `${decision.segment_key}: structural evidence differs`,
    )
  }
}

if (
  decisionIds.size !== 2 ||
  inspectionIds.size !== 2 ||
  segmentKeys.size !== 2 ||
  selectedPages.size !== 2
) {
  errors.push(
    'pilot decision identifiers and pages must be unique',
  )
}

const secondPart =
  decisions.decisions?.find(
    (decision) =>
      decision.display_title ===
      'SEGUNDA PARTE — Exemplos',
  )

if (
  !secondPart ||
  secondPart.evidence
    ?.source_pdf_page_reviewed <= 100
) {
  errors.push(
    'second-part evidence must come from the actual part opening, not the table of contents',
  )
}

const preservedProgress = {
  item_count: 144,
  packet_count: 16,
  completed_mechanical_count: 166,
  remaining_boundary_review_count: 646,
  database_change_count: 0,
}

for (const [
  field,
  expected,
] of Object.entries(
  preservedProgress,
)) {
  if (
    progress.totals?.[field] !==
    expected
  ) {
    errors.push(
      `${field}: expected ${expected}; received ${progress.totals?.[field]}`,
    )
  }
}

if (
  progress.totals?.in_review_count !== 0 ||
  progress.totals?.pending_count +
    progress.totals?.reviewed_count +
    progress.totals?.unresolved_count !==
    144 ||
  progress.totals?.public_decision_count !==
    progress.totals?.reviewed_count +
      progress.totals?.unresolved_count ||
  progress.totals?.completed_packet_count +
    progress.totals?.pending_packet_count !==
    16
) {
  errors.push(
    'cumulative review progress totals are inconsistent',
  )
}

const pilotProgress =
  progress.packets?.find(
    (packet) =>
      packet.packet_id ===
      expectedPacket,
  )

if (
  !pilotProgress ||
  pilotProgress.item_count !== 2 ||
  pilotProgress.pending_count !== 0 ||
  pilotProgress.reviewed_count !== 2 ||
  pilotProgress.status !==
    'reviewed-not-applied'
) {
  errors.push(
    'pilot packet progress differs',
  )
}

for (
  const packet of
  progress.packets || []
) {
  if (
    packet.pending_count +
      packet.reviewed_count +
      packet.unresolved_count !==
      packet.item_count ||
    packet.in_review_count !== 0
  ) {
    errors.push(
      `${packet.packet_id}: packet progress totals are inconsistent`,
    )
  }
}

for (const [
  field,
  value,
] of Object.entries(
  progress.application_boundary || {},
)) {
  if (
    field ===
    'structured_decisions_recorded'
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

const publicText =
  JSON.stringify(decisions)

for (const forbidden of [
  '"source_text":',
  '"source_excerpt":',
  '"quoted_text":',
  '"quotation":',
  '"full_text":',
  '"normalized_content":',
  '"private_notes":',
  '"reviewer_notes":',
  '"ocr_text":',
  '"page_text":',
]) {
  if (
    publicText
      .toLowerCase()
      .includes(
        forbidden.toLowerCase(),
      )
  ) {
    errors.push(
      `forbidden public field found: ${forbidden}`,
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
  worklist.totals?.item_count !== 144 ||
  worklist.totals?.pending_count !== 144 ||
  packetRegister.packet_count !== 16 ||
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
    'upstream worklist or database evidence changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'Pilot source-review validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 2 structured pilot decisions.',
)
console.log(
  `Validated cumulative progress: ${progress.totals.pending_count} pending, ${progress.totals.reviewed_count} reviewed, and ${progress.totals.unresolved_count} unresolved items.`,
)
console.log(
  `Validated ${progress.totals.completed_packet_count} completed and ${progress.totals.pending_packet_count} pending review packets.`,
)
console.log(
  'Validated source-text exclusion and private workspace isolation.',
)
console.log(
  'No boundary approval, database change, or cutover was introduced.',
)
