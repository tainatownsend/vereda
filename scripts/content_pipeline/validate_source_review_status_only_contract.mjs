import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { deriveStatusOnlyContract, paths } from './build_source_review_status_only_contract.mjs'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const fail = (errors, message) => errors.push(message)
const forbidden = /\b(update\s+\w|insert\s+into|delete\s+from|merge\s+into|truncate|alter\s+table|drop\s+table|create\s+function|do\s+\$|commit;|rollback;|psql|createClient|supabase\.co|service_role|postgres:)\b/i
const sortStrings = (values) => [...values].sort((a, b) => a.localeCompare(b))
const countBy = (records, predicate) => records.filter(predicate).length

export const inputHashFieldToPath = {
  immutable_historical_progress_sha256: paths.historicalProgress,
  archived_pr0045_pr0046_progress_snapshot_sha256: paths.pr0045Current,
  current_cumulative_progress_sha256: paths.progress,
  pr0048_readiness_policy_sha256: paths.readinessPolicy,
  pr0048_readiness_plan_sha256: paths.readinessPlan,
  mechanical_application_policy_sha256: paths.mechanicalPolicy,
  mechanical_application_plan_sha256: paths.mechanicalPlan,
  mechanical_application_evidence_sha256: paths.mechanicalEvidence,
  reading_segment_source_review_container_intro_decisions_sha256: 'content/migration/reading-segment-source-review-container-intro-decisions.json',
  reading_segment_source_review_pilot_decisions_sha256: 'content/migration/reading-segment-source-review-pilot-decisions.json',
  reading_segment_same_page_review_decisions_sha256: 'content/migration/reading-segment-same-page-review-decisions.json',
  reading_segment_no_anchor_ambiguous_adjudication_decisions_sha256: 'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
  reading_segment_remaining_no_anchor_backlog_adjudication_decisions_sha256: 'content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json',
}

const expectedSafetyAssertions = {
  executable_sql_generated: false,
  sql_executed: false,
  database_modified: false,
  supabase_modified: false,
  production_modified: false,
  ui_modified: false,
  source_text_modified: false,
  user_progress_modified: false,
  reader_sessions_modified: false,
  cutover_enabled: false,
}

export const validateStatusOnlyContractArtifacts = async ({ derived, contract, plan, evidence, summary, docs }) => {
  const errors = []
  const eligibleById = new Map(derived.eligible.map((record) => [record.decision_id, record]))
  const expectedIds = new Set(eligibleById.keys())
  const planRecords = plan.authorized_decisions ?? []
  const planIds = planRecords.map((record) => record.decision_id)
  const planIdCounts = new Map(planIds.map((id) => [id, 0]))
  for (const id of planIds) planIdCounts.set(id, (planIdCounts.get(id) ?? 0) + 1)
  const planIdSet = new Set(planIds)
  const missingIds = sortStrings([...expectedIds].filter((id) => !planIdSet.has(id)))
  const extraIds = sortStrings([...planIdSet].filter((id) => !expectedIds.has(id)))
  const duplicateIds = sortStrings([...planIdCounts].filter(([, count]) => count !== 1).map(([id]) => id))
  const tupleCounts = new Map()
  for (const record of planRecords) {
    const tuple = `${record.book_id}:${record.segment_key}:${record.segment_order}`
    tupleCounts.set(tuple, (tupleCounts.get(tuple) ?? 0) + 1)
  }
  const duplicateTuples = sortStrings([...tupleCounts].filter(([, count]) => count !== 1).map(([tuple]) => tuple))

  if (derived.readiness.records.length !== 144) fail(errors, 'wrong public-decision count')
  if (derived.eligible.length !== 74) fail(errors, 'wrong eligible decision count')
  if (derived.outcomeDistribution['confirm-successor-start'] !== 73 || derived.outcomeDistribution['retain-intro-segment'] !== 1) fail(errors, 'wrong eligible outcome distribution')
  if (new Set(derived.eligible.map((record) => `${record.book_id}:${record.segment_key}:${record.segment_order}`)).size !== 74) fail(errors, 'duplicate derived identities')
  if (planIdSet.size !== 74) fail(errors, `plan must contain exactly 74 unique decision IDs, found ${planIdSet.size}`)
  if (missingIds.length) fail(errors, `missing eligible decision IDs: ${missingIds.join(', ')}`)
  if (extraIds.length) fail(errors, `extra plan decision IDs: ${extraIds.join(', ')}`)
  if (duplicateIds.length) fail(errors, `duplicate plan decision IDs: ${duplicateIds.join(', ')}`)
  if (duplicateTuples.length) fail(errors, `duplicate plan segment identity tuples: ${duplicateTuples.join(', ')}`)

  for (const derivedRecord of derived.eligible) {
    if (!derivedRecord.segment_key || !Number.isInteger(derivedRecord.segment_order) || derivedRecord.final_outcome === 'unresolved') fail(errors, `${derivedRecord.decision_id}: invalid eligible identity/outcome`)
  }
  for (const record of derived.excluded) {
    if (['adjust-successor-start', 'exclude-structural-heading', 'unresolved'].includes(record.final_outcome) && expectedIds.has(record.decision_id)) fail(errors, `${record.decision_id}: ineligible decision classified as eligible`)
  }

  for (const record of planRecords) {
    const expected = eligibleById.get(record.decision_id)
    if (!expected) continue
    const expectedFields = {
      book_id: expected.book_id,
      book_slug: expected.book_slug,
      packet_id: expected.packet_id,
      segment_key: expected.segment_key,
      segment_order: expected.segment_order,
      final_outcome: expected.final_outcome,
      application_ready: true,
      preserve_segment_identity: true,
      preserve_segment_order: true,
      preserve_start_locator: true,
      preserve_end_locator: true,
      status_transition: 'boundary-review -> content-review',
    }
    for (const [field, expectedValue] of Object.entries(expectedFields)) {
      if (record[field] !== expectedValue) fail(errors, `${record.decision_id}: ${field} mismatch; expected ${expectedValue}, found ${record[field]}`)
    }
  }

  const derivedExcludedCounts = {
    'adjust-successor-start': countBy(derived.excluded, (record) => record.final_outcome === 'adjust-successor-start'),
    'exclude-structural-heading': countBy(derived.excluded, (record) => record.final_outcome === 'exclude-structural-heading'),
    unresolved: countBy(derived.excluded, (record) => record.final_outcome === 'unresolved'),
    unknown_outcomes: 0,
    duplicate_decisions: 0,
    conflicting_decisions: 0,
  }
  if (JSON.stringify(contract.excluded_scope) !== JSON.stringify(derivedExcludedCounts)) fail(errors, 'contract excluded counts do not match independently derived records')
  if (JSON.stringify(plan.excluded_counts) !== JSON.stringify(derivedExcludedCounts)) fail(errors, 'plan excluded counts do not match independently derived records')
  if (contract.excluded_scope?.unknown_outcomes !== 0 || contract.excluded_scope?.duplicate_decisions !== 0 || contract.excluded_scope?.conflicting_decisions !== 0) fail(errors, 'unknown/duplicate/conflicting counts must be independently checked zero')
  if (contract.approved_scope?.decision_count !== 74 || JSON.stringify(contract.approved_scope?.outcome_distribution) !== JSON.stringify(derived.outcomeDistribution)) fail(errors, 'contract approved scope does not match independently derived distribution')
  if (plan.application_ready_decision_count !== 74 || JSON.stringify(plan.outcome_distribution) !== JSON.stringify(derived.outcomeDistribution)) fail(errors, 'plan readiness scope does not match independently derived distribution')
  if (contract.status_only_contract_approved !== true || plan.status_only_contract_approved !== true || evidence.status_only_contract_approved !== true) fail(errors, 'incorrect contract approval flag')
  if (contract.rights_status !== 'credited-source-edition') fail(errors, 'contract rights_status must be credited-source-edition')

  const expectedEvidenceTotals = { public_decision_count: 144, status_only_application_ready_decisions: 74, locator_mutation_contract_required: 6, merge_contract_required: 53, unresolved_not_eligible: 11 }
  if (JSON.stringify(evidence.totals) !== JSON.stringify(expectedEvidenceTotals)) fail(errors, 'evidence totals do not match expected derived totals')
  if (evidence.totals?.status_only_application_ready_decisions !== contract.approved_scope?.decision_count || evidence.totals?.status_only_application_ready_decisions !== plan.application_ready_decision_count) fail(errors, 'evidence totals do not equal contract and plan')
  if (evidence.totals?.locator_mutation_contract_required !== contract.excluded_scope?.['adjust-successor-start'] || evidence.totals?.merge_contract_required !== contract.excluded_scope?.['exclude-structural-heading'] || evidence.totals?.unresolved_not_eligible !== contract.excluded_scope?.unresolved) fail(errors, 'evidence excluded totals do not equal contract')

  if (contract.authorized_mutation?.approval_status?.from !== 'boundary-review' || contract.authorized_mutation?.approval_status?.to !== 'content-review') fail(errors, 'unsupported status transition')
  for (const field of ['segment_key', 'segment_order', 'start_locator', 'end_locator', 'user progress', 'reader sessions']) if (!contract.preserved_fields?.includes(field)) fail(errors, `missing preserved field ${field}`)

  const actualHashKeys = sortStrings(Object.keys(evidence.input_hashes ?? {}))
  const expectedHashKeys = sortStrings(Object.keys(inputHashFieldToPath))
  if (JSON.stringify(actualHashKeys) !== JSON.stringify(expectedHashKeys)) fail(errors, `input hash key set mismatch; expected ${expectedHashKeys.join(', ')}, found ${actualHashKeys.join(', ')}`)
  for (const [field, path] of Object.entries(inputHashFieldToPath)) {
    const expectedHash = await canonicalJsonSha256(path)
    if (evidence.input_hashes?.[field] !== expectedHash) fail(errors, `${field}: stale or wrong-artifact hash`)
  }
  if (evidence.artifact_hashes?.contract_sha256 !== canonicalJsonSha256FromValue(contract)) fail(errors, 'contract hash mismatch')
  if (evidence.artifact_hashes?.eligibility_plan_sha256 !== canonicalJsonSha256FromValue(plan)) fail(errors, 'plan hash mismatch')

  const safetyKeys = sortStrings(Object.keys(evidence.assertions ?? {}))
  const expectedSafetyKeys = sortStrings(Object.keys(expectedSafetyAssertions))
  if (JSON.stringify(safetyKeys) !== JSON.stringify(expectedSafetyKeys)) fail(errors, 'safety assertion key set mismatch')
  for (const [field, expected] of Object.entries(expectedSafetyAssertions)) if (evidence.assertions?.[field] !== expected) fail(errors, `${field}: safety assertion must be false`)

  for (const text of [JSON.stringify(contract), JSON.stringify(plan), JSON.stringify(evidence), summary, docs]) {
    if (forbidden.test(text)) fail(errors, 'mutating SQL or database/Supabase connection code detected')
    if (/contains_source_text"\s*:\s*true|contains_source_excerpt"\s*:\s*true|source_excerpt_included"\s*:\s*true/i.test(text)) fail(errors, 'source/private evidence leakage')
    if (/migration_applied"\s*:\s*true|database_modified"\s*:\s*true|cutover_enabled"\s*:\s*true/i.test(text)) fail(errors, 'unsafe applied/modified/cutover flag')
  }
  if (errors.length) { const error = new Error(errors.join('\n')); error.errors = errors; throw error }
  return { eligible: derived.eligible.length, outcomeDistribution: derived.outcomeDistribution, hashes: evidence.artifact_hashes }
}

export const validateStatusOnlyContract = async () => validateStatusOnlyContractArtifacts({
  derived: await deriveStatusOnlyContract(),
  contract: await readJson(paths.contract),
  plan: await readJson(paths.plan),
  evidence: await readJson(paths.evidence),
  summary: await readFile(paths.summary, 'utf8'),
  docs: await readFile(paths.docs, 'utf8'),
})

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log('Validated PR-0049 source-review status-only contract.'); console.log(JSON.stringify(await validateStatusOnlyContract(), null, 2)) } catch (error) { console.error('PR-0049 validation failed:'); for (const message of error.errors ?? [error.message]) console.error(`- ${message}`); process.exit(1) }
}
