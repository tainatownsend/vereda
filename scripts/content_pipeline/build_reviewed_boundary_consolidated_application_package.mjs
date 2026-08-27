import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from './hash_utils.mjs'
import { deriveStatusOnlyContract } from './build_source_review_status_only_contract.mjs'
import { paths, targetTable, targetColumns, changedColumns, preservedColumns, databaseManagedColumns, unavailableColumns, blockingColumns } from './reviewed_boundary_consolidated_constants.mjs'

const lfSha = (text) => createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex')
export const normalizedTextSha256 = async (p) => lfSha(await readFile(p, 'utf8'))
const dist = (xs, f) => xs.reduce((a, x) => ((a[f(x)] = (a[f(x)] ?? 0) + 1), a), {})
const sort = (xs) => [...xs].sort((a,b)=>a.decision_id.localeCompare(b.decision_id))
const unchangedColumns = preservedColumns
export const authoritativeSchema = {
  source: paths.stagingSchema,
  migrations_inspected: ['supabase/migrations/20260803033000_content_staging_foundation.sql'],
  table: targetTable,
  columns: [
    { name:'run_id', data_type:'uuid', nullable:false, default:null, checks:[], foreign_key:'content_staging.migration_runs(id) on delete cascade' },
    { name:'book_id', data_type:'integer', nullable:false, default:null, checks:[], foreign_key:'public.books(id) on delete restrict' },
    { name:'segment_key', data_type:'text', nullable:false, default:null, checks:["segment_key ~ '^[a-f0-9]{20,64}$'"] },
    { name:'source_key', data_type:'text', nullable:false, default:null, checks:[], foreign_key:'content_staging.editorial_nodes(run_id, book_id, source_key) on delete restrict' },
    { name:'segment_order', data_type:'integer', nullable:false, default:null, checks:['segment_order > 0'] },
    { name:'segment_index', data_type:'integer', nullable:false, default:'1', checks:['segment_index > 0','segment_index <= segment_count'] },
    { name:'segment_count', data_type:'integer', nullable:false, default:'1', checks:['segment_count > 0'] },
    { name:'boundary_version', data_type:'integer', nullable:false, default:'1', checks:['boundary_version > 0'] },
    { name:'start_locator', data_type:'jsonb', nullable:true, default:null, checks:[] },
    { name:'end_locator', data_type:'jsonb', nullable:true, default:null, checks:[] },
    { name:'display_title', data_type:'text', nullable:true, default:null, checks:[] },
    { name:'content', data_type:'text', nullable:true, default:null, checks:['approval_status approved requires content not null'] },
    { name:'word_count', data_type:'integer', nullable:true, default:null, checks:['word_count is null or word_count >= 0','approval_status approved requires word_count not null'] },
    { name:'normalized_content_sha256', data_type:'text', nullable:true, default:null, checks:["normalized_content_sha256 is null or normalized_content_sha256 ~ '^[a-f0-9]{64}$'", 'approval_status approved requires normalized_content_sha256 not null'] },
    { name:'approval_status', data_type:'text', nullable:false, default:"'draft'", checks:["approval_status in ('draft','boundary-review','content-review','approved','blocked')"] },
    { name:'created_at', data_type:'timestamptz', nullable:false, default:'now()', checks:[] },
    { name:'updated_at', data_type:'timestamptz', nullable:false, default:'now()', checks:[] },
  ],
  primary_key: ['run_id','book_id','segment_key'],
  unique_constraints: [['run_id','book_id','segment_order']],
  foreign_keys: [
    { columns:['run_id'], references:'content_staging.migration_runs(id)', on_delete:'cascade' },
    { columns:['book_id'], references:'public.books(id)', on_delete:'restrict' },
    { columns:['run_id','book_id','source_key'], references:'content_staging.editorial_nodes(run_id, book_id, source_key)', on_delete:'restrict' },
  ],
  triggers: [],
  updated_at_behavior: 'default now() applies on INSERT only; no trigger or repository convention was found that updates content_staging.reading_segments.updated_at during UPDATE, so PR-0053 classifies updated_at as explicitly preserved by omission from the authorized update column set',
}
const safety = { executable_application_sql_generated:false, sql_executed:false, database_modified:false, supabase_modified:false, production_modified:false, ui_modified:false, source_text_modified:false, user_progress_modified:false, reader_sessions_modified:false, bookmarks_modified:false, notes_modified:false, highlights_modified:false, cutover_enabled:false }

export const derivePackage = async () => {
  const derived = await deriveStatusOnlyContract()
  const statusPlan = JSON.parse(await readFile(paths.statusPlan, 'utf8'))
  const statusContractIds = new Set(statusPlan.authorized_decisions.map(r=>r.decision_id))
  const authorized = sort(derived.eligible.filter(r => statusContractIds.has(r.decision_id))).map(r => ({
    decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id, final_outcome:r.final_outcome,
    segment_key:r.segment_key, segment_order:r.segment_order, target_table:targetTable,
    target_row_identity:{ run_id:derived.readiness.progress.run_id, book_id:r.book_id, segment_key:r.segment_key },
    expected_run_id:derived.readiness.progress.run_id, expected_current_approval_status:'boundary-review', authorized_replacement_approval_status:'content-review',
    changed_columns:changedColumns, unchanged_columns:unchangedColumns,
    locator_preservation_assertion:'start_locator and end_locator must remain byte-for-byte unchanged from the verified staging row; no exact replacement locator is authorized by this package',
    content_preservation_assertion:'content and normalized_content_sha256 are not selected for mutation and must remain unchanged where authoritative baselines exist',
    identity_preservation_assertion:'run_id, book_id, and segment_key are immutable target identity columns', order_preservation_assertion:'segment_order is immutable and only used as a verified precondition',
    reference_preservation_assertion:'user_progress, reading_sessions, bookmarks, notes, and highlights are not mutated',
    audit_event_identity:`pr0053:${derived.readiness.progress.run_id}:${r.book_id}:${r.segment_key}:${r.decision_id}:approval_status`,
    idempotency_key:`pr0053:${derived.readiness.progress.run_id}:${r.book_id}:${r.segment_key}:boundary-review:content-review`,
    rollback_identity:`pr0053-rollback:${derived.readiness.progress.run_id}:${r.book_id}:${r.segment_key}:${r.decision_id}`,
    source_contract_artifact:paths.statusPlan, application_ready:true,
  }))
  const excluded = sort(derived.excluded).map(r => {
    const lane = r.final_outcome === 'adjust-successor-start' ? 'locator-adjustment contract' : r.final_outcome === 'exclude-structural-heading' ? 'structural-heading contract' : 'unresolved/ineligible'
    const artifact = r.final_outcome === 'adjust-successor-start' ? paths.locatorContract : r.final_outcome === 'exclude-structural-heading' ? paths.headingContract : paths.finalUnresolvedDecisions
    return { decision_id:r.decision_id, book_id:r.book_id, book_slug:r.book_slug, packet_id:r.packet_id, final_outcome:r.final_outcome, segment_key:r.segment_key, segment_order:r.segment_order, exclusion_lane:lane, blocking_contract_artifact:artifact, blocking_reason: lane === 'locator-adjustment contract' ? 'PR-0050 does not approve exact locator mutation authority' : lane === 'structural-heading contract' ? 'PR-0051 does not approve merge/exclusion/deletion/remapping authority' : 'PR-0052 leaves the decision unresolved and application-ineligible', application_ready:false, included_in_sql:false }
  })
  const missing = [
    { authority:'audit inserts', blocking_reason:'PR-0049 requires one migration_audit_events record per decision but does not define exact event_type, payload schema, uniqueness key, timestamp rule, or conflict behavior for PR-0053.' },
    { authority:'executable idempotency', blocking_reason:'PR-0049 describes safe repeat behavior but no repository-supported exact SQL reconciliation rule exists for first, repeated, or partial application.' },
    { authority:'rollback SQL', blocking_reason:'PR-0049 explicitly defers rollback to a separately reviewed package and generated no rollback SQL.' },
    { authority:'content hash preconditions', blocking_reason:'The status-only contract preserves content but does not provide exact per-row expected normalized_content_sha256 values or an independent expected hash of content for all 74 targets.' },
  ]
  return { runId:derived.readiness.progress.run_id, all:derived.readiness.records, authorized, excluded, missing, outcomeDistribution:dist(authorized, r=>r.final_outcome), exclusionDistribution:dist(excluded, r=>r.final_outcome), packageApproved:false }
}

export const buildArtifacts = async () => {
  const p = await derivePackage(); const scannedMigrations = (await readdir(paths.migrationsDir)).filter(f=>f.endsWith('.sql')&&f!=='20260805005500_reviewed_boundary_audit_identity.sql').sort().map(f=>join(paths.migrationsDir,f)); const matchingMigrations = ['supabase/migrations/20260803033000_content_staging_foundation.sql']; await mkdir('content/migration/reports',{recursive:true}); await mkdir('docs/content-pipeline',{recursive:true}); await mkdir('supabase/audits',{recursive:true})
  const tupleHash = canonicalJsonSha256FromValue(p.authorized.map(r=>r.target_row_identity)); const exclusionHash = canonicalJsonSha256FromValue(p.excluded.map(r=>({decision_id:r.decision_id, lane:r.exclusion_lane})))
  const schemaModel = { schema_version:'pr0053-reviewed-boundary-consolidated-staging-schema-v1', ...authoritativeSchema, migrations_scanned:scannedMigrations, migrations_matching:matchingMigrations, column_classification:{ explicitly_changed:changedColumns, explicitly_preserved:preservedColumns, database_managed:databaseManagedColumns, unavailable_for_comparison:unavailableColumns, blocking_authority_missing:blockingColumns } }
  const policy = { schema_version:'pr0053-reviewed-boundary-consolidated-application-policy-v1', package_id:'reading-segment-reviewed-boundary-consolidated-application-pr0053', package_approved:false, rights_status:'credited-source-edition', run_id:p.runId, authorized_transition:{ table:targetTable, column:'approval_status', from:'boundary-review', to:'content-review' }, changed_columns:changedColumns, column_classification:{ explicitly_changed:changedColumns, explicitly_preserved:preservedColumns, database_managed:databaseManagedColumns, unavailable_for_comparison:unavailableColumns, blocking_authority_missing:blockingColumns }, unchanged_columns:unchangedColumns, executable_application_sql_generated:false, executable_rollback_sql_generated:false, safety_assertions:safety }
  const plan = { schema_version:'pr0053-reviewed-boundary-consolidated-application-plan-v1', package_approved:false, run_id:p.runId, authorized_decision_count:p.authorized.length, excluded_decision_count:p.excluded.length, target_table:targetTable, target_identity_columns:targetColumns, changed_columns:changedColumns, column_classification:{ explicitly_changed:changedColumns, explicitly_preserved:preservedColumns, database_managed:databaseManagedColumns, unavailable_for_comparison:unavailableColumns, blocking_authority_missing:blockingColumns }, unchanged_columns:unchangedColumns, application_records:p.authorized }
  const exclusions = { schema_version:'pr0053-reviewed-boundary-consolidated-exclusions-v1', excluded_decision_count:p.excluded.length, exclusion_distribution:p.exclusionDistribution, exclusions:p.excluded }
  const missing = { schema_version:'pr0053-reviewed-boundary-consolidated-missing-authority-v1', package_approved:false, executable_application_sql_generated:false, executable_rollback_sql_generated:false, missing_authority:p.missing }
  const preflight = { schema_version:'pr0053-reviewed-boundary-consolidated-preflight-v1', fail_closed:true, select_only_sql:paths.preflightSql, checks:['schema objects and constraints exist','exactly 74 target rows exist once by run_id/book_id/segment_key','each target has expected segment_order and boundary-review approval_status','authorized/excluded decision sets are disjoint','no conflicting audit event exists','locator values, content, and normalized_content_sha256 are preserved when authoritative baselines are available; missing baselines are recorded as missing authority','user reference tables are not targeted','public-decision and contract hashes match manifest'] }
  const postflight = { schema_version:'pr0053-reviewed-boundary-consolidated-postflight-v1', select_only_sql:paths.postflightSql, checks:['exactly 74 authorized rows have content-review','zero authorized rows remain boundary-review','all 70 excluded decisions are absent from application SQL and unchanged','future application SQL may update only approval_status; updated_at must remain unchanged because no trigger or explicit update authority exists; before/after proof requires a recorded baseline','audit exactness is checked only after audit authority exists','reconstruction and editorial-node validators remain required'] }
  const audit = { schema_version:'pr0053-reviewed-boundary-consolidated-audit-v1', audit_required:true, audit_complete:false, audit_table:'content_staging.migration_audit_events', executable_audit_sql_generated:false, blocking_reason:p.missing[0].blocking_reason }
  const idempotency = { schema_version:'pr0053-reviewed-boundary-consolidated-idempotency-v1', idempotency_complete:false, first_application:'would require all 74 rows in boundary-review', safe_repeat:'blocked until exact audit and already-applied SQL behavior are authorized', partial_prior_application:'blocked; must fail closed rather than silently apply remaining rows', unexpected_state:'abort' }
  const rollback = { schema_version:'pr0053-reviewed-boundary-consolidated-rollback-v1', rollback_sql_generated:false, rollback_authority_complete:false, blocking_reason:p.missing[2].blocking_reason }
  await writeFile(paths.schemaModel, JSON.stringify(schemaModel,null,2)+'\n'); await writeFile(paths.policy, JSON.stringify(policy,null,2)+'\n'); await writeFile(paths.plan, JSON.stringify(plan,null,2)+'\n'); await writeFile(paths.exclusions, JSON.stringify(exclusions,null,2)+'\n'); await writeFile(paths.missingAuthority, JSON.stringify(missing,null,2)+'\n'); await writeFile(paths.preflight, JSON.stringify(preflight,null,2)+'\n'); await writeFile(paths.postflight, JSON.stringify(postflight,null,2)+'\n'); await writeFile(paths.audit, JSON.stringify(audit,null,2)+'\n'); await writeFile(paths.idempotency, JSON.stringify(idempotency,null,2)+'\n'); await writeFile(paths.rollback, JSON.stringify(rollback,null,2)+'\n')
  const preSql = `-- PR-0053 SELECT-only consolidated preflight inspection.\n-- This file must not be executed by this package builder or validator.\nwith expected_targets(decision_id, run_id, book_id, segment_key, segment_order, expected_status) as (\n${p.authorized.map((r,i)=>`  ${i?',':''}values ('${r.decision_id}', '${p.runId}'::uuid, ${r.book_id}, '${r.segment_key}', ${r.segment_order}, 'boundary-review')`).join('\n').replace(/,values/g, ',')}\n)\nselect 'target_status_preflight' as check_key, count(*) as matched_rows\nfrom expected_targets et\njoin content_staging.reading_segments rs on rs.run_id = et.run_id and rs.book_id = et.book_id and rs.segment_key = et.segment_key\nwhere rs.segment_order = et.segment_order and rs.approval_status = et.expected_status;\n`
  const postSql = preSql.replace('preflight inspection','post-application verification').replace(/boundary-review/g,'content-review').replace('target_status_preflight','target_status_postflight')
  await writeFile(paths.preflightSql, preSql); await writeFile(paths.postflightSql, postSql)
  const evidence = { schema_version:'pr0053-reviewed-boundary-consolidated-application-evidence-v1', package_approved:false, totals:{ public_decision_count:p.all.length, authorized_decisions:p.authorized.length, excluded_decisions:p.excluded.length }, authorized_outcome_distribution:p.outcomeDistribution, exclusion_distribution:p.exclusionDistribution, input_hashes:{ status_contract_sha256:await canonicalJsonSha256(paths.statusContract), status_plan_sha256:await canonicalJsonSha256(paths.statusPlan), status_evidence_sha256:await canonicalJsonSha256(paths.statusEvidence), locator_contract_sha256:await canonicalJsonSha256(paths.locatorContract), heading_contract_sha256:await canonicalJsonSha256(paths.headingContract), final_unresolved_decisions_sha256:await canonicalJsonSha256(paths.finalUnresolvedDecisions), staging_schema_sha256:await normalizedTextSha256(paths.stagingSchema) }, target_tuple_hash:tupleHash, exclusion_tuple_hash:exclusionHash, safety_assertions:safety }
  await writeFile(paths.evidence, JSON.stringify(evidence,null,2)+'\n')
  const manifest = { schema_version:'pr0053-reviewed-boundary-consolidated-application-manifest-v1', package_id:policy.package_id, package_version:'1.0.0', expected_main_base_authority:'d508bd0af61f3c1f2cd8fa0696820543c687bfcf', package_approved:false, rights_status:'credited-source-edition', hash_algorithms:{ json:'sha256-canonical-json-v1', text_sql:'sha256-normalized-lf-text-v1' }, authorized_count:p.authorized.length, excluded_count:p.excluded.length, target_tuple_hash:tupleHash, exclusion_tuple_hash:exclusionHash, sql_artifact_hashes:{ executable_application_sql:null, executable_rollback_sql:null, preflight_select_sql_sha256:await normalizedTextSha256(paths.preflightSql), postflight_select_sql_sha256:await normalizedTextSha256(paths.postflightSql) }, artifact_hashes:{ schema_model_sha256:canonicalJsonSha256FromValue(schemaModel), policy_sha256:canonicalJsonSha256FromValue(policy), plan_sha256:canonicalJsonSha256FromValue(plan), exclusions_sha256:canonicalJsonSha256FromValue(exclusions), evidence_sha256:canonicalJsonSha256FromValue(evidence), preflight_sha256:canonicalJsonSha256FromValue(preflight), postflight_sha256:canonicalJsonSha256FromValue(postflight), idempotency_sha256:canonicalJsonSha256FromValue(idempotency), audit_sha256:canonicalJsonSha256FromValue(audit), rollback_sha256:canonicalJsonSha256FromValue(rollback), missing_authority_sha256:canonicalJsonSha256FromValue(missing) }, safety_assertions:safety }
  await writeFile(paths.manifest, JSON.stringify(manifest,null,2)+'\n')
  const summary = `# PR-0053 Consolidated Reviewed-Boundary Application Package\n\nPackage approved: false. The exact 74 status-only decisions and 70 exclusions are identified, but executable application and rollback SQL are intentionally omitted because audit, executable idempotency, rollback, and per-row content-hash authority are incomplete. Future application SQL may update only approval_status; updated_at is explicitly preserved because its default is insert-time behavior and no update trigger exists.\n\nPublic decisions: ${p.all.length}. Authorized: ${p.authorized.length}. Excluded: ${p.excluded.length}. Status transition authority: content_staging.reading_segments.approval_status boundary-review -> content-review. Changed columns: approval_status only. SQL executed: false. Database modified: false.\n`
  await writeFile(paths.summary, summary); await writeFile(paths.docs, summary)
  return { policy, plan, exclusions, manifest, evidence, missing }
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify((await buildArtifacts()).evidence.totals,null,2))
