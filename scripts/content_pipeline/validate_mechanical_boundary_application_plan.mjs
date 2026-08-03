import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const normalizeNewlines = (value) =>
  value.replace(/\r\n?/g, '\n')

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const [
  policy,
  decisions,
  accepted,
  application,
  plan,
] = await Promise.all([
  readJson(
    'content/migration/reading-segment-mechanical-application-policy.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-review-decisions.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-review-accepted.json',
  ),
  readJson(
    'content/migration/reading-segment-application-evidence.json',
  ),
  readJson(
    'content/migration/reading-segment-mechanical-application-plan.json',
  ),
])

const [
  preflightSql,
  applicationSql,
  verificationSql,
] = await Promise.all([
  readFile(
    policy.planned_artifacts.preflight_sql,
    'utf8',
  ).then(normalizeNewlines),
  readFile(
    policy.planned_artifacts.application_sql,
    'utf8',
  ).then(normalizeNewlines),
  readFile(
    policy.planned_artifacts.verification_sql,
    'utf8',
  ).then(normalizeNewlines),
])

const errors = []

if (
  plan.status !== 'planned-not-applied'
) {
  errors.push(
    'plan status must be planned-not-applied',
  )
}

if (
  plan.policy_version !==
  policy.policy_version
) {
  errors.push(
    'application policy version differs',
  )
}

if (
  plan.run_id !== decisions.run_id ||
  plan.run_id !== accepted.run_id ||
  plan.run_id !== application.run_id
) {
  errors.push('migration run IDs differ')
}

if (
  plan.totals?.staged_segment_count !== 812 ||
  plan.totals?.accepted_decision_count !== 166 ||
  plan.totals?.target_segment_count !== 166 ||
  plan.totals?.unaffected_segment_count !== 646 ||
  plan.targets?.length !== 166
) {
  errors.push(
    'application plan totals are invalid',
  )
}

if (
  plan.totals?.preflight_check_count !== 19 ||
  plan.totals?.verification_check_count !== 20
) {
  errors.push(
    'expected 19 preflight and 20 verification checks',
  )
}

const segmentKeys = new Set()
const decisionIds = new Set()
const resolutionIds = new Set()

for (const target of plan.targets || []) {
  segmentKeys.add(target.segment_key)
  decisionIds.add(target.decision_id)
  resolutionIds.add(target.resolution_id)

  if (
    target.book_id !== 3 ||
    target.run_id !== plan.run_id
  ) {
    errors.push(
      `${target.segment_key}: unexpected target identity`,
    )
  }

  if (
    !target.expected_start_locator ||
    !target.expected_end_next_start_locator ||
    !target.expected_successor_segment_key
  ) {
    errors.push(
      `${target.segment_key}: incomplete expected locator evidence`,
    )
  }
}

if (
  segmentKeys.size !== 166 ||
  decisionIds.size !== 166 ||
  resolutionIds.size !== 166
) {
  errors.push(
    'target identifiers must be unique',
  )
}

for (const [
  field,
  value,
] of Object.entries(
  plan.application_boundary || {},
)) {
  if (
    field === 'plan_generated' ||
    field === 'sql_generated'
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
  sha256(preflightSql) !==
  plan.artifacts.preflight_sql_sha256
) {
  errors.push(
    'preflight SQL checksum differs',
  )
}

if (
  sha256(applicationSql) !==
  plan.artifacts.application_sql_sha256
) {
  errors.push(
    'application SQL checksum differs',
  )
}

if (
  sha256(verificationSql) !==
  plan.artifacts.verification_sql_sha256
) {
  errors.push(
    'verification SQL checksum differs',
  )
}

const preflightMarkers =
  preflightSql.match(
    /'blocking'::text as severity/g,
  ) || []
const verificationMarkers =
  verificationSql.match(
    /'blocking'::text as severity/g,
  ) || []

if (preflightMarkers.length !== 19) {
  errors.push(
    'preflight SQL must contain 19 blocking checks',
  )
}

if (verificationMarkers.length !== 20) {
  errors.push(
    'verification SQL must contain 20 blocking checks',
  )
}

const mutationPattern =
  /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\b/i

if (mutationPattern.test(preflightSql)) {
  errors.push(
    'preflight SQL must be read-only',
  )
}

if (mutationPattern.test(verificationSql)) {
  errors.push(
    'verification SQL must be read-only',
  )
}

for (const marker of [
  'begin;',
  'update content_staging.reading_segments',
  "approval_status = 'content-review'",
  "'mechanical-boundary-decisions-applied'",
  'commit;',
]) {
  if (!applicationSql.includes(marker)) {
    errors.push(
      `application SQL missing marker: ${marker}`,
    )
  }
}

for (const forbidden of [
  'set content =',
  'set word_count =',
  'set normalized_content_sha256 =',
  'insert into public.',
  'update public.',
  'delete from public.',
  'truncate public.',
  'alter table public.',
  'drop table public.',
]) {
  if (
    applicationSql
      .toLowerCase()
      .includes(forbidden.toLowerCase())
  ) {
    errors.push(
      `application SQL contains forbidden marker: ${forbidden}`,
    )
  }
}

if (
  application.summary
    ?.reading_segment_count !== 812 ||
  application.summary?.content_row_count !== 0 ||
  application.summary
    ?.successor_mapping_count !== 0 ||
  application.summary
    ?.dependency_snapshot_count !== 0 ||
  application.summary?.cutover_enabled !== false
) {
  errors.push(
    'staging boundary changed unexpectedly',
  )
}

if (errors.length) {
  console.error(
    'Mechanical boundary application-plan validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Validated a 166-target mechanical boundary application plan.',
)
console.log(
  'Preflight SQL: 18 read-only checks.',
)
console.log(
  'Application SQL: transactional, content-free, and staging-only.',
)
console.log(
  'Verification SQL: 20 read-only checks.',
)
console.log(
  'No SQL was applied.',
)
