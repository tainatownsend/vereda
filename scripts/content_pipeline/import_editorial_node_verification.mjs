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
  validateEditorialNodeVerification,
} from './editorial_node_verification_validation.mjs'

const inputArgument = process.argv[2]

if (!inputArgument) {
  console.error(
    'Usage: npm run content:staging:nodes:verify:import -- <csv-path>',
  )
  process.exit(1)
}

const inputPath = path.resolve(inputArgument)

if (path.extname(inputPath).toLowerCase() !== '.csv') {
  console.error(
    'The editorial-node verification export must be a CSV file.',
  )
  process.exit(1)
}

await access(inputPath)

const manifest = JSON.parse(
  await readFile(
    'content/migration/editorial-node-load-manifest.json',
    'utf8',
  ),
)
const inputBuffer = await readFile(inputPath)
const rows = normalizePreflightRows(
  parseCsv(inputBuffer.toString('utf8')),
)
const errors =
  validateEditorialNodeVerification({
    rows,
    manifest,
  })

const sha256 = createHash('sha256')
  .update(inputBuffer)
  .digest('hex')

const evidence = {
  schema_version: 1,
  status:
    errors.length === 0
      ? 'editorial-nodes-verified'
      : 'editorial-nodes-blocked',
  captured_at: new Date().toISOString(),
  migration_version:
    manifest.migration_version,
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
    editorial_node_count:
      manifest.totals.editorial_node_count,
    book_count: manifest.totals.book_count,
    reading_segment_count: 0,
    successor_mapping_count: 0,
    dependency_snapshot_count: 0,
    production_section_count:
      manifest.production_snapshot.row_count,
    contains_full_text: false,
    production_modified: false,
    cutover_enabled: false,
  },
  checks: rows,
  validation_errors: errors,
}

const evidencePath =
  'content/migration/editorial-node-load-evidence.json'
const reportPath =
  'content/migration/reports/editorial-node-load-verification.md'

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
  '# Editorial Node Staging Load Verification',
  '',
  `- Status: \`${evidence.status}\``,
  `- Captured at: \`${evidence.captured_at}\``,
  `- Migration version: \`${evidence.migration_version}\``,
  `- Run ID: \`${evidence.run_id}\``,
  `- Source CSV SHA-256: \`${sha256}\``,
  `- Editorial nodes: \`${evidence.summary.editorial_node_count}\``,
  `- Books: \`${evidence.summary.book_count}\``,
  `- Reading segments: \`0\``,
  `- Successor mappings: \`0\``,
  `- Dependency snapshots: \`0\``,
  `- Production sections: \`${evidence.summary.production_section_count}\``,
  `- Blocking failures: \`${evidence.summary.blocking_failure_count}\``,
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
    'The canonical editorial-node metadata load was verified.',
    '',
    'Reading segments, successor mappings, dependency snapshots, production content, progress, sessions, and cutover remain unchanged.',
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
    'Editorial-node verification is blocked:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Canonical editorial-node staging load verified.',
)
