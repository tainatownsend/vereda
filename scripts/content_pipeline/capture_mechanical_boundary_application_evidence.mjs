import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'
import { resolve } from 'node:path'

const [
  preflightInput,
  verificationInput,
] = process.argv.slice(2)

if (!preflightInput || !verificationInput) {
  console.error(
    'Usage: npm run content:staging:segments:mechanical:application:evidence:capture -- <preflight.csv> <verification.csv>',
  )
  process.exit(1)
}

const paths = {
  policy:
    'content/migration/reading-segment-mechanical-application-evidence-policy.json',
  plan:
    'content/migration/reading-segment-mechanical-application-plan.json',
  preflightSql:
    'supabase/audits/mechanical_boundary_application_preflight.sql',
  applicationSql:
    'supabase/staging/20260803110000_apply_mechanical_boundary_decisions_v1.sql',
  verificationSql:
    'supabase/audits/mechanical_boundary_application_verification.sql',
  preflightCsv:
    'content/migration/evidence/mechanical-boundary-application-preflight.csv',
  verificationCsv:
    'content/migration/evidence/mechanical-boundary-application-verification.csv',
  evidence:
    'content/migration/reading-segment-mechanical-application-evidence.json',
  report:
    'content/migration/reports/reading-segment-mechanical-application-evidence-summary.md',
}

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const normalizeNewlines = (value) =>
  value.replace(/\r\n?/g, '\n')

const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (
        character === '"' &&
        text[index + 1] === '"'
      ) {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }

      continue
    }

    if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (quoted) {
    throw new Error(
      'CSV contains an unterminated quoted field.',
    )
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const nonEmptyRows = rows.filter(
    (values) =>
      values.some(
        (value) => value.trim().length > 0,
      ),
  )

  if (nonEmptyRows.length < 2) {
    throw new Error(
      'CSV must contain a header and result rows.',
    )
  }

  const headers = nonEmptyRows[0].map(
    (header) => header.trim(),
  )
  const requiredHeaders = [
    'check_key',
    'severity',
    'passed',
    'actual_value',
    'details',
  ]

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(
        `CSV is missing required column: ${required}`,
      )
    }
  }

  return nonEmptyRows.slice(1).map(
    (values, rowIndex) => {
      if (values.length !== headers.length) {
        throw new Error(
          `CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}.`,
        )
      }

      return Object.fromEntries(
        headers.map((header, index) => [
          header,
          values[index],
        ]),
      )
    },
  )
}

const normalizePassed = (value) =>
  ['true', 't', '1', 'yes'].includes(
    String(value).trim().toLowerCase(),
  )

const expectedKeysFromSql = (sql) => [
  ...sql.matchAll(
    /'([^']+)'::text as check_key/g,
  ),
].map((match) => match[1])

const validateRows = ({
  label,
  rows,
  expectedCount,
  expectedKeys,
}) => {
  const errors = []
  const keys = rows.map(
    (row) => row.check_key.trim(),
  )
  const uniqueKeys = new Set(keys)

  if (rows.length !== expectedCount) {
    errors.push(
      `${label}: expected ${expectedCount} rows; received ${rows.length}`,
    )
  }

  if (uniqueKeys.size !== rows.length) {
    errors.push(
      `${label}: duplicate check keys detected`,
    )
  }

  const sorted = (values) =>
    [...values].sort()

  if (
    JSON.stringify(sorted(keys)) !==
    JSON.stringify(sorted(expectedKeys))
  ) {
    errors.push(
      `${label}: exported check keys differ from the committed SQL`,
    )
  }

  for (const row of rows) {
    if (row.severity.trim() !== 'blocking') {
      errors.push(
        `${label}/${row.check_key}: severity is not blocking`,
      )
    }

    if (!normalizePassed(row.passed)) {
      errors.push(
        `${label}/${row.check_key}: check did not pass; actual=${row.actual_value}`,
      )
    }
  }

  if (errors.length) {
    throw new Error(errors.join('\n'))
  }

  return rows.map((row) => ({
    check_key: row.check_key.trim(),
    severity: row.severity.trim(),
    passed: true,
    actual_value: row.actual_value,
    details: row.details,
  }))
}

const checkActual = (
  rows,
  key,
  expectedValue,
) => {
  const row = rows.find(
    (candidate) =>
      candidate.check_key === key,
  )

  if (!row) {
    throw new Error(
      `Verification is missing check: ${key}`,
    )
  }

  if (
    String(row.actual_value).trim() !==
    String(expectedValue)
  ) {
    throw new Error(
      `${key}: expected actual_value=${expectedValue}; received ${row.actual_value}`,
    )
  }
}

const policy = await readJson(paths.policy)
const plan = await readJson(paths.plan)

const [
  preflightSql,
  applicationSql,
  verificationSql,
  preflightBytes,
  verificationBytes,
] = await Promise.all([
  readFile(paths.preflightSql, 'utf8').then(
    normalizeNewlines,
  ),
  readFile(paths.applicationSql, 'utf8').then(
    normalizeNewlines,
  ),
  readFile(paths.verificationSql, 'utf8').then(
    normalizeNewlines,
  ),
  readFile(resolve(preflightInput)),
  readFile(resolve(verificationInput)),
])

const preflightText = normalizeNewlines(
  preflightBytes.toString('utf8'),
)
const verificationText = normalizeNewlines(
  verificationBytes.toString('utf8'),
)

const preflightRows = validateRows({
  label: 'preflight',
  rows: parseCsv(preflightText),
  expectedCount:
    policy.expected.preflight_check_count,
  expectedKeys:
    expectedKeysFromSql(preflightSql),
})

const verificationRows = validateRows({
  label: 'verification',
  rows: parseCsv(verificationText),
  expectedCount:
    policy.expected.verification_check_count,
  expectedKeys:
    expectedKeysFromSql(verificationSql),
})

checkActual(
  verificationRows,
  'target-content-review-count',
  policy.expected.target_segment_count,
)
checkActual(
  verificationRows,
  'target-boundary-review-count',
  0,
)
checkActual(
  verificationRows,
  'non-target-boundary-review-count',
  policy.expected.unaffected_segment_count,
)
checkActual(
  verificationRows,
  'non-target-content-review-count',
  0,
)
checkActual(
  verificationRows,
  'content-remains-null',
  0,
)
checkActual(
  verificationRows,
  'application-audit-event-count',
  policy.expected.application_audit_event_count,
)
checkActual(
  verificationRows,
  'successor-mapping-count',
  policy.expected.successor_mapping_count,
)
checkActual(
  verificationRows,
  'dependency-snapshot-count',
  policy.expected.dependency_snapshot_count,
)
checkActual(
  verificationRows,
  'dry-run-result-count',
  policy.expected.dry_run_result_count,
)
checkActual(
  verificationRows,
  'production-section-count',
  policy.expected.production_section_count,
)

await mkdir(
  'content/migration/evidence',
  { recursive: true },
)

await Promise.all([
  copyFile(
    resolve(preflightInput),
    paths.preflightCsv,
  ),
  copyFile(
    resolve(verificationInput),
    paths.verificationCsv,
  ),
])

const capturedPreflight = await readFile(
  paths.preflightCsv,
)
const capturedVerification = await readFile(
  paths.verificationCsv,
)

const evidence = {
  schema_version: 1,
  status:
    'mechanical-boundaries-applied-and-verified',
  policy_version:
    policy.policy_version,
  run_id:
    policy.expected.migration_run_id,
  plan_policy_version:
    plan.policy_version,
  captured_at:
    new Date().toISOString(),
  totals: {
    staged_segment_count:
      policy.expected.staged_segment_count,
    target_segment_count:
      policy.expected.target_segment_count,
    target_content_review_count:
      policy.expected.target_segment_count,
    target_boundary_review_count: 0,
    unaffected_boundary_review_count:
      policy.expected.unaffected_segment_count,
    unaffected_content_review_count: 0,
    preflight_check_count:
      preflightRows.length,
    verification_check_count:
      verificationRows.length,
    application_audit_event_count:
      policy.expected
        .application_audit_event_count,
    content_row_count:
      policy.expected.content_row_count,
    successor_mapping_count:
      policy.expected.successor_mapping_count,
    dependency_snapshot_count:
      policy.expected
        .dependency_snapshot_count,
    dry_run_result_count:
      policy.expected.dry_run_result_count,
    production_section_count:
      policy.expected.production_section_count,
  },
  checksums: {
    application_plan_sha256:
      sha256(
        await readFile(paths.plan),
      ),
    preflight_sql_sha256:
      sha256(preflightSql),
    application_sql_sha256:
      sha256(applicationSql),
    verification_sql_sha256:
      sha256(verificationSql),
    preflight_csv_sha256:
      sha256(capturedPreflight),
    verification_csv_sha256:
      sha256(capturedVerification),
  },
  preflight: {
    status: 'passed',
    check_count:
      preflightRows.length,
    checks: preflightRows,
  },
  application: {
    status:
      'applied-once-and-audit-confirmed',
    planned_transition: {
      from: 'boundary-review',
      to: 'content-review',
      target_count:
        policy.expected.target_segment_count,
    },
    database_application_authorized:
      true,
    content_approved: false,
    content_loaded: false,
  },
  verification: {
    status: 'passed',
    check_count:
      verificationRows.length,
    checks: verificationRows,
  },
  application_boundary: {
    staging_status_updated: true,
    boundary_decisions_applied: true,
    content_approved: false,
    content_loaded: false,
    successor_mapping_created: false,
    dependency_snapshot_captured: false,
    production_modified: false,
    progress_migrated: false,
    reading_sessions_rewritten: false,
    cutover_enabled: false,
  },
}

const report = `# Mechanical Boundary Application Evidence

- Status: \`${evidence.status}\`
- Policy version: \`${evidence.policy_version}\`
- Migration run ID: \`${evidence.run_id}\`
- Captured at: \`${evidence.captured_at}\`
- Preflight checks passed: \`${evidence.totals.preflight_check_count}\`
- Verification checks passed: \`${evidence.totals.verification_check_count}\`
- Target rows moved to content-review: \`${evidence.totals.target_content_review_count}\`
- Target rows remaining in boundary-review: \`${evidence.totals.target_boundary_review_count}\`
- Unaffected rows remaining in boundary-review: \`${evidence.totals.unaffected_boundary_review_count}\`
- Application audit events: \`${evidence.totals.application_audit_event_count}\`
- Content rows: \`${evidence.totals.content_row_count}\`
- Successor mappings: \`${evidence.totals.successor_mapping_count}\`
- Dependency snapshots: \`${evidence.totals.dependency_snapshot_count}\`
- Dry-run results: \`${evidence.totals.dry_run_result_count}\`
- Production sections: \`${evidence.totals.production_section_count}\`
- Cutover enabled: \`false\`

## Applied transition

\`\`\`text
166 rows: boundary-review -> content-review
646 rows: remain in boundary-review
\`\`\`

## Evidence

The committed evidence includes the exact CSV exports from the read-only
preflight and post-application verification queries.

Every preflight and verification check passed.

## Preserved boundaries

The application changed only the private staging review status and audit
metadata.

It did not approve or load content, create successor mappings, capture
dependency snapshots, modify production, migrate progress, rewrite reading
sessions, or enable cutover.
`

await Promise.all([
  writeFile(
    paths.evidence,
    `${JSON.stringify(
      evidence,
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
  `Captured ${preflightRows.length} passing preflight checks.`,
)
console.log(
  `Captured ${verificationRows.length} passing verification checks.`,
)
console.log(
  'Confirmed 166 content-review rows and 646 unaffected boundary-review rows.',
)
console.log(
  `Evidence manifest: ${paths.evidence}`,
)
