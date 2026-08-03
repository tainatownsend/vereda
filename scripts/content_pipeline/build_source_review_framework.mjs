import { createHash } from 'node:crypto'
import {
  readFile,
  writeFile,
} from 'node:fs/promises'

const paths = {
  policy:
    'content/migration/reading-segment-source-review-policy.json',
  decisionSchema:
    'content/migration/reading-segment-source-review-decision-schema.json',
  inspectionManifest:
    'content/migration/reading-segment-source-inspection-manifest.json',
  inspectionPackets:
    'content/migration/reading-segment-source-inspection-packets.json',
  applicationEvidence:
    'content/migration/reading-segment-mechanical-application-evidence.json',
  worklist:
    'content/migration/reading-segment-source-review-worklist.json',
  worklistCsv:
    'content/migration/reading-segment-source-review-worklist.csv',
  packetRegister:
    'content/migration/reading-segment-source-review-packet-register.json',
  report:
    'content/migration/reports/reading-segment-source-review-framework-summary.md',
}

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const sha256File = async (filePath) =>
  sha256(await readFile(filePath))

const decisionId = (
  runId,
  inspectionId,
  policyVersion,
) =>
  sha256(
    [
      runId,
      inspectionId,
      policyVersion,
    ].join('|'),
  ).slice(0, 24)

const csvCell = (value) => {
  const normalized =
    value === null ||
    value === undefined
      ? ''
      : Array.isArray(value)
        ? value.join('|')
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)

  return `"${normalized.replaceAll('"', '""')}"`
}

const [
  policy,
  decisionSchema,
  inspectionManifest,
  inspectionPackets,
  applicationEvidence,
] = await Promise.all([
  readJson(paths.policy),
  readJson(paths.decisionSchema),
  readJson(paths.inspectionManifest),
  readJson(paths.inspectionPackets),
  readJson(paths.applicationEvidence),
])

if (
  policy.status !==
    'accepted-for-review-framework' ||
  decisionSchema.policy_version !==
    policy.policy_version
) {
  throw new Error(
    'Source-review policy or decision schema is unavailable.',
  )
}

const packetByInspectionId = new Map()

for (
  const packet of
  inspectionPackets.packets || []
) {
  for (
    const inspectionId of
    packet.inspection_ids || []
  ) {
    if (
      packetByInspectionId.has(
        inspectionId,
      )
    ) {
      throw new Error(
        `Inspection ${inspectionId} belongs to more than one packet.`,
      )
    }

    packetByInspectionId.set(
      inspectionId,
      packet.packet_id,
    )
  }
}

const items = (
  inspectionManifest.items || []
).map((inspection) => {
  const packetId =
    packetByInspectionId.get(
      inspection.inspection_id,
    )

  if (!packetId) {
    throw new Error(
      `${inspection.inspection_id}: packet assignment is missing.`,
    )
  }

  const requiredEvidence =
    policy.evidence_requirements[
      inspection.inspection_lane
    ]

  if (!requiredEvidence) {
    throw new Error(
      `${inspection.segment_key}: unknown inspection lane.`,
    )
  }

  return {
    decision_id: decisionId(
      inspection.run_id,
      inspection.inspection_id,
      policy.policy_version,
    ),
    inspection_id:
      inspection.inspection_id,
    packet_id: packetId,
    run_id: inspection.run_id,
    policy_version:
      policy.policy_version,
    book_id: inspection.book_id,
    book_slug: inspection.book_slug,
    segment_key:
      inspection.segment_key,
    segment_order:
      inspection.segment_order,
    display_title:
      inspection.display_title,
    inspection_lane:
      inspection.inspection_lane,
    review_reasons:
      inspection.review_reasons,
    decision_options:
      inspection.decision_options,
    required_evidence:
      requiredEvidence,
    source_reference: {
      review_page_start:
        inspection.source_reference
          ?.review_page_start ??
        null,
      review_page_end:
        inspection.source_reference
          ?.review_page_end ??
        null,
      current_source_pdf_page:
        inspection.source_reference
          ?.current
          ?.source_pdf_page ??
        null,
      current_printed_page:
        inspection.source_reference
          ?.current
          ?.printed_page ??
        null,
      successor_source_pdf_page:
        inspection.source_reference
          ?.successor
          ?.source_pdf_page ??
        null,
      successor_printed_page:
        inspection.source_reference
          ?.successor
          ?.printed_page ??
        null,
      same_source_pdf_page:
        inspection.source_reference
          ?.same_source_pdf_page ??
        false,
      same_printed_page:
        inspection.source_reference
          ?.same_printed_page ??
        false,
    },
    context_reference: {
      previous_segment_key:
        inspection.context?.previous
          ?.segment_key ??
        null,
      current_segment_key:
        inspection.segment_key,
      successor_segment_key:
        inspection.context?.successor
          ?.segment_key ??
        null,
    },
    review_status: 'pending',
    selected_decision: null,
    evidence: {
      source_pdf_page_reviewed:
        null,
      printed_page_reviewed:
        null,
      visible_prose_presence:
        null,
      successor_anchor_type:
        null,
      locator_type: null,
      locator_value: null,
      source_reference_only: true,
    },
    reviewer_confidence: null,
    review_completed_at: null,
    source_text_included: false,
    source_excerpt_included: false,
    boundary_decision_recorded:
      false,
    boundary_approved: false,
    database_change_applied:
      false,
    content_approved: false,
    content_loaded: false,
    cutover_enabled: false,
  }
})

items.sort(
  (left, right) =>
    left.packet_id.localeCompare(
      right.packet_id,
    ) ||
    left.segment_order -
      right.segment_order ||
    left.segment_key.localeCompare(
      right.segment_key,
    ),
)

const decisionIds = new Set(
  items.map(
    (item) => item.decision_id,
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
  decisionIds.size !== 144 ||
  inspectionIds.size !== 144 ||
  segmentKeys.size !== 144
) {
  throw new Error(
    'Source-review worklist must contain 144 unique records.',
  )
}

const packetRegister = (
  inspectionPackets.packets || []
).map((packet) => {
  const packetItems = items.filter(
    (item) =>
      item.packet_id ===
      packet.packet_id,
  )

  return {
    packet_id: packet.packet_id,
    inspection_lane:
      packet.inspection_lane,
    book_id: packet.book_id,
    packet_number:
      packet.packet_number,
    item_count:
      packetItems.length,
    source_pdf_page_start:
      packet.source_pdf_page_start,
    source_pdf_page_end:
      packet.source_pdf_page_end,
    pending_count:
      packetItems.length,
    in_review_count: 0,
    reviewed_count: 0,
    unresolved_count: 0,
    decision_ids:
      packetItems.map(
        (item) =>
          item.decision_id,
      ),
    inspection_ids:
      packetItems.map(
        (item) =>
          item.inspection_id,
      ),
    segment_keys:
      packetItems.map(
        (item) =>
          item.segment_key,
      ),
  }
})

const worklist = {
  schema_version: 1,
  status:
    'source-review-framework-prepared-not-reviewed',
  policy_version:
    policy.policy_version,
  run_id:
    inspectionManifest.run_id,
  rights_status:
    inspectionManifest.rights_status,
  contains_full_text: false,
  inputs: {
    policy_sha256:
      await sha256File(paths.policy),
    decision_schema_sha256:
      await sha256File(
        paths.decisionSchema,
      ),
    inspection_manifest_sha256:
      await sha256File(
        paths.inspectionManifest,
      ),
    inspection_packets_sha256:
      await sha256File(
        paths.inspectionPackets,
      ),
    mechanical_application_evidence_sha256:
      await sha256File(
        paths.applicationEvidence,
      ),
  },
  totals: {
    item_count: items.length,
    packet_count:
      packetRegister.length,
    pending_count: items.length,
    in_review_count: 0,
    reviewed_count: 0,
    unresolved_count: 0,
    public_decision_count: 0,
    source_text_reviewed_count: 0,
    completed_mechanical_count:
      applicationEvidence.totals
        .target_content_review_count,
    remaining_boundary_review_count:
      applicationEvidence.totals
        .unaffected_boundary_review_count,
    structural_review_count:
      inspectionManifest.totals
        .structural_review_count,
    size_review_count:
      inspectionManifest.totals
        .size_review_count,
    database_change_count: 0,
  },
  items,
  review_boundary:
    policy.review_boundary,
}

const packetRegisterDocument = {
  schema_version: 1,
  status:
    'source-review-packet-register-prepared',
  policy_version:
    policy.policy_version,
  run_id:
    inspectionManifest.run_id,
  packet_count:
    packetRegister.length,
  item_count: items.length,
  packets: packetRegister,
  review_status_counts: {
    pending: items.length,
    'in-review': 0,
    reviewed: 0,
    unresolved: 0,
  },
  source_text_included: false,
  decisions_recorded: false,
}

const csvHeaders = [
  'decision_id',
  'inspection_id',
  'packet_id',
  'book_id',
  'book_slug',
  'segment_key',
  'segment_order',
  'display_title',
  'inspection_lane',
  'review_reasons',
  'decision_options',
  'required_evidence',
  'review_page_start',
  'review_page_end',
  'current_printed_page',
  'successor_printed_page',
  'review_status',
  'selected_decision',
  'source_pdf_page_reviewed',
  'printed_page_reviewed',
  'visible_prose_presence',
  'successor_anchor_type',
  'locator_type',
  'locator_value',
  'reviewer_confidence',
  'review_completed_at',
]

const csvRows = items.map((item) => [
  item.decision_id,
  item.inspection_id,
  item.packet_id,
  item.book_id,
  item.book_slug,
  item.segment_key,
  item.segment_order,
  item.display_title,
  item.inspection_lane,
  item.review_reasons,
  item.decision_options,
  item.required_evidence,
  item.source_reference
    .review_page_start,
  item.source_reference
    .review_page_end,
  item.source_reference
    .current_printed_page,
  item.source_reference
    .successor_printed_page,
  item.review_status,
  item.selected_decision,
  item.evidence
    .source_pdf_page_reviewed,
  item.evidence
    .printed_page_reviewed,
  item.evidence
    .visible_prose_presence,
  item.evidence
    .successor_anchor_type,
  item.evidence.locator_type,
  item.evidence.locator_value,
  item.reviewer_confidence,
  item.review_completed_at,
])

const csv = [
  csvHeaders.map(csvCell).join(','),
  ...csvRows.map(
    (row) =>
      row.map(csvCell).join(','),
  ),
].join('\n')

const laneCounts = Object.fromEntries(
  Object.keys(
    policy.evidence_requirements,
  ).map((lane) => [
    lane,
    items.filter(
      (item) =>
        item.inspection_lane === lane,
    ).length,
  ]),
)

const report = `# Source Review Decision Framework

- Status: \`${worklist.status}\`
- Policy version: \`${worklist.policy_version}\`
- Migration run ID: \`${worklist.run_id}\`
- Review items: \`${worklist.totals.item_count}\`
- Review packets: \`${worklist.totals.packet_count}\`
- Pending decisions: \`${worklist.totals.pending_count}\`
- Recorded public decisions: \`${worklist.totals.public_decision_count}\`
- Source text reviewed: \`${worklist.totals.source_text_reviewed_count}\`
- Completed mechanical cases preserved: \`${worklist.totals.completed_mechanical_count}\`
- Remaining boundary-review rows preserved: \`${worklist.totals.remaining_boundary_review_count}\`
- Structural-review cases preserved: \`${worklist.totals.structural_review_count}\`
- Size-review cases preserved: \`${worklist.totals.size_review_count}\`
- Database changes: \`${worklist.totals.database_change_count}\`
- Cutover enabled: \`false\`

## Worklist by inspection lane

| Inspection lane | Pending items |
| --- | ---: |
${Object.entries(laneCounts)
  .map(
    ([lane, count]) =>
      `| ${lane} | ${count} |`,
  )
  .join('\n')}

## Generated artifacts

- structured JSON worklist;
- CSV worklist without source text;
- packet progress register;
- private local workspace bootstrap;
- decision schema and public-field allowlist.

## Decision

PR-0027 defines how future source-review decisions will be recorded.

It does not inspect the source editions, record a public decision, approve a boundary, or modify the database.
`

await Promise.all([
  writeFile(
    paths.worklist,
    `${JSON.stringify(
      worklist,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.worklistCsv,
    `${csv}\n`,
    'utf8',
  ),
  writeFile(
    paths.packetRegister,
    `${JSON.stringify(
      packetRegisterDocument,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.report,
    `${report}\n`,
    'utf8',
  ),
])

console.log(
  `Prepared ${items.length} pending source-review records.`,
)
console.log(
  `Prepared ${packetRegister.length} packet register entries.`,
)
console.log(
  'Public decisions recorded: 0.',
)
console.log(
  'Source text included: 0.',
)
console.log(
  'Database changes: 0.',
)
