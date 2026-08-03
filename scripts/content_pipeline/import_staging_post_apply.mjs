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
  validatePostApply,
} from './staging_post_apply_validation.mjs'

const inputArgument = process.argv[2]

if (!inputArgument) {
  console.error(
    'Usage: npm run content:staging:post-apply:import -- <csv-path>',
  )
  process.exit(1)
}

const inputPath = path.resolve(inputArgument)

if (path.extname(inputPath).toLowerCase() !== '.csv') {
  console.error(
    'The post-application verification export must be a CSV file.',
  )
  process.exit(1)
}

await access(inputPath)

const inputBuffer = await readFile(inputPath)
const rows = normalizePreflightRows(
  parseCsv(inputBuffer.toString('utf8')),
)
const validation = validatePostApply({
  rows,
  expectedSectionCount: 908,
})

const sha256 = createHash('sha256')
  .update(inputBuffer)
  .digest('hex')

const evidence = {
  schema_version: 1,
  status:
    validation.errors.length === 0
      ? 'staging-foundation-verified'
      : 'staging-foundation-blocked',
  captured_at: new Date().toISOString(),
  source_csv: {
    filename: path.basename(inputPath),
    sha256,
  },
  summary: {
    check_count: rows.length,
    blocking_failure_count: rows.filter(
      (row) => !row.passed,
    ).length,
    production_section_count:
      validation.sectionCount,
    staging_row_count:
      validation.stagingRowCount,
    application_roles_denied:
      validation.applicationRolesDenied,
    service_role_has_usage:
      validation.serviceRoleHasUsage,
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
  'staging-post-apply-evidence.json',
)
const reportPath = path.join(
  reportDirectory,
  'staging-post-apply-summary.md',
)

await mkdir(reportDirectory, { recursive: true })

await writeFile(
  evidencePath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
)

const lines = [
  '# Private Staging Post-Application Verification',
  '',
  `- Status: \`${evidence.status}\``,
  `- Captured at: \`${evidence.captured_at}\``,
  `- Source CSV SHA-256: \`${sha256}\``,
  `- Production sections: \`${validation.sectionCount}\``,
  `- Staging rows: \`${validation.stagingRowCount}\``,
  `- Application roles denied: \`${validation.applicationRolesDenied}\``,
  `- Service role has usage: \`${validation.serviceRoleHasUsage}\``,
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
    'The private `content_staging` foundation was applied and verified.',
    '',
    'The schema is empty, application roles are denied, production still contains 908 sections, and no cutover is enabled.',
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
  console.error(
    'Post-application verification is blocked:',
  )

  for (const error of validation.errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Private content-staging foundation verified.',
)
console.log(
  'Production content remains unchanged and cutover remains disabled.',
)
