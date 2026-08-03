import { createHash } from 'node:crypto'
import {
  access,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

import {
  normalizePreflightRows,
  parseCsv,
} from './staging_preflight_validation.mjs'
import {
  validateReadingSegmentApplication,
} from './reading_segment_application_validation.mjs'

const inputArgument = process.argv[2]

if (!inputArgument) {
  console.error(
    'Usage: npm run content:staging:segments:apply:import -- <csv-path>',
  )
  process.exit(1)
}

const inputPath = path.resolve(inputArgument)

if (path.extname(inputPath).toLowerCase() !== '.csv') {
  console.error(
    'The reading-segment verification export must be a CSV file.',
  )
  process.exit(1)
}

await access(inputPath)

const manifest = JSON.parse(
  await readFile(
    'content/migration/reading-segment-design-manifest.json',
    'utf8',
  ),
)
const inputBuffer = await readFile(inputPath)
const rows = normalizePreflightRows(
  parseCsv(inputBuffer.toString('utf8')),
)
const errors =
  validateReadingSegmentApplication({
    rows,
    manifest,
  })

const sha256 = createHash('sha256')
  .update(inputBuffer)
  .digest('hex')

const actualValue = (checkKey) =>
  rows.find(
    (row) => row.check_key === checkKey,
  )?.actual_value

const evidence = {
  schema_version: 1,
  status:
    errors.length === 0
      ? 'reading-segments-staged-and-verified'
      : 'reading-segment-application-blocked',
  captured_at: new Date().toISOString(),
  design_version: manifest.design_version,
  run_id: manifest.run_id,
  source_csv: {
    filename: path.basename(inputPath),
    sha256,
  },
  summary: {
    check_count: rows.length,
    blocking_failure_count: rows.filter(
      (row) => !row.passed,
    ).length,
    reading_segment_count: Number(
      actualValue('reading-segment-total'),
    ),
    book_count: manifest.totals.book_count,
    boundary_review_count: Number(
      actualValue('reading-segment-total'),
    ),
    content_row_count: Number(
      actualValue('content-remains-null'),
    ),
    successor_mapping_count: Number(
      actualValue('successor-mapping-count'),
    ),
    dependency_snapshot_count: Number(
      actualValue('dependency-snapshot-count'),
    ),
    production_section_count: Number(
      actualValue('production-section-count'),
    ),
    rights_status: actualValue(
      'rights-status',
    ),
    cutover_enabled: false,
  },
  checks: rows,
  validation_errors: errors,
}

const evidencePath =
  'content/migration/reading-segment-application-evidence.json'
const reportPath =
  'content/migration/reports/reading-segment-application-summary.md'

await mkdir(
  path.dirname(reportPath),
  { recursive: true },
)

await writeFile(
  evidencePath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
)

const lines = [
  '# Reading Segment Staging Application',
  '',
  `- Status: \`${evidence.status}\``,
  `- Captured at: \`${evidence.captured_at}\``,
  `- Design version: \`${evidence.design_version}\``,
  `- Run ID: \`${evidence.run_id}\``,
  `- Source CSV SHA-256: \`${sha256}\``,
  `- Reading segments: \`${evidence.summary.reading_segment_count}\``,
  `- Books: \`${evidence.summary.book_count}\``,
  `- Boundary-review rows: \`${evidence.summary.boundary_review_count}\``,
  `- Rows containing content: \`${evidence.summary.content_row_count}\``,
  `- Successor mappings: \`${evidence.summary.successor_mapping_count}\``,
  `- Dependency snapshots: \`${evidence.summary.dependency_snapshot_count}\``,
  `- Production sections: \`${evidence.summary.production_section_count}\``,
  `- Rights status: \`${evidence.summary.rights_status}\``,
  `- Blocking failures: \`${evidence.summary.blocking_failure_count}\``,
  `- Cutover enabled: \`false\``,
  '',
  '| Check | Passed | Actual value |',
  '| --- | --- | --- |',
  ...rows.map(
    (row) =>
      `| ${row.check_key} | ${row.passed} | ${row.actual_value || '—'} |`,
  ),
  '',
]

if (errors.length) {
  lines.push(
    '## Blocking validation errors',
    '',
    ...errors.map((error) => `- ${error}`),
    '',
  )
} else {
  lines.push(
    '## Decision',
    '',
    'The content-free reading-segment boundary metadata was applied and verified in the private staging schema.',
    '',
    'All rows remain in boundary review. Content, mappings, dependency snapshots, production data, progress, sessions, rights approval, and cutover remain unchanged.',
    '',
  )
}

await writeFile(
  reportPath,
  `${lines.join('\n')}\n`,
  'utf8',
)

console.log(`Evidence: ${evidencePath}`)
console.log(`Summary: ${reportPath}`)

if (errors.length) {
  console.error(
    'Reading-segment application is blocked:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Content-free reading-segment staging application verified.',
)
