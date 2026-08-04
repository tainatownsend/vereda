import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { derivePackage, outcomeToOperationType, paths } from './build_reviewed_boundary_application_package.mjs'
import { createHash } from 'node:crypto'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const readText = async (path) => readFile(path, 'utf8')
const normalizedTextSha256FromText = (text) => createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex')
const fail = (errors, message) => errors.push(message)

export const validateReviewedBoundaryApplicationPackage = async () => {
  const errors = []
  const [derived, policy, plan, evidence, applicationSql, preApplySql, postApplySql, progress] = await Promise.all([
    derivePackage(),
    readJson(paths.policy),
    readJson(paths.plan),
    readJson(paths.evidence),
    readText(paths.applicationSql),
    readText(paths.preApplySql),
    readText(paths.postApplySql),
    readJson(paths.progress),
  ])

  const { finalDecisions, resolved, unresolved, operations } = derived
  const expectedState = { reviewed_count: 133, unresolved_count: 11, pending_count: 0, public_decision_count: 144, completed_packet_count: 16, pending_packet_count: 0 }
  for (const [key, expected] of Object.entries(expectedState)) if (progress.totals?.[key] !== expected) fail(errors, `${key}: expected ${expected}, found ${progress.totals?.[key]}`)
  if (finalDecisions.length !== 144 || resolved.length !== 133 || unresolved.length !== 11 || operations.length !== 133) fail(errors, 'derived decision counts differ from PR-0048 requirements')

  const decisionIds = new Set(finalDecisions.map((decision) => decision.final_decision_id))
  if (decisionIds.size !== finalDecisions.length) fail(errors, 'duplicate public decision identities')
  const unresolvedIds = new Set(unresolved.map((decision) => decision.final_decision_id))
  for (const operation of operations) {
    if (!outcomeToOperationType[operation.outcome]) fail(errors, `${operation.decision_id}: unknown outcome`)
    if (operation.operation_type !== outcomeToOperationType[operation.outcome]) fail(errors, `${operation.decision_id}: wrong operation mapping`)
    if (!operation.segment_key || !operation.successor_segment_key) fail(errors, `${operation.decision_id}: missing source/successor identity`)
    if (!(operation.successor_segment_order > operation.segment_order)) fail(errors, `${operation.decision_id}: invalid ordering`)
    if (unresolvedIds.has(operation.decision_id)) fail(errors, `${operation.decision_id}: unresolved decision included in operations`)
  }

  const operationIds = new Set(operations.map((operation) => operation.operation_id))
  const targetKeys = new Set(operations.map((operation) => `${operation.book_id}:${operation.segment_key}`))
  if (operationIds.size !== operations.length || targetKeys.size !== operations.length) fail(errors, 'duplicate SQL operations or conflicting targets')

  if (policy.rights_status !== 'credited-source-edition' || evidence.rights_status !== 'credited-source-edition') fail(errors, 'wrong rights status')
  for (const [key, value] of Object.entries(policy.application_boundary ?? {})) {
    const expected = ['package_prepared', 'package_validated'].includes(key)
    if (value !== expected) fail(errors, `${key}: wrong application boundary flag`)
  }
  for (const [key, value] of Object.entries(evidence.non_execution_assertions ?? {})) {
    const expected = ['package_prepared', 'package_validated'].includes(key)
    if (value !== expected) fail(errors, `${key}: wrong evidence boundary flag`)
  }

  const totals = plan.totals ?? {}
  if (totals.public_decision_count !== 144 || totals.eligible_resolved_decision_count !== 133 || totals.excluded_unresolved_decision_count !== 11 || totals.expected_sql_operation_count !== 133) fail(errors, 'plan totals are wrong')
  if (evidence.totals?.expected_sql_operation_count !== operations.length) fail(errors, 'evidence operation count is wrong')
  if (plan.operations?.length !== operations.length) fail(errors, 'plan operation list count is wrong')
  if (plan.unresolved_exclusions?.length !== 11 || evidence.unresolved_exclusions?.length !== 11) fail(errors, 'unresolved exclusions are missing')

  const payloadMatch = applicationSql.match(/\$vereda_pr0048_targets\$(.*)\$vereda_pr0048_targets\$/s)
  if (!payloadMatch) fail(errors, 'application SQL target payload missing')
  else {
    const sqlOperations = JSON.parse(payloadMatch[1])
    if (sqlOperations.length !== operations.length) fail(errors, 'SQL operation payload count is wrong')
    const sqlIds = new Set(sqlOperations.map((operation) => operation.operation_id))
    for (const operation of operations) if (!sqlIds.has(operation.operation_id)) fail(errors, `${operation.operation_id}: missing from SQL payload`)
    if (sqlOperations.some((operation) => unresolvedIds.has(operation.decision_id) || operation.outcome === 'unresolved')) fail(errors, 'unresolved decision included in SQL payload')
  }

  for (const [label, sql] of Object.entries({ applicationSql, preApplySql, postApplySql })) {
    if (!sql.includes('content_staging.reading_segments') || !sql.includes('content_staging.migration_audit_events')) fail(errors, `${label}: expected staging objects missing`)
    if (/\b(public|auth|storage|realtime)\./i.test(sql) || /production|prod_|supabase\.co|service_role|anon_key|password|secret/i.test(sql)) fail(errors, `${label}: forbidden production, Supabase, or credential reference`)
    if (/update\s+content_staging\.reading_segments\s+segment[\s\S]*where\s+segment\.run_id\s*=/.test(sql) === false && label === 'applicationSql') fail(errors, 'application SQL update is not scoped by run_id')
  }
  if (/psql|fetch\(|createClient|postgres:|execute\s+sql|supabaseUrl|supabaseKey|service_role/i.test(JSON.stringify(policy) + JSON.stringify(plan) + JSON.stringify(evidence))) fail(errors, 'execution command or Supabase access recorded in JSON artifacts')
  if (/source_text|source excerpt|private evidence/i.test(JSON.stringify(plan.operations))) fail(errors, 'source text/private evidence leakage in operations')

  if (evidence.input_hashes?.immutable_historical_progress_sha256 !== await canonicalJsonSha256(paths.historicalProgress)) fail(errors, 'historical progress hash mismatch')
  if (evidence.input_hashes?.archived_pr0045_pr0046_progress_snapshot_sha256 !== await canonicalJsonSha256(paths.pr0045Current)) fail(errors, 'archived current progress hash mismatch')
  if (evidence.input_hashes?.current_pr0047_cumulative_progress_sha256 !== await canonicalJsonSha256(paths.progress)) fail(errors, 'current progress hash mismatch')
  if (evidence.artifact_hashes?.application_policy_sha256 !== canonicalJsonSha256FromValue(policy)) fail(errors, 'policy canonical hash mismatch')
  if (evidence.artifact_hashes?.application_plan_sha256 !== canonicalJsonSha256FromValue(plan)) fail(errors, 'plan canonical hash mismatch')
  if (evidence.artifact_hashes?.generated_application_sql_sha256 !== normalizedTextSha256FromText(applicationSql)) fail(errors, 'application SQL normalized text hash mismatch')
  if (evidence.artifact_hashes?.generated_application_sql_sha256 !== normalizedTextSha256FromText(applicationSql.replace(/\n/g, '\r\n'))) fail(errors, 'application SQL hash is line-ending dependent')
  if (evidence.artifact_hashes?.pre_apply_verification_sql_sha256 !== normalizedTextSha256FromText(preApplySql)) fail(errors, 'pre-apply SQL hash mismatch')
  if (evidence.artifact_hashes?.post_apply_verification_sql_sha256 !== normalizedTextSha256FromText(postApplySql)) fail(errors, 'post-apply SQL hash mismatch')

  if (errors.length) {
    const error = new Error(errors.join('\n'))
    error.errors = errors
    throw error
  }
  return {
    publicDecisionCount: finalDecisions.length,
    eligibleResolvedDecisionCount: resolved.length,
    excludedUnresolvedDecisionCount: unresolved.length,
    expectedSqlOperationCount: operations.length,
    outcomeDistribution: plan.outcome_distribution,
    confidenceDistribution: plan.confidence_distribution,
    bookDistribution: plan.book_distribution,
    packetDistribution: plan.packet_distribution,
    applicationOperationDistribution: plan.application_operation_distribution,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await validateReviewedBoundaryApplicationPackage()
    console.log('Validated PR-0048 reviewed boundary application package.')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('PR-0048 reviewed boundary application validation failed:')
    for (const message of error.errors ?? [error.message]) console.error(`- ${message}`)
    process.exit(1)
  }
}
