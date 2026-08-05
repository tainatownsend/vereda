import { mkdir, writeFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { deriveReadiness, paths as readinessPaths } from './classify_reviewed_boundary_application_readiness.mjs'

export const paths = {
  contract: 'content/migration/reading-segment-source-review-status-only-contract.json',
  plan: 'content/migration/reading-segment-source-review-status-only-eligibility-plan.json',
  evidence: 'content/migration/reading-segment-source-review-status-only-contract-evidence.json',
  summary: 'content/migration/reports/reading-segment-source-review-status-only-contract-summary.md',
  docs: 'docs/content-pipeline/source-review-status-only-application-contract.md',
  readinessPolicy: readinessPaths.policy,
  readinessPlan: readinessPaths.plan,
  mechanicalPolicy: readinessPaths.mechanicalPolicy,
  mechanicalPlan: 'content/migration/reading-segment-mechanical-application-plan.json',
  mechanicalEvidence: 'content/migration/reading-segment-mechanical-application-evidence.json',
  stagingSchema: readinessPaths.stagingSchema,
  progress: readinessPaths.progress,
  historicalProgress: readinessPaths.historicalProgress,
  pr0045Current: readinessPaths.pr0045Current,
  decisionInputs: readinessPaths.decisionInputs,
}

const distribution = (items, key) => Object.fromEntries(Object.entries(items.reduce((acc, item) => { const v = item[key]; acc[v] = (acc[v] ?? 0) + 1; return acc }, {})).sort())
const eligibleOutcomes = ['confirm-successor-start', 'retain-intro-segment']

export const deriveStatusOnlyContract = async () => {
  const readiness = await deriveReadiness()
  const decisions = readiness.records
  const eligible = decisions.filter((record) => eligibleOutcomes.includes(record.final_outcome))
  const excluded = decisions.filter((record) => !eligibleOutcomes.includes(record.final_outcome))
  if (eligible.length !== 74) throw new Error(`Expected 74 status-only decisions, found ${eligible.length}`)
  const outcomeDistribution = distribution(eligible, 'final_outcome')
  if (outcomeDistribution['confirm-successor-start'] !== 73 || outcomeDistribution['retain-intro-segment'] !== 1) throw new Error(`Unexpected status-only distribution: ${JSON.stringify(outcomeDistribution)}`)
  const identities = new Set(eligible.map((record) => `${record.book_id}:${record.segment_key}:${record.segment_order}`))
  if (identities.size !== eligible.length) throw new Error('Duplicate status-only segment identities detected')
  for (const record of eligible) {
    if (!record.segment_key || !Number.isInteger(record.segment_order) || record.segment_order < 1) throw new Error(`${record.decision_id}: missing stable segment identity`)
    if (record.readiness_category !== 'status-only-candidate') throw new Error(`${record.decision_id}: eligible outcome is not a status-only candidate`)
    if (record.application_ready !== false) throw new Error(`${record.decision_id}: stale PR-0048 readiness flag`)
  }
  const conflictTargets = new Set(excluded.filter((record) => ['adjust-successor-start', 'exclude-structural-heading'].includes(record.final_outcome)).map((record) => `${record.book_id}:${record.segment_key}:${record.segment_order}`))
  for (const record of eligible) if (conflictTargets.has(`${record.book_id}:${record.segment_key}:${record.segment_order}`)) throw new Error(`${record.decision_id}: conflicting locator/merge decision targets same segment`)
  return { readiness, eligible, excluded, outcomeDistribution }
}

export const buildArtifacts = async () => {
  const { readiness, eligible, excluded, outcomeDistribution } = await deriveStatusOnlyContract()
  await mkdir('content/migration/reports', { recursive: true })
  await mkdir('docs/content-pipeline', { recursive: true })
  const runId = readiness.progress.run_id
  const contract = {
    schema_version: 'pr0049-source-review-status-only-application-contract-v1',
    contract_id: 'reading-segment-source-review-status-only-contract-pr0049',
    run_id: runId,
    status_only_contract_approved: true,
    rights_status: 'credited-source-edition',
    hash_algorithm: 'sha256-canonical-json-v1',
    text_hash_algorithm: 'sha256-normalized-lf-text-v1',
    authority: {
      source_review_readiness: paths.readinessPlan,
      source_review_semantics_policy: paths.readinessPolicy,
      historical_mechanical_status_only_policy: paths.mechanicalPolicy,
      historical_mechanical_status_only_plan: paths.mechanicalPlan,
      historical_mechanical_application_evidence: paths.mechanicalEvidence,
      staging_schema: paths.stagingSchema,
    },
    eligible_outcomes: eligibleOutcomes,
    approved_scope: { decision_count: 74, outcome_distribution: outcomeDistribution },
    excluded_scope: {
      'adjust-successor-start': excluded.filter((r) => r.final_outcome === 'adjust-successor-start').length,
      'exclude-structural-heading': excluded.filter((r) => r.final_outcome === 'exclude-structural-heading').length,
      unresolved: excluded.filter((r) => r.final_outcome === 'unresolved').length,
      unknown_outcomes: 0,
      duplicate_decisions: 0,
      conflicting_decisions: 0,
    },
    preconditions: [
      'public decision exists exactly once', 'final outcome is confirm-successor-start or retain-intro-segment', 'final outcome is not unresolved', 'book identity is valid', 'segment_key is valid', 'segment_order is valid', 'content_staging.reading_segments row exists exactly once', 'staging row belongs to the expected run_id', 'current approval_status is boundary-review', 'current segment identity matches the reviewed decision', 'current start_locator matches the preserved staging value', 'current end_locator matches the preserved staging value', 'no conflicting locator or merge decision targets the same segment', 'no equivalent migration_audit_events record already exists'
    ],
    authorized_mutation: {
      approval_status: { from: 'boundary-review', to: 'content-review' },
      updated_at: 'database-generated current timestamp',
      audit_event: 'one migration_audit_events record per authorized decision following established migration audit convention',
    },
    preserved_fields: ['book identity', 'source-page identity', 'successor identity', 'segment_key', 'segment_order', 'start_locator', 'end_locator', 'source text', 'reader content', 'user progress', 'reader sessions'],
    postconditions: ['exactly 74 scoped rows advanced', 'zero locator changes', 'zero segment identity changes', 'zero order changes', 'zero merge/delete/disable operations', 'exactly one audit record per authorized decision', 'no ineligible outcome applied', 'no unresolved decision applied', 'reconstruction invariants remain valid', 'all five books remain reconstructable'],
    idempotency: {
      already_applied_row: 'future application must treat content-review plus matching audit as already applied and make no locator or identity changes',
      partially_applied_batch: 'resume only unapplied rows that still satisfy all preconditions; report applied and skipped counts',
      duplicate_audit_events: 'forbidden; validation must fail before mutation',
      unexpected_status: 'forbidden unless it is the documented already-applied content-review state with matching audit',
      repeated_execution: 'must be a no-op after the first complete authorized application',
    },
    rollback: {
      status_return_to_boundary_review: 'allowed only by a separately reviewed rollback package before content review begins and with one compensating audit event per row',
      forbidden_when: ['locators or identity have changed outside this contract', 'content-review/editorial work has begun from the advanced status', 'audit trail is missing or duplicated', 'target row no longer matches the authorized identity'],
      locator_rollback_required: false,
      rollback_sql_generated: false,
    },
    safety_assertions: { executable_sql_generated: false, sql_executed: false, database_modified: false, supabase_modified: false, production_modified: false, ui_modified: false, source_text_modified: false, user_progress_modified: false, reader_sessions_modified: false, cutover_enabled: false },
  }
  const plan = {
    schema_version: 'pr0049-source-review-status-only-eligibility-plan-v1', run_id: runId, status_only_contract_approved: true, application_ready_decision_count: 74, executable_sql_generated: false, sql_executed: false, outcome_distribution: outcomeDistribution,
    excluded_counts: contract.excluded_scope,
    authorized_decisions: eligible.map((r) => ({ decision_id: r.decision_id, book_id: r.book_id, book_slug: r.book_slug, packet_id: r.packet_id, segment_key: r.segment_key, segment_order: r.segment_order, final_outcome: r.final_outcome, application_ready: true, preserve_segment_identity: true, preserve_segment_order: true, preserve_start_locator: true, preserve_end_locator: true, status_transition: 'boundary-review -> content-review' })),
  }
  await writeFile(paths.contract, `${JSON.stringify(contract, null, 2)}\n`)
  await writeFile(paths.plan, `${JSON.stringify(plan, null, 2)}\n`)
  const inputHashes = {
    immutable_historical_progress_sha256: await canonicalJsonSha256(paths.historicalProgress), archived_pr0045_pr0046_progress_snapshot_sha256: await canonicalJsonSha256(paths.pr0045Current), current_cumulative_progress_sha256: await canonicalJsonSha256(paths.progress), pr0048_readiness_policy_sha256: await canonicalJsonSha256(paths.readinessPolicy), pr0048_readiness_plan_sha256: await canonicalJsonSha256(paths.readinessPlan), mechanical_application_policy_sha256: await canonicalJsonSha256(paths.mechanicalPolicy), mechanical_application_plan_sha256: await canonicalJsonSha256(paths.mechanicalPlan), mechanical_application_evidence_sha256: await canonicalJsonSha256(paths.mechanicalEvidence)
  }
  for (const path of paths.decisionInputs) inputHashes[`${path.split('/').at(-1).replace('.json', '').replaceAll('-', '_')}_sha256`] = await canonicalJsonSha256(path)
  const evidence = { schema_version: 'pr0049-source-review-status-only-contract-evidence-v1', run_id: runId, status_only_contract_approved: true, totals: { public_decision_count: 144, status_only_application_ready_decisions: 74, locator_mutation_contract_required: 6, merge_contract_required: 53, unresolved_not_eligible: 11 }, outcome_distribution: readiness.outcomeDistribution, input_hashes: inputHashes, artifact_hashes: { contract_sha256: canonicalJsonSha256FromValue(contract), eligibility_plan_sha256: canonicalJsonSha256FromValue(plan) }, assertions: contract.safety_assertions }
  await writeFile(paths.evidence, `${JSON.stringify(evidence, null, 2)}\n`)
  const summary = `# PR-0049 Source-Review Status-Only Application Contract\n\nStatus-only contract approved: true.\n\nThe 74 decisions whose final outcomes are \`confirm-successor-start\` (73) or \`retain-intro-segment\` (1) may be represented by preserving segment identity, order, start/end locators, source-page and successor identity, source text, reader content, user progress, and reader sessions while advancing only \`approval_status\` from \`boundary-review\` to \`content-review\`, updating \`updated_at\`, and recording one audit event per decision.\n\nExcluded: 6 \`adjust-successor-start\`, 53 \`exclude-structural-heading\`, and 11 unresolved decisions. No executable SQL was generated or executed. Database, Supabase, production, UI, source text, user progress, reader sessions, and cutover state were not modified.\n`
  await writeFile(paths.summary, summary)
  await writeFile(paths.docs, summary)
  return { contract, plan, evidence }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { plan } = await buildArtifacts()
  console.log('Built PR-0049 source-review status-only contract.')
  console.log(JSON.stringify({ application_ready_decision_count: plan.application_ready_decision_count, outcome_distribution: plan.outcome_distribution }, null, 2))
}
