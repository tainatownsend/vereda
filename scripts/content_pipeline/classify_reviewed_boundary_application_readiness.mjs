import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'

export const paths = {
  progress: 'content/migration/reading-segment-source-review-progress-current.json',
  historicalProgress: 'content/migration/reading-segment-source-review-progress.json',
  pr0045Current: 'content/migration/reading-segment-source-review-progress-pr0045-current.json',
  sourceInspectionPolicy: 'content/migration/reading-segment-source-inspection-policy.json',
  mechanicalPolicy: 'content/migration/reading-segment-mechanical-application-policy.json',
  stagingSchema: 'supabase/migrations/20260803033000_content_staging_foundation.sql',
  recoveryConsolidation: 'content/migration/reading-segment-unresolved-recovery-consolidation.json',
  book3Manual: 'content/migration/reading-segment-book-3-manual-adjudication-decisions.json',
  remainingManual: 'content/migration/reading-segment-remaining-manual-adjudication-decisions.json',
  decisionInputs: [
    'content/migration/reading-segment-source-review-container-intro-decisions.json',
    'content/migration/reading-segment-source-review-pilot-decisions.json',
    'content/migration/reading-segment-same-page-review-decisions.json',
    'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
    'content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json',
  ],
  policy: 'content/migration/reading-segment-reviewed-boundary-application-semantics-policy.json',
  plan: 'content/migration/reading-segment-reviewed-boundary-application-readiness-plan.json',
  evidence: 'content/migration/reading-segment-reviewed-boundary-application-readiness-evidence.json',
  missingContracts: 'content/migration/reading-segment-reviewed-boundary-missing-contracts.json',
  summary: 'content/migration/reports/reading-segment-reviewed-boundary-application-readiness-summary.md',
  readinessSql: 'supabase/audits/reviewed_boundary_application_pr0048_readiness_inspection.sql',
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const normalizeText = (text) => text.replace(/\r\n?/g, '\n')
const normalizedTextSha256 = async (path) => createHash('sha256').update(normalizeText(await readFile(path, 'utf8')), 'utf8').digest('hex')
const sortObject = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)))
const distribution = (items, key) => sortObject(items.reduce((acc, item) => {
  const value = String(typeof key === 'function' ? key(item) : item[key])
  acc[value] = (acc[value] ?? 0) + 1
  return acc
}, {}))
const publicDecisionId = (decision) => decision.decision_id ?? decision.same_page_decision_id
const publicOutcome = (decision) => decision.selected_outcome ?? decision.selected_decision

export const readinessByOutcome = {
  'confirm-successor-start': 'status-only-candidate',
  'retain-intro-segment': 'status-only-candidate',
  'adjust-successor-start': 'locator-mutation-contract-required',
  'exclude-structural-heading': 'merge-contract-required',
  unresolved: 'unresolved-not-eligible',
}

export const categoryRequirements = {
  'status-only-candidate': {
    application_ready: false,
    missing_contract: 'formal-source-review-status-only-application-contract',
    existing_authority: [
      'content_staging.reading_segments has approval_status/start_locator/end_locator',
      'mechanical application supports scoped status-only advancement with unchanged segment identity, order, and locators',
    ],
  },
  'locator-mutation-contract-required': {
    application_ready: false,
    missing_contract_fields: [
      'exact_target_row',
      'exact_locator_column',
      'expected_current_locator',
      'approved_replacement_locator',
      'ordering_invariant',
      'overlap_invariant',
      'reconstruction_invariant',
      'audit_requirements',
      'rollback_behavior',
    ],
  },
  'merge-contract-required': {
    application_ready: false,
    missing_contract_fields: [
      'current_segment_retention_or_deletion_or_disablement',
      'locator_range_absorption_rule',
      'successor_field_mutations',
      'stable_ordering_rule',
      'reconstruction_rule',
      'user_progress_reference_safety',
      'audit_requirements',
      'rollback_behavior',
    ],
  },
  'unresolved-not-eligible': {
    application_ready: false,
    exclusion_reason: 'final-outcome-unresolved',
  },
}

export const deriveReadiness = async () => {
  const [progress, recovery, book3Manual, remainingManual] = await Promise.all([
    readJson(paths.progress),
    readJson(paths.recoveryConsolidation),
    readJson(paths.book3Manual),
    readJson(paths.remainingManual),
  ])
  const expectedProgress = { reviewed_count: 133, unresolved_count: 11, pending_count: 0, public_decision_count: 144, completed_packet_count: 16, pending_packet_count: 0 }
  for (const [key, expected] of Object.entries(expectedProgress)) {
    if (progress.totals?.[key] !== expected) throw new Error(`${key}: expected ${expected}, found ${progress.totals?.[key]}`)
  }

  const decisions = []
  for (const source_artifact of paths.decisionInputs) {
    const artifact = await readJson(source_artifact)
    if (artifact.contains_source_excerpt !== false || artifact.contains_full_text === true) throw new Error(`${source_artifact}: source text boundary is unsafe`)
    for (const decision of artifact.decisions ?? []) decisions.push({ ...decision, source_artifact })
  }
  if (decisions.length !== 144) throw new Error(`Expected 144 public decisions, found ${decisions.length}`)
  const ids = new Set(decisions.map(publicDecisionId))
  if (ids.size !== decisions.length) throw new Error('Duplicate public decision identities detected')

  const recoveryByOriginalId = new Map((recovery.resolved_recoveries ?? []).map((item) => [item.original_decision_id, item]))
  const manualByOriginalId = new Map([...(book3Manual.decisions ?? []), ...(remainingManual.decisions ?? [])].map((item) => [item.original_decision_id, item]))
  const records = decisions.map((decision) => {
    const decision_id = publicDecisionId(decision)
    const resolution = recoveryByOriginalId.get(decision_id) ?? manualByOriginalId.get(decision_id)
    const final_outcome = resolution?.selected_decision ?? publicOutcome(decision)
    const category = readinessByOutcome[final_outcome]
    if (!category) throw new Error(`${decision_id}: unknown final outcome ${final_outcome}`)
    return {
      decision_id,
      book_id: decision.book_id,
      book_slug: decision.book_slug,
      packet_id: decision.packet_id,
      segment_key: decision.segment_key,
      segment_order: decision.segment_order,
      review_status: decision.review_status,
      original_outcome: publicOutcome(decision),
      final_outcome,
      readiness_category: category,
      application_ready: false,
      source_artifact: decision.source_artifact,
      resolution_id: resolution?.recovery_id ?? resolution?.adjudication_id ?? resolution?.manual_decision_id ?? null,
      resolution_artifact: resolution ? (resolution.source_artifact ?? 'manual-adjudication') : null,
      contract_gap: categoryRequirements[category].missing_contract ?? categoryRequirements[category].exclusion_reason ?? null,
      missing_contract_fields: categoryRequirements[category].missing_contract_fields ?? [],
    }
  }).sort((left, right) => left.book_id - right.book_id || left.segment_order - right.segment_order || left.decision_id.localeCompare(right.decision_id))

  const categoryCounts = distribution(records, 'readiness_category')
  const expectedCategoryCounts = {
    'locator-mutation-contract-required': 6,
    'merge-contract-required': 53,
    'status-only-candidate': 74,
    'unresolved-not-eligible': 11,
  }
  if (JSON.stringify(categoryCounts) !== JSON.stringify(sortObject(expectedCategoryCounts))) throw new Error(`Wrong readiness totals: ${JSON.stringify(categoryCounts)}`)
  if (records.some((record) => record.final_outcome === 'unresolved' && record.readiness_category !== 'unresolved-not-eligible')) throw new Error('Unresolved final outcome was not excluded')

  return { progress, records, categoryCounts, outcomeDistribution: distribution(records, 'final_outcome') }
}

const buildReadinessSql = ({ records }) => {
  const counts = distribution(records, 'readiness_category')
  return `-- PR-0048 reviewed boundary readiness inspection only.\n-- Plain SELECT statements only; this file intentionally contains no mutation or execution block.\nselect 'public_decisions'::text as readiness_metric, ${records.length}::integer as expected_count\nunion all select 'status_only_candidates', ${counts['status-only-candidate']}\nunion all select 'locator_mutation_contract_required', ${counts['locator-mutation-contract-required']}\nunion all select 'merge_contract_required', ${counts['merge-contract-required']}\nunion all select 'unresolved_not_eligible', ${counts['unresolved-not-eligible']}\nunion all select 'application_ready_operations', 0;\n`
}

export const buildArtifacts = async () => {
  const { progress, records, categoryCounts, outcomeDistribution } = await deriveReadiness()
  await mkdir('content/migration/reports', { recursive: true })
  await mkdir('supabase/audits', { recursive: true })

  const policy = {
    schema_version: 'pr0048-reviewed-boundary-application-semantics-policy-v1',
    run_id: progress.run_id,
    status: 'application-semantics-documented-not-approved',
    rights_status: 'credited-source-edition',
    hash_algorithm: 'sha256-canonical-json-v1',
    text_hash_algorithm: 'sha256-normalized-lf-text-v1',
    purpose: 'Define reviewed boundary application semantics and readiness without authorizing database mutation.',
    existing_authority: {
      staging_schema: paths.stagingSchema,
      mechanical_status_only_policy: paths.mechanicalPolicy,
      editorial_outcome_policy: paths.sourceInspectionPolicy,
    },
    boundaries: {
      application_ready_operations: 0,
      executable_sql_generated: false,
      mutating_sql_generated: false,
      sql_executed: false,
      migration_applied: false,
      database_modified: false,
      supabase_modified: false,
      production_modified: false,
      cutover_enabled: false,
    },
  }

  const plan = {
    schema_version: 'pr0048-reviewed-boundary-application-readiness-plan-v1',
    run_id: progress.run_id,
    status: policy.status,
    rights_status: policy.rights_status,
    hash_algorithm: policy.hash_algorithm,
    totals: {
      public_decision_count: records.length,
      status_only_candidate_count: categoryCounts['status-only-candidate'],
      locator_mutation_contract_required_count: categoryCounts['locator-mutation-contract-required'],
      merge_contract_required_count: categoryCounts['merge-contract-required'],
      unresolved_not_eligible_count: categoryCounts['unresolved-not-eligible'],
      application_ready_operation_count: 0,
    },
    outcome_distribution: outcomeDistribution,
    readiness_category_distribution: categoryCounts,
    decisions: records,
  }

  const missingContracts = {
    schema_version: 'pr0048-reviewed-boundary-missing-contracts-v1',
    run_id: progress.run_id,
    status: policy.status,
    totals: {
      source_review_status_only_contract_required_count: categoryCounts['status-only-candidate'],
      locator_mutation_contract_required_count: categoryCounts['locator-mutation-contract-required'],
      merge_contract_required_count: categoryCounts['merge-contract-required'],
      mutation_contract_required_total: categoryCounts['locator-mutation-contract-required'] + categoryCounts['merge-contract-required'],
    },
    missing_contracts: records.filter((record) => record.readiness_category !== 'unresolved-not-eligible').map((record) => ({
      decision_id: record.decision_id,
      book_id: record.book_id,
      packet_id: record.packet_id,
      segment_key: record.segment_key,
      final_outcome: record.final_outcome,
      readiness_category: record.readiness_category,
      missing_contract: record.contract_gap,
      missing_contract_fields: record.missing_contract_fields,
    })),
  }

  await writeFile(paths.policy, `${JSON.stringify(policy, null, 2)}\n`)
  await writeFile(paths.plan, `${JSON.stringify(plan, null, 2)}\n`)
  await writeFile(paths.missingContracts, `${JSON.stringify(missingContracts, null, 2)}\n`)
  await writeFile(paths.readinessSql, buildReadinessSql({ records }))

  const inputHashes = {
    immutable_historical_progress_sha256: await canonicalJsonSha256(paths.historicalProgress),
    archived_pr0045_pr0046_progress_snapshot_sha256: await canonicalJsonSha256(paths.pr0045Current),
    current_pr0047_cumulative_progress_sha256: await canonicalJsonSha256(paths.progress),
  }
  for (const path of paths.decisionInputs) inputHashes[`${path.split('/').at(-1).replace('.json', '').replaceAll('-', '_')}_sha256`] = await canonicalJsonSha256(path)

  const evidence = {
    schema_version: 'pr0048-reviewed-boundary-application-readiness-evidence-v1',
    run_id: progress.run_id,
    status: policy.status,
    rights_status: policy.rights_status,
    hash_algorithm: policy.hash_algorithm,
    text_hash_algorithm: policy.text_hash_algorithm,
    totals: plan.totals,
    outcome_distribution: outcomeDistribution,
    readiness_category_distribution: categoryCounts,
    input_hashes: inputHashes,
    artifact_hashes: {
      semantics_policy_sha256: canonicalJsonSha256FromValue(policy),
      readiness_plan_sha256: canonicalJsonSha256FromValue(plan),
      missing_contracts_sha256: canonicalJsonSha256FromValue(missingContracts),
      readiness_inspection_sql_sha256: await normalizedTextSha256(paths.readinessSql),
    },
    assertions: {
      application_ready_operations: 0,
      executable_sql_generated: false,
      mutating_sql_generated: false,
      sql_executed: false,
      migration_applied: false,
      database_modified: false,
      supabase_modified: false,
      production_modified: false,
      cutover_enabled: false,
      contains_source_text: false,
      contains_source_excerpt: false,
      contains_private_evidence: false,
    },
  }
  await writeFile(paths.evidence, `${JSON.stringify(evidence, null, 2)}\n`)

  await writeFile(paths.summary, `# PR-0048 Reviewed Boundary Application Readiness\n\nStatus: application semantics documented, not approved.\n\n- Public decisions: ${records.length}\n- Status-only candidates: ${categoryCounts['status-only-candidate']}\n- Locator-mutation contract required: ${categoryCounts['locator-mutation-contract-required']}\n- Merge contract required: ${categoryCounts['merge-contract-required']}\n- Unresolved not eligible: ${categoryCounts['unresolved-not-eligible']}\n- Application-ready operations: 0\n- Executable SQL generated: false\n- SQL executed: false\n- Migration applied: false\n- Database/Supabase/production modified: false\n- Cutover enabled: false\n\nThe repository currently proves staging schema shape and a historical mechanical status-only application model. It does not yet define safe source-review mutation semantics for adjust-successor-start or exclude-structural-heading/merge outcomes, and it does not approve status-only advancement for source-review outcomes.\n`)
  return { policy, plan, evidence, missingContracts }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { plan } = await buildArtifacts()
  console.log('Classified PR-0048 reviewed boundary application readiness.')
  console.log(JSON.stringify(plan.totals, null, 2))
}
