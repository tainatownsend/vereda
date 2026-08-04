import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { sha256LegacyCrlfFromText } from './hash_utils.mjs'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const normalizeNewlines = (value) =>
  String(value).replace(/\r\n?/g, '\n')

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const paths = {
  policy:
    'content/migration/reading-segment-mechanical-application-evidence-policy.json',
  plan:
    'content/migration/reading-segment-mechanical-application-plan.json',
  evidence:
    'content/migration/reading-segment-mechanical-application-evidence.json',
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
}

const [
  policy,
  plan,
  evidence,
  planBytes,
  preflightSql,
  applicationSql,
  verificationSql,
  preflightCsv,
  verificationCsv,
] = await Promise.all([
  readJson(paths.policy),
  readJson(paths.plan),
  readJson(paths.evidence),
  readFile(paths.plan, 'utf8'),
  readFile(paths.preflightSql, 'utf8').then(
    normalizeNewlines,
  ),
  readFile(paths.applicationSql, 'utf8').then(
    normalizeNewlines,
  ),
  readFile(paths.verificationSql, 'utf8').then(
    normalizeNewlines,
  ),
  readFile(paths.preflightCsv, 'utf8'),
  readFile(paths.verificationCsv, 'utf8'),
])

const errors = []

if (
  evidence.status !==
  'mechanical-boundaries-applied-and-verified'
) {
  errors.push(
    'evidence status is not applied-and-verified',
  )
}

if (
  evidence.policy_version !==
  policy.policy_version ||
  evidence.run_id !==
  policy.expected.migration_run_id ||
  evidence.plan_policy_version !==
  plan.policy_version
) {
  errors.push(
    'policy, plan, or migration identity differs',
  )
}

const expectedTotals = {
  staged_segment_count: 812,
  target_segment_count: 166,
  target_content_review_count: 166,
  target_boundary_review_count: 0,
  unaffected_boundary_review_count: 646,
  unaffected_content_review_count: 0,
  preflight_check_count: 19,
  verification_check_count: 20,
  application_audit_event_count: 1,
  content_row_count: 0,
  successor_mapping_count: 0,
  dependency_snapshot_count: 0,
  dry_run_result_count: 0,
  production_section_count: 908,
}

for (const [field, expected] of Object.entries(
  expectedTotals,
)) {
  if (evidence.totals?.[field] !== expected) {
    errors.push(
      `${field}: expected ${expected}; received ${evidence.totals?.[field]}`,
    )
  }
}

for (const check of [
  ...(evidence.preflight?.checks || []),
  ...(evidence.verification?.checks || []),
]) {
  if (
    check.passed !== true ||
    check.severity !== 'blocking'
  ) {
    errors.push(
      `${check.check_key}: evidence contains a failed or non-blocking check`,
    )
  }
}

const checksumInputs = {
  application_plan_sha256: {
    value: planBytes,
    hash: sha256LegacyCrlfFromText,
    compatibility: 'PR-0024/PR-0025 legacy CRLF-normalized historical evidence hash',
  },
  preflight_sql_sha256: {
    value: preflightSql,
    hash: sha256,
  },
  application_sql_sha256: {
    value: applicationSql,
    hash: sha256,
  },
  verification_sql_sha256: {
    value: verificationSql,
    hash: sha256,
  },
  preflight_csv_sha256: {
    value: preflightCsv,
    hash: sha256LegacyCrlfFromText,
    compatibility: 'PR-0025 legacy CRLF-normalized historical evidence hash',
  },
  verification_csv_sha256: {
    value: verificationCsv,
    hash: sha256LegacyCrlfFromText,
    compatibility: 'PR-0025 legacy CRLF-normalized historical evidence hash',
  },
}

for (const [field, input] of Object.entries(
  checksumInputs,
)) {
  if (
    evidence.checksums?.[field] !==
    input.hash(input.value)
  ) {
    errors.push(
      `${field}: checksum differs`,
    )
  }
}

if (
  evidence.application?.status !==
    'applied-once-and-audit-confirmed' ||
  evidence.application
    ?.content_approved !== false ||
  evidence.application
    ?.content_loaded !== false
) {
  errors.push(
    'application evidence state is invalid',
  )
}

const boundary =
  evidence.application_boundary || {}

for (const field of [
  'staging_status_updated',
  'boundary_decisions_applied',
]) {
  if (boundary[field] !== true) {
    errors.push(
      `${field} must be true`,
    )
  }
}

for (const field of [
  'content_approved',
  'content_loaded',
  'successor_mapping_created',
  'dependency_snapshot_captured',
  'production_modified',
  'progress_migrated',
  'reading_sessions_rewritten',
  'cutover_enabled',
]) {
  if (boundary[field] !== false) {
    errors.push(
      `${field} must remain false`,
    )
  }
}

if (errors.length) {
  console.error(
    'Mechanical boundary application-evidence validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated mechanical boundary application evidence.',
)
console.log(
  'Preflight checks: 19 passed.',
)
console.log(
  'Verification checks: 20 passed.',
)
console.log(
  '166 rows are in content-review; 646 remain in boundary-review.',
)
console.log(
  'Content, mappings, production, progress, sessions, and cutover remain unchanged.',
)
