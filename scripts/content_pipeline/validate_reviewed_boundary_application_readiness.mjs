import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { deriveReadiness, paths } from './classify_reviewed_boundary_application_readiness.mjs'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const readText = async (path) => readFile(path, 'utf8')
const normalizedTextSha256FromText = (text) => createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex')
const fail = (errors, message) => errors.push(message)
const forbiddenSql = /\b(update|insert|delete|merge|truncate|alter|drop|create\s+function|do\s+\$|raise_exception)\b/i
const connectionPattern = /createClient|supabaseUrl|supabaseKey|service_role|postgres:|fetch\(|psql|supabase\.co/i

export const validateReadiness = async () => {
  const errors = []
  const [derived, policy, plan, evidence, missingContracts, readinessSql] = await Promise.all([
    deriveReadiness(),
    readJson(paths.policy),
    readJson(paths.plan),
    readJson(paths.evidence),
    readJson(paths.missingContracts),
    readText(paths.readinessSql),
  ])
  const { records, categoryCounts, outcomeDistribution } = derived
  const expectedTotals = {
    public_decision_count: 144,
    status_only_candidate_count: 74,
    locator_mutation_contract_required_count: 6,
    merge_contract_required_count: 53,
    unresolved_not_eligible_count: 11,
    application_ready_operation_count: 0,
  }
  for (const [key, expected] of Object.entries(expectedTotals)) {
    if (plan.totals?.[key] !== expected || evidence.totals?.[key] !== expected) fail(errors, `${key}: wrong readiness total`)
  }
  if (records.length !== 144 || new Set(records.map((record) => record.decision_id)).size !== 144) fail(errors, 'missing or duplicate public decisions')
  if (JSON.stringify(plan.readiness_category_distribution) !== JSON.stringify(categoryCounts)) fail(errors, 'plan readiness distribution is stale')
  if (JSON.stringify(plan.outcome_distribution) !== JSON.stringify(outcomeDistribution)) fail(errors, 'plan outcome distribution is stale')
  for (const record of records) {
    if (!record.review_status || !record.final_outcome) fail(errors, `${record.decision_id}: missing review_status or final_outcome`)
    if (record.final_outcome === 'unresolved' && record.readiness_category !== 'unresolved-not-eligible') fail(errors, `${record.decision_id}: unresolved final outcome marked eligible`)
    if (record.application_ready !== false) fail(errors, `${record.decision_id}: application-ready decision is not allowed`)
    if (['adjust-successor-start', 'exclude-structural-heading'].includes(record.final_outcome) && !record.readiness_category.endsWith('contract-required')) fail(errors, `${record.decision_id}: mutation outcome not contract-blocked`)
  }
  if (missingContracts.totals?.mutation_contract_required_total !== 59) fail(errors, 'missing-contract total must be 59')
  if (policy.boundaries?.application_ready_operations !== 0 || evidence.assertions?.application_ready_operations !== 0) fail(errors, 'application-ready operation claim is not allowed')
  for (const [key, value] of Object.entries(evidence.assertions ?? {})) {
    if (['sql_executed', 'migration_applied', 'database_modified', 'supabase_modified', 'production_modified', 'cutover_enabled', 'executable_sql_generated', 'mutating_sql_generated'].includes(key) && value !== false) fail(errors, `${key}: unsafe flag`)
  }
  if (forbiddenSql.test(readinessSql)) fail(errors, 'readiness SQL contains mutation, execution block, or raise_exception')
  if (!/^\s*(?:--[^\n]*\n)*select\b/i.test(readinessSql)) fail(errors, 'readiness SQL must be plain SELECT-only inspection')
  for (const [name, text] of Object.entries({ policy: JSON.stringify(policy), plan: JSON.stringify(plan), evidence: JSON.stringify(evidence), missingContracts: JSON.stringify(missingContracts), readinessSql })) {
    if (connectionPattern.test(text)) fail(errors, `${name}: database/Supabase connection code or credential reference detected`)
    if (/source_text_included\s*[:=]\s*true|source_excerpt_included\s*[:=]\s*true|private_evidence_included\s*[:=]\s*true/i.test(text)) fail(errors, `${name}: source/private evidence leakage`)
    if (/production\./i.test(text)) fail(errors, `${name}: production object reference detected`)
  }
  if (evidence.input_hashes?.immutable_historical_progress_sha256 !== await canonicalJsonSha256(paths.historicalProgress)) fail(errors, 'historical progress hash mismatch')
  if (evidence.input_hashes?.archived_pr0045_pr0046_progress_snapshot_sha256 !== await canonicalJsonSha256(paths.pr0045Current)) fail(errors, 'archived progress hash mismatch')
  if (evidence.input_hashes?.current_pr0047_cumulative_progress_sha256 !== await canonicalJsonSha256(paths.progress)) fail(errors, 'current progress hash mismatch')
  if (evidence.artifact_hashes?.semantics_policy_sha256 !== canonicalJsonSha256FromValue(policy)) fail(errors, 'policy hash mismatch')
  if (evidence.artifact_hashes?.readiness_plan_sha256 !== canonicalJsonSha256FromValue(plan)) fail(errors, 'plan hash mismatch')
  if (evidence.artifact_hashes?.missing_contracts_sha256 !== canonicalJsonSha256FromValue(missingContracts)) fail(errors, 'missing-contract hash mismatch')
  if (evidence.artifact_hashes?.readiness_inspection_sql_sha256 !== normalizedTextSha256FromText(readinessSql)) fail(errors, 'readiness SQL hash mismatch')
  if (evidence.artifact_hashes?.readiness_inspection_sql_sha256 !== normalizedTextSha256FromText(readinessSql.replace(/\n/g, '\r\n'))) fail(errors, 'readiness SQL hash is line-ending dependent')
  if (errors.length) {
    const error = new Error(errors.join('\n'))
    error.errors = errors
    throw error
  }
  return { totals: plan.totals, outcomeDistribution, readinessCategoryDistribution: categoryCounts }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await validateReadiness()
    console.log('Validated PR-0048 reviewed boundary application readiness.')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('PR-0048 readiness validation failed:')
    for (const message of error.errors ?? [error.message]) console.error(`- ${message}`)
    process.exit(1)
  }
}
