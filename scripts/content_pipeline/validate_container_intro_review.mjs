import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const [
  policy,
  sourceManifest,
  worklist,
  register,
  pilot,
  application,
  decisions,
  progress,
  gitignore,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-source-review-container-intro-policy.json',
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
    'content/migration/reading-segment-source-review-pilot-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-container-intro-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-source-review-progress.json',
  ),
  readFile('.gitignore', 'utf8'),
])

const errors = []
const targetPacketIds = new Set(
  policy.target_packet_ids,
)
const sourceByBook = new Map(
  sourceManifest.works.map(
    (work) => [
      work.book_id,
      work,
    ],
  ),
)
const worklistByDecision = new Map(
  worklist.items.map(
    (item) => [
      item.decision_id,
      item,
    ],
  ),
)

if (
  policy.status !==
    'accepted-for-container-intro-review' ||
  decisions.status !==
    'container-intro-review-recorded-not-applied'
) {
  errors.push(
    'container-intro policy or decision status differs',
  )
}

if (
  typeof progress.status !== 'string' ||
  !progress.status.endsWith('-not-applied')
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
  typeof progress.policy_version !==
    'string' ||
  progress.policy_version.length === 0
) {
  errors.push(
    'decision, progress, or migration identity differs',
  )
}

if (
  decisions.contains_full_text !== false ||
  decisions.contains_source_excerpt !== false ||
  decisions.totals?.packet_count !== 3 ||
  decisions.totals?.item_count !== 16 ||
  decisions.decisions?.length !== 16 ||
  decisions.packet_results?.length !== 3 ||
  decisions.totals
    ?.boundary_approved_count !== 0 ||
  decisions.totals
    ?.database_change_count !== 0
) {
  errors.push(
    'container-intro decision totals differ',
  )
}

if (
  decisions.totals.reviewed_count +
    decisions.totals.unresolved_count !==
  16
) {
  errors.push(
    'reviewed and unresolved outcomes must total 16',
  )
}

if (
  decisions.totals
    .exclude_structural_heading_count +
    decisions.totals
      .retain_intro_segment_count +
    decisions.totals
      .unresolved_count !==
  16
) {
  errors.push(
    'decision classifications must total 16',
  )
}

const decisionIds = new Set()
const inspectionIds = new Set()
const segmentKeys = new Set()

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

  const source =
    sourceByBook.get(
      decision.book_id,
    )
  const baseline =
    worklistByDecision.get(
      decision.decision_id,
    )

  if (
    !baseline ||
    !targetPacketIds.has(
      decision.packet_id,
    ) ||
    baseline.packet_id !==
      decision.packet_id ||
    baseline.segment_key !==
      decision.segment_key ||
    baseline.inspection_lane !==
      'container-intro-only' ||
    decision.inspection_lane !==
      'container-intro-only'
  ) {
    errors.push(
      `${decision.segment_key}: target identity differs`,
    )
  }

  if (
    !source ||
    decision.evidence
      ?.source_sha256 !==
      source.source_sha256 ||
    decision.evidence
      ?.source_file !==
      source.source_file ||
    !Number.isInteger(
      decision.evidence
        ?.source_pdf_page_reviewed,
    ) ||
    decision.evidence
      .source_pdf_page_reviewed <= 0 ||
    decision.evidence
      .source_reference_only !== true
  ) {
    errors.push(
      `${decision.segment_key}: source evidence differs`,
    )
  }

  if (
    decision.review_status ===
    'reviewed'
  ) {
    if (
      ![
        'exclude-structural-heading',
        'retain-intro-segment',
      ].includes(
        decision.selected_decision,
      ) ||
      !baseline.decision_options.includes(
        decision.selected_decision,
      ) ||
      ![
        'heading-only',
        'independent-prose',
      ].includes(
        decision.evidence
          .visible_prose_presence,
      ) ||
      decision.evidence
        .successor_title_found !==
        true ||
      !Number.isInteger(
        decision.evidence
          .successor_source_pdf_page_reviewed,
      ) ||
      ![
        'high',
        'medium',
      ].includes(
        decision.reviewer_confidence,
      )
    ) {
      errors.push(
        `${decision.segment_key}: reviewed decision evidence differs`,
      )
    }

    if (
      decision.selected_decision ===
        'exclude-structural-heading' &&
      (
        decision.evidence
          .visible_prose_presence !==
          'heading-only' ||
        decision.evidence
          .prose_signal_count !== 0
      )
    ) {
      errors.push(
        `${decision.segment_key}: heading exclusion requires zero prose signals`,
      )
    }

    if (
      decision.selected_decision ===
        'retain-intro-segment' &&
      (
        decision.evidence
          .visible_prose_presence !==
          'independent-prose' ||
        decision.evidence
          .prose_signal_count <= 0
      )
    ) {
      errors.push(
        `${decision.segment_key}: retained intro requires prose evidence`,
      )
    }
  } else if (
    decision.review_status ===
    'unresolved'
  ) {
    if (
      decision.selected_decision !==
        'unresolved' ||
      decision.evidence
        .visible_prose_presence !==
        'unclear' ||
      decision.reviewer_confidence !==
        'low' ||
      typeof decision.evidence
        .unresolved_reason !==
        'string'
    ) {
      errors.push(
        `${decision.segment_key}: unresolved evidence differs`,
      )
    }
  } else {
    errors.push(
      `${decision.segment_key}: unexpected review status`,
    )
  }

  if (
    decision.boundary_decision_recorded !==
      true ||
    decision.boundary_approved !==
      false ||
    decision.database_change_applied !==
      false ||
    decision.content_approved !== false ||
    decision.content_loaded !== false ||
    decision.cutover_enabled !== false ||
    decision.source_text_included !==
      false ||
    decision.source_excerpt_included !==
      false
  ) {
    errors.push(
      `${decision.segment_key}: application boundary differs`,
    )
  }
}

if (
  decisionIds.size !== 16 ||
  inspectionIds.size !== 16 ||
  segmentKeys.size !== 16
) {
  errors.push(
    'decision identifiers must be unique',
  )
}

for (
  const result of
  decisions.packet_results || []
) {
  if (
    !targetPacketIds.has(
      result.packet_id,
    ) ||
    result.pending_count !== 0 ||
    result.reviewed_count +
      result.unresolved_count !==
      result.item_count
  ) {
    errors.push(
      `${result.packet_id}: packet result differs`,
    )
  }
}

const preservedProgress = {
  item_count: 144,
  packet_count: 16,
  pending_count: 126,
  in_review_count: 0,
  public_decision_count: 18,
  completed_packet_count: 4,
  pending_packet_count: 12,
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
  progress.totals?.reviewed_count < 4 ||
  progress.totals?.unresolved_count > 14 ||
  progress.totals?.reviewed_count +
    progress.totals?.unresolved_count !==
    18
) {
  errors.push(
    'cumulative reviewed and unresolved totals are inconsistent',
  )
}

const pilotPacket =
  progress.packets.find(
    (packet) =>
      packet.packet_id ===
      pilot.packet_id,
  )

if (
  !pilotPacket ||
  pilotPacket.reviewed_count !== 2 ||
  pilotPacket.unresolved_count !== 0 ||
  pilotPacket.pending_count !== 0 ||
  pilotPacket.status !==
    'reviewed-not-applied'
) {
  errors.push(
    'pilot packet progress was not preserved',
  )
}

for (
  const packet of
  progress.packets || []
) {
  if (
    targetPacketIds.has(
      packet.packet_id,
    )
  ) {
    if (
      packet.pending_count !== 0 ||
      packet.reviewed_count +
        packet.unresolved_count !==
        packet.item_count
    ) {
      errors.push(
        `${packet.packet_id}: target packet progress differs`,
      )
    }
  } else if (
    packet.packet_id !==
      pilot.packet_id &&
    (
      packet.pending_count !==
        packet.item_count ||
      packet.reviewed_count !== 0 ||
      packet.unresolved_count !== 0 ||
      packet.status !== 'pending'
    )
  ) {
    errors.push(
      `${packet.packet_id}: non-target packet changed`,
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
  '"between_lines":',
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
    ?.cutover_enabled !== false ||
  register.packet_count !== 16 ||
  worklist.totals?.item_count !== 144
) {
  errors.push(
    'upstream worklist or database state changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'Container-intro review validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated 16 remaining container-intro decisions.',
)
console.log(
  `Reviewed outcomes: ${decisions.totals.reviewed_count}.`,
)
console.log(
  `Unresolved outcomes: ${decisions.totals.unresolved_count}.`,
)
console.log(
  'Validated 18 cumulative public decisions and 126 pending items.',
)
console.log(
  'Validated 4 completed and 12 pending packets.',
)
console.log(
  'No source text, boundary approval, database change, or cutover was introduced.',
)
