import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'

export const paths = {
  progress: 'content/migration/reading-segment-source-review-progress-current.json',
  historicalProgress: 'content/migration/reading-segment-source-review-progress.json',
  pr0045Current: 'content/migration/reading-segment-source-review-progress-pr0045-current.json',
  sourceInspectionPackets: 'content/migration/reading-segment-source-inspection-packets.json',
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
  policy: 'content/migration/reading-segment-reviewed-boundary-application-policy.json',
  plan: 'content/migration/reading-segment-reviewed-boundary-application-plan.json',
  evidence: 'content/migration/reading-segment-reviewed-boundary-application-evidence.json',
  summary: 'content/migration/reports/reading-segment-reviewed-boundary-application-summary.md',
  applicationSql: 'supabase/staging/20260804120000_prepare_reviewed_boundary_application_pr0048.sql',
  preApplySql: 'supabase/audits/reviewed_boundary_application_pr0048_pre_apply_verification.sql',
  postApplySql: 'supabase/audits/reviewed_boundary_application_pr0048_post_apply_verification.sql',
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const normalizedTextSha256FromText = (text) => createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex')
const normalizedTextSha256 = async (path) => normalizedTextSha256FromText(await readFile(path, 'utf8'))
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`
const sortObject = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)))
const distribution = (items, key) => sortObject(items.reduce((acc, item) => ({ ...acc, [String(typeof key === 'function' ? key(item) : item[key])]: (acc[String(typeof key === 'function' ? key(item) : item[key])] ?? 0) + 1 }), {}))

export const outcomeToOperationType = {
  'confirm-successor-start': 'confirm_successor_start',
  'adjust-successor-start': 'adjust_successor_start',
  'merge-with-successor': 'merge_with_successor',
  'exclude-structural-heading': 'merge_with_successor',
  'retain-intro-segment': 'confirm_successor_start',
}

const publicDecisionId = (decision) => decision.decision_id ?? decision.same_page_decision_id
const publicOutcome = (decision) => decision.selected_outcome ?? decision.selected_decision
const safeLocator = (locator) => locator ? JSON.parse(JSON.stringify(locator)) : null

const segmentContexts = async () => {
  const packets = await readJson(paths.sourceInspectionPackets)
  const byKey = new Map()
  for (const packet of packets.packets ?? []) {
    for (const item of packet.items ?? []) {
      const current = item.context?.current ?? item
      const successor = item.context?.successor ?? null
      byKey.set(item.segment_key, { item, current, successor })
    }
  }
  return byKey
}

export const derivePackage = async () => {
  const [progress, recovery, book3Manual, remainingManual, contexts] = await Promise.all([
    readJson(paths.progress),
    readJson(paths.recoveryConsolidation),
    readJson(paths.book3Manual),
    readJson(paths.remainingManual),
    segmentContexts(),
  ])

  const expectedProgress = {
    reviewed_count: 133,
    unresolved_count: 11,
    pending_count: 0,
    public_decision_count: 144,
    completed_packet_count: 16,
    pending_packet_count: 0,
  }
  for (const [key, expected] of Object.entries(expectedProgress)) {
    if (progress.totals?.[key] !== expected) {
      throw new Error(`${key}: expected ${expected}, found ${progress.totals?.[key]}`)
    }
  }

  const decisions = []
  for (const sourceArtifact of paths.decisionInputs) {
    const artifact = await readJson(sourceArtifact)
    if (artifact.contains_source_excerpt !== false || artifact.contains_full_text === true) {
      throw new Error(`${sourceArtifact}: source text boundary is unsafe`)
    }
    for (const decision of artifact.decisions ?? []) decisions.push({ ...decision, source_artifact: sourceArtifact })
  }
  if (decisions.length !== 144) throw new Error(`Expected 144 public decisions, found ${decisions.length}`)

  const recoveryByOriginalId = new Map((recovery.resolved_recoveries ?? []).map((item) => [item.original_decision_id, item]))
  const manualByOriginalId = new Map([...book3Manual.decisions, ...remainingManual.decisions].map((item) => [item.original_decision_id, item]))
  const finalDecisions = decisions.map((decision) => {
    const id = publicDecisionId(decision)
    const resolution = recoveryByOriginalId.get(id) ?? manualByOriginalId.get(id)
    if (!resolution) return { ...decision, final_decision_id: id, final_outcome: publicOutcome(decision), final_review_status: decision.review_status }
    return {
      ...decision,
      final_decision_id: id,
      final_resolution_id: resolution.recovery_id ?? resolution.adjudication_id ?? resolution.manual_decision_id,
      final_resolution_artifact: resolution.source_artifact ?? (manualByOriginalId.has(id) ? 'manual-adjudication' : 'recovery-consolidation'),
      final_outcome: resolution.selected_decision,
      final_review_status: 'reviewed',
      reviewer_confidence: resolution.reviewer_confidence,
    }
  })

  const ids = new Set(finalDecisions.map((decision) => decision.final_decision_id))
  if (ids.size !== finalDecisions.length) throw new Error('Duplicate public decision identities detected')

  const unresolved = finalDecisions.filter((decision) => decision.final_review_status === 'unresolved' || decision.final_outcome === 'unresolved')
  const resolved = finalDecisions.filter((decision) => decision.final_review_status === 'reviewed' && decision.final_outcome !== 'unresolved')
  if (resolved.length !== 133 || unresolved.length !== 11) throw new Error(`Expected 133 resolved/11 unresolved; found ${resolved.length}/${unresolved.length}`)

  const operations = resolved.map((decision) => {
    const operationType = outcomeToOperationType[decision.final_outcome]
    if (!operationType) throw new Error(`${decision.final_decision_id}: unknown outcome ${decision.final_outcome}`)
    if (!decision.segment_key || !Number.isInteger(decision.book_id) || !Number.isInteger(decision.segment_order)) throw new Error(`${decision.final_decision_id}: missing source identity`)
    const context = contexts.get(decision.segment_key)
    const successorKey = decision.successor_segment_key ?? context?.current?.end_locator?.next_segment_key ?? context?.successor?.segment_key
    const successorOrder = decision.successor_segment_order ?? context?.successor?.segment_order ?? decision.segment_order + 1
    if (!successorKey) throw new Error(`${decision.final_decision_id}: missing successor identity`)
    if (!(successorOrder > decision.segment_order)) throw new Error(`${decision.final_decision_id}: invalid successor ordering`)
    const selectedPair = decision.selected_pair ?? {}
    const currentStartLocator = safeLocator(context?.current?.start_locator)
    const successorStartLocator = safeLocator(context?.successor?.start_locator ?? context?.current?.end_locator?.next_start_locator)
    return {
      operation_id: `pr0048-${decision.final_decision_id}`,
      decision_id: decision.final_decision_id,
      resolution_id: decision.final_resolution_id ?? null,
      packet_id: decision.packet_id,
      book_id: decision.book_id,
      book_slug: decision.book_slug,
      segment_key: decision.segment_key,
      segment_order: decision.segment_order,
      successor_segment_key: successorKey,
      successor_segment_order: successorOrder,
      outcome: decision.final_outcome,
      operation_type: operationType,
      reviewer_confidence: decision.reviewer_confidence,
      source_artifact: decision.source_artifact,
      resolution_artifact: decision.final_resolution_artifact ?? null,
      expected_current_start_locator: currentStartLocator,
      expected_current_end_locator: safeLocator(context?.current?.end_locator),
      approved_successor_start_locator: successorStartLocator,
      approved_pair_metadata: {
        current_source_pdf_page: selectedPair.current?.source_pdf_page ?? decision.evidence?.source_pdf_page_reviewed ?? null,
        successor_source_pdf_page: selectedPair.successor?.source_pdf_page ?? decision.evidence?.successor_source_pdf_page_reviewed ?? null,
        current_precedes_successor: selectedPair.current_precedes_successor ?? decision.evidence?.current_precedes_successor ?? true,
      },
    }
  }).sort((left, right) => left.book_id - right.book_id || left.segment_order - right.segment_order || left.decision_id.localeCompare(right.decision_id))

  const operationIds = new Set(operations.map((operation) => operation.operation_id))
  const operationTargets = new Set(operations.map((operation) => `${operation.book_id}:${operation.segment_key}`))
  if (operationIds.size !== operations.length || operationTargets.size !== operations.length) throw new Error('Duplicate or conflicting operations detected')

  return { progress, finalDecisions, resolved, unresolved, operations }
}

const targetCte = (operations) => `targets as (\n  select *\n  from jsonb_to_recordset(\n    $vereda_pr0048_targets$${JSON.stringify(operations)}$vereda_pr0048_targets$::jsonb\n  ) as target (\n    operation_id text,\n    decision_id text,\n    resolution_id text,\n    packet_id text,\n    book_id integer,\n    book_slug text,\n    segment_key text,\n    segment_order integer,\n    successor_segment_key text,\n    successor_segment_order integer,\n    outcome text,\n    operation_type text,\n    reviewer_confidence text,\n    source_artifact text,\n    resolution_artifact text,\n    expected_current_start_locator jsonb,\n    expected_current_end_locator jsonb,\n    approved_successor_start_locator jsonb,\n    approved_pair_metadata jsonb\n  )\n)`

const checkSelects = (checks) => checks.map((check) => `select\n  ${sqlLiteral(check.key)}::text as check_key,\n  'blocking'::text as severity,\n  (${check.passed}) as passed,\n  (${check.actual})::text as actual_value,\n  ${check.details ?? "'{}'::jsonb"} as details`).join('\nunion all\n')

const applicationSql = ({ runId, operations }) => `-- PR-0048 reviewed boundary application package.\n-- Prepared for manual review only; repository scripts must not execute this SQL.\n-- Operation count: ${operations.length}. Unresolved decisions excluded: 11.\nbegin;\n\nwith ${targetCte(operations)},\nblocking_checks as (\n  ${checkSelects([
    { key: 'target-count', passed: `(select count(*) from targets) = ${operations.length}`, actual: `select count(*) from targets` },
    { key: 'unique-operation-ids', passed: `(select count(*) from targets) = (select count(distinct operation_id) from targets)`, actual: `select count(*) - count(distinct operation_id) from targets` },
    { key: 'unresolved-excluded', passed: `not exists (select 1 from targets where outcome = 'unresolved')`, actual: `select count(*) from targets where outcome = 'unresolved'` },
    { key: 'source-rows-present', passed: `(select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.segment_key) = ${operations.length}`, actual: `select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.segment_key` },
    { key: 'successor-rows-present', passed: `(select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.successor_segment_key) = ${operations.length}`, actual: `select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.successor_segment_key` },
    { key: 'not-already-applied', passed: `not exists (select 1 from content_staging.migration_audit_events where run_id = ${sqlLiteral(runId)}::uuid and event_type = 'pr0048-reviewed-boundary-operation-applied')`, actual: `select count(*) from content_staging.migration_audit_events where run_id = ${sqlLiteral(runId)}::uuid and event_type = 'pr0048-reviewed-boundary-operation-applied'` },
  ])}\n),\nassertions as (\n  select case\n    when exists (select 1 from blocking_checks where not passed)\n    then raise_exception('PR-0048 reviewed boundary application preconditions failed')\n    else true\n  end as passed\n),\nupdated as (\n  update content_staging.reading_segments segment\n  set\n    approval_status = 'content-review',\n    end_locator = jsonb_set(\n      coalesce(segment.end_locator, '{}'::jsonb),\n      '{pr0048_reviewed_boundary_application}',\n      jsonb_build_object(\n        'operation_id', target.operation_id,\n        'decision_id', target.decision_id,\n        'operation_type', target.operation_type,\n        'successor_segment_key', target.successor_segment_key\n      ),\n      true\n    ),\n    updated_at = now()\n  from targets target, assertions\n  where segment.run_id = ${sqlLiteral(runId)}::uuid\n    and segment.book_id = target.book_id\n    and segment.segment_key = target.segment_key\n    and segment.approval_status = 'boundary-review'\n  returning target.operation_id\n),\nupdate_count as (\n  select case\n    when (select count(*) from updated) = ${operations.length}\n    then true\n    else raise_exception('PR-0048 reviewed boundary application updated an unexpected row count')\n  end as passed\n)\ninsert into content_staging.migration_audit_events (\n  run_id,\n  event_type,\n  event_payload\n)\nselect\n  ${sqlLiteral(runId)}::uuid,\n  'pr0048-reviewed-boundary-operation-applied',\n  to_jsonb(target)\nfrom targets target, update_count;\n\ncommit;\n`

const verificationSql = ({ runId, operations, phase }) => `-- PR-0048 ${phase} verification SQL.\n-- Manual verification only; not executed by repository scripts.\nwith ${targetCte(operations)}\n${checkSelects(phase === 'pre-apply' ? [
  { key: 'target-count', passed: `(select count(*) from targets) = ${operations.length}`, actual: `select count(*) from targets` },
  { key: 'no-unresolved-targets', passed: `not exists (select 1 from targets where outcome = 'unresolved')`, actual: `select count(*) from targets where outcome = 'unresolved'` },
  { key: 'expected-books-only', passed: `not exists (select 1 from targets where book_id not between 1 and 5)`, actual: `select count(*) from targets where book_id not between 1 and 5` },
  { key: 'source-rows-present', passed: `(select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.segment_key) = ${operations.length}`, actual: `select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.segment_key` },
  { key: 'successor-rows-present', passed: `(select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.successor_segment_key) = ${operations.length}`, actual: `select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.successor_segment_key` },
  { key: 'no-duplicate-segments', passed: `(select count(*) from content_staging.reading_segments where run_id = ${sqlLiteral(runId)}::uuid) = (select count(distinct book_id || ':' || segment_key) from content_staging.reading_segments where run_id = ${sqlLiteral(runId)}::uuid)`, actual: `select count(*) - count(distinct book_id || ':' || segment_key) from content_staging.reading_segments where run_id = ${sqlLiteral(runId)}::uuid` },
  { key: 'not-already-applied', passed: `not exists (select 1 from content_staging.migration_audit_events where run_id = ${sqlLiteral(runId)}::uuid and event_type = 'pr0048-reviewed-boundary-operation-applied')`, actual: `select count(*) from content_staging.migration_audit_events where run_id = ${sqlLiteral(runId)}::uuid and event_type = 'pr0048-reviewed-boundary-operation-applied'` },
  { key: 'valid-ordering', passed: `not exists (select 1 from targets where successor_segment_order <= segment_order)`, actual: `select count(*) from targets where successor_segment_order <= segment_order` },
] : [
  { key: 'applied-exactly-once', passed: `(select count(*) from content_staging.migration_audit_events where run_id = ${sqlLiteral(runId)}::uuid and event_type = 'pr0048-reviewed-boundary-operation-applied') = ${operations.length}`, actual: `select count(*) from content_staging.migration_audit_events where run_id = ${sqlLiteral(runId)}::uuid and event_type = 'pr0048-reviewed-boundary-operation-applied'` },
  { key: 'targets-content-review', passed: `(select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.segment_key where segment.approval_status = 'content-review') = ${operations.length}`, actual: `select count(*) from targets target join content_staging.reading_segments segment on segment.run_id = ${sqlLiteral(runId)}::uuid and segment.book_id = target.book_id and segment.segment_key = target.segment_key where segment.approval_status = 'content-review'` },
  { key: 'unresolved-not-applied', passed: `not exists (select 1 from targets where outcome = 'unresolved')`, actual: `select count(*) from targets where outcome = 'unresolved'` },
  { key: 'valid-ordering', passed: `not exists (select 1 from targets where successor_segment_order <= segment_order)`, actual: `select count(*) from targets where successor_segment_order <= segment_order` },
])};\n`

export const buildArtifacts = async () => {
  const derived = await derivePackage()
  const { progress, finalDecisions, resolved, unresolved, operations } = derived
  await mkdir('content/migration/reports', { recursive: true })
  await mkdir('supabase/staging', { recursive: true })
  await mkdir('supabase/audits', { recursive: true })

  const policy = {
    schema_version: 'pr0048-reviewed-boundary-application-policy-v1',
    run_id: progress.run_id,
    status: 'reviewed-boundary-application-package-prepared-not-applied',
    rights_status: 'credited-source-edition',
    hash_algorithm: 'sha256-canonical-json-v1',
    text_hash_algorithm: 'sha256-normalized-lf-text-v1',
    database_objects: ['content_staging.reading_segments', 'content_staging.migration_audit_events'],
    allowed_outcome_operations: outcomeToOperationType,
    application_boundary: {
      package_prepared: true,
      package_validated: true,
      migration_applied: false,
      database_modified: false,
      supabase_modified: false,
      production_modified: false,
      user_progress_modified: false,
      reader_sessions_modified: false,
      cutover_enabled: false,
    },
  }

  const plan = {
    schema_version: 'pr0048-reviewed-boundary-application-plan-v1',
    run_id: progress.run_id,
    status: policy.status,
    rights_status: policy.rights_status,
    hash_algorithm: policy.hash_algorithm,
    totals: {
      public_decision_count: finalDecisions.length,
      eligible_resolved_decision_count: resolved.length,
      excluded_unresolved_decision_count: unresolved.length,
      expected_sql_operation_count: operations.length,
    },
    outcome_distribution: distribution(finalDecisions, 'final_outcome'),
    confidence_distribution: distribution(finalDecisions, 'reviewer_confidence'),
    book_distribution: distribution(finalDecisions, 'book_id'),
    packet_distribution: distribution(finalDecisions, 'packet_id'),
    application_operation_distribution: distribution(operations, 'operation_type'),
    operations,
    unresolved_exclusions: unresolved.map((decision) => ({
      decision_id: decision.final_decision_id,
      book_id: decision.book_id,
      packet_id: decision.packet_id,
      segment_key: decision.segment_key,
      unresolved_status: decision.final_review_status,
      exclusion_reason: 'unresolved-public-decision-not-eligible-for-application',
    })).sort((left, right) => left.decision_id.localeCompare(right.decision_id)),
  }

  await writeFile(paths.policy, `${JSON.stringify(policy, null, 2)}\n`)
  await writeFile(paths.plan, `${JSON.stringify(plan, null, 2)}\n`)
  await writeFile(paths.applicationSql, applicationSql({ runId: progress.run_id, operations }))
  await writeFile(paths.preApplySql, verificationSql({ runId: progress.run_id, operations, phase: 'pre-apply' }))
  await writeFile(paths.postApplySql, verificationSql({ runId: progress.run_id, operations, phase: 'post-apply' }))

  const inputHashes = {
    immutable_historical_progress_sha256: await canonicalJsonSha256(paths.historicalProgress),
    archived_pr0045_pr0046_progress_snapshot_sha256: await canonicalJsonSha256(paths.pr0045Current),
    current_pr0047_cumulative_progress_sha256: await canonicalJsonSha256(paths.progress),
  }
  for (const path of paths.decisionInputs) inputHashes[`${path.split('/').at(-1).replace('.json', '').replaceAll('-', '_')}_sha256`] = await canonicalJsonSha256(path)

  const evidence = {
    schema_version: 'pr0048-reviewed-boundary-application-evidence-v1',
    run_id: progress.run_id,
    status: policy.status,
    rights_status: policy.rights_status,
    hash_algorithm: policy.hash_algorithm,
    text_hash_algorithm: policy.text_hash_algorithm,
    input_state: {
      reviewed_count: progress.totals.reviewed_count,
      unresolved_count: progress.totals.unresolved_count,
      pending_count: progress.totals.pending_count,
      public_decision_count: progress.totals.public_decision_count,
      completed_packet_count: progress.totals.completed_packet_count,
      pending_packet_count: progress.totals.pending_packet_count,
    },
    totals: plan.totals,
    outcome_distribution: plan.outcome_distribution,
    confidence_distribution: plan.confidence_distribution,
    book_distribution: plan.book_distribution,
    packet_distribution: plan.packet_distribution,
    application_operation_distribution: plan.application_operation_distribution,
    unresolved_exclusions: plan.unresolved_exclusions,
    input_hashes: inputHashes,
    artifact_hashes: {
      application_policy_sha256: canonicalJsonSha256FromValue(policy),
      application_plan_sha256: canonicalJsonSha256FromValue(plan),
      generated_application_sql_sha256: await normalizedTextSha256(paths.applicationSql),
      pre_apply_verification_sql_sha256: await normalizedTextSha256(paths.preApplySql),
      post_apply_verification_sql_sha256: await normalizedTextSha256(paths.postApplySql),
    },
    preservation_assertions: {
      progress_snapshots_unchanged: true,
      historical_artifacts_unchanged: true,
      contains_source_text: false,
      contains_source_excerpt: false,
      contains_private_evidence: false,
    },
    non_execution_assertions: policy.application_boundary,
    database_boundary_assertions: {
      exact_database_objects_referenced: policy.database_objects,
      production_object_referenced: false,
      sql_executed: false,
    },
    cutover_boundary_assertions: { cutover_enabled: false },
  }
  await writeFile(paths.evidence, `${JSON.stringify(evidence, null, 2)}\n`)

  await writeFile(paths.summary, `# PR-0048 Reviewed Boundary Application Package\n\nApplication package prepared: YES\nApplication package validated: YES\nMigration applied: NO\nDatabase modified: NO\nProduction modified: NO\nCutover enabled: NO\n\n- Public decisions inspected: ${plan.totals.public_decision_count}\n- Eligible resolved decisions: ${plan.totals.eligible_resolved_decision_count}\n- Excluded unresolved decisions: ${plan.totals.excluded_unresolved_decision_count}\n- Expected SQL operation count: ${plan.totals.expected_sql_operation_count}\n- Database objects referenced: ${policy.database_objects.join(', ')}\n- Production objects referenced: none\n\nGenerated SQL is deterministic, reviewable, and intended for manual future use only. Repository scripts generate and validate artifacts but do not connect to Supabase or execute SQL.\n`)

  return { policy, plan, evidence }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { plan } = await buildArtifacts()
  console.log('Prepared PR-0048 reviewed boundary application package.')
  console.log(JSON.stringify(plan.totals, null, 2))
}
