import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { deriveStatusOnlyContract, paths } from './build_source_review_status_only_contract.mjs'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const fail = (errors, message) => errors.push(message)
const forbidden = /\b(update\s+\w|insert\s+into|delete\s+from|merge\s+into|truncate|alter\s+table|drop\s+table|create\s+function|do\s+\$|commit;|rollback;|psql|createClient|supabase\.co|service_role|postgres:)\b/i

export const validateStatusOnlyContract = async () => {
  const errors = []
  const [derived, contract, plan, evidence, summary, docs] = await Promise.all([deriveStatusOnlyContract(), readJson(paths.contract), readJson(paths.plan), readJson(paths.evidence), readFile(paths.summary, 'utf8'), readFile(paths.docs, 'utf8')])
  const eligibleIds = new Set(derived.eligible.map((r) => r.decision_id))
  if (derived.readiness.records.length !== 144) fail(errors, 'wrong public-decision count')
  if (derived.eligible.length !== 74) fail(errors, 'wrong eligible decision count')
  if (derived.outcomeDistribution['confirm-successor-start'] !== 73 || derived.outcomeDistribution['retain-intro-segment'] !== 1) fail(errors, 'wrong eligible outcome distribution')
  if (new Set(derived.eligible.map((r) => `${r.book_id}:${r.segment_key}:${r.segment_order}`)).size !== 74) fail(errors, 'duplicate identities')
  for (const r of derived.eligible) if (!r.segment_key || !Number.isInteger(r.segment_order) || r.final_outcome === 'unresolved') fail(errors, `${r.decision_id}: invalid eligible identity/outcome`)
  for (const r of derived.excluded) if (['adjust-successor-start', 'exclude-structural-heading', 'unresolved'].includes(r.final_outcome) && eligibleIds.has(r.decision_id)) fail(errors, `${r.decision_id}: ineligible decision classified as eligible`)
  if (contract.status_only_contract_approved !== true || plan.application_ready_decision_count !== 74 || evidence.totals?.status_only_application_ready_decisions !== 74) fail(errors, 'incorrect readiness flags')
  if (contract.authorized_mutation?.approval_status?.from !== 'boundary-review' || contract.authorized_mutation?.approval_status?.to !== 'content-review') fail(errors, 'unsupported status transition')
  for (const field of ['segment_key', 'segment_order', 'start_locator', 'end_locator', 'user progress', 'reader sessions']) if (!contract.preserved_fields?.includes(field)) fail(errors, `missing preserved field ${field}`)
  for (const decision of plan.authorized_decisions ?? []) {
    if (!eligibleIds.has(decision.decision_id)) fail(errors, `${decision.decision_id}: extra decision in plan`)
    if (!decision.preserve_start_locator || !decision.preserve_end_locator || !decision.preserve_segment_identity || !decision.preserve_segment_order) fail(errors, `${decision.decision_id}: mutated locator or identity claim`)
  }
  if ((plan.authorized_decisions ?? []).length !== 74) fail(errors, 'missing decisions in plan')
  for (const text of [JSON.stringify(contract), JSON.stringify(plan), JSON.stringify(evidence), summary, docs]) {
    if (forbidden.test(text)) fail(errors, 'mutating SQL or database/Supabase connection code detected')
    if (/contains_source_text"\s*:\s*true|contains_source_excerpt"\s*:\s*true|source_excerpt_included"\s*:\s*true/i.test(text)) fail(errors, 'source/private evidence leakage')
    if (/migration_applied"\s*:\s*true|database_modified"\s*:\s*true|cutover_enabled"\s*:\s*true/i.test(text)) fail(errors, 'unsafe applied/modified/cutover flag')
  }
  if (evidence.input_hashes?.immutable_historical_progress_sha256 !== await canonicalJsonSha256(paths.historicalProgress)) fail(errors, 'stale historical progress hash')
  if (evidence.input_hashes?.current_cumulative_progress_sha256 !== await canonicalJsonSha256(paths.progress)) fail(errors, 'stale current progress hash')
  if (evidence.input_hashes?.pr0048_readiness_plan_sha256 !== await canonicalJsonSha256(paths.readinessPlan)) fail(errors, 'stale PR-0048 readiness hash')
  if (evidence.artifact_hashes?.contract_sha256 !== canonicalJsonSha256FromValue(contract)) fail(errors, 'contract hash mismatch')
  if (evidence.artifact_hashes?.eligibility_plan_sha256 !== canonicalJsonSha256FromValue(plan)) fail(errors, 'plan hash mismatch')
  if (errors.length) { const error = new Error(errors.join('\n')); error.errors = errors; throw error }
  return { eligible: derived.eligible.length, outcomeDistribution: derived.outcomeDistribution, hashes: evidence.artifact_hashes }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log('Validated PR-0049 source-review status-only contract.'); console.log(JSON.stringify(await validateStatusOnlyContract(), null, 2)) } catch (error) { console.error('PR-0049 validation failed:'); for (const m of error.errors ?? [error.message]) console.error(`- ${m}`); process.exit(1) }
}
