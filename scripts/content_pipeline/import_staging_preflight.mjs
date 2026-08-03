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
  validatePreflight,
} from './staging_preflight_validation.mjs'

const inputArgument = process.argv[2]

if (!inputArgument) {
  console.error(
    'Usage: npm run content:staging:preflight:import -- <csv-path>',
  )
  process.exit(1)
}

const inputPath = path.resolve(inputArgument)

if (path.extname(inputPath).toLowerCase() !== '.csv') {
  console.error('The preflight export must be a CSV file.')
  process.exit(1)
}

await access(inputPath)

const snapshotMetadataPath = path.resolve(
  'content/structure/current/snapshot-metadata.json',
)
const snapshotMetadata = JSON.parse(
  await readFile(snapshotMetadataPath, 'utf8'),
)

const inputBuffer = await readFile(inputPath)
const csvText = inputBuffer.toString('utf8')
const rows = normalizePreflightRows(
  parseCsv(csvText),
)
const validation = validatePreflight({
  rows,
  expectedSectionCount: snapshotMetadata.row_count,
})

const sha256 = createHash('sha256')
  .update(inputBuffer)
  .digest('hex')

const blockingCheckCount = rows.filter(
  (row) => row.severity === 'blocking',
).length

const evidence = {
  schema_version: 1,
  status:
    validation.errors.length === 0
      ? 'preflight-passed'
      : 'preflight-blocked',
  captured_at: new Date().toISOString(),
  source_csv: {
    filename: path.basename(inputPath),
    sha256,
  },
  expected_snapshot: {
    row_count: snapshotMetadata.row_count,
    sha256: snapshotMetadata.sha256,
  },
  summary: {
    check_count: rows.length,
    blocking_check_count: blockingCheckCount,
    blocking_failure_count:
      validation.blockingFailures.length,
    production_section_count:
      validation.productionSectionCount,
    snapshot_row_count_matches:
      validation.snapshotRowCountMatches,
    contains_user_identifiers: false,
  },
  checks: rows,
  validation_errors: validation.errors,
}

const outputDirectory = path.resolve(
  'content/migration',
)
const reportDirectory = path.resolve(
  'content/migration/reports',
)
const evidencePath = path.join(
  outputDirectory,
  'staging-preflight-evidence.json',
)
const reportPath = path.join(
  reportDirectory,
  'staging-preflight-summary.md',
)

await mkdir(reportDirectory, { recursive: true })

await writeFile(
  evidencePath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
)

const lines = [
  '# Staging Application Preflight',
  '',
  `- Status: \`${evidence.status}\``,
  `- Captured at: \`${evidence.captured_at}\``,
  `- Source CSV SHA-256: \`${sha256}\``,
  `- Expected production sections: \`${snapshotMetadata.row_count}\``,
  `- Actual production sections: \`${validation.productionSectionCount}\``,
  `- Blocking failures: \`${validation.blockingFailures.length}\``,
  `- Contains user identifiers: \`false\``,
  '',
  '| Check | Severity | Passed | Actual value |',
  '| --- | --- | --- | --- |',
  ...rows.map(
    (row) =>
      `| ${row.check_key} | ${row.severity} | ${row.passed} | ${row.actual_value || '—'} |`,
  ),
  '',
]

if (validation.errors.length) {
  lines.push(
    '## Blocking validation errors',
    '',
    ...validation.errors.map((error) => `- ${error}`),
    '',
  )
} else {
  lines.push(
    '## Decision',
    '',
    'The read-only production preflight passed.',
    '',
    'This evidence does not apply the staging migration. Database application remains a separate explicit step.',
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

if (validation.errors.length) {
  console.error()
  console.error('Preflight is blocked:')

  for (const error of validation.errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Read-only production preflight passed. No migration was applied.',
)
