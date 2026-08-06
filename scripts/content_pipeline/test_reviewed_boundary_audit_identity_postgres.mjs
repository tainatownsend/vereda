import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { canonicalizeJson } from './hash_utils.mjs'
import { conflictTargetPredicate, eventActions, eventKeyAlgorithm, eventPackage, eventTypes, eventVersion, migrationPath, roleFixturePath, requiredSupabaseRoles, foundationMigrationPath } from './reviewed_boundary_audit_identity_constants.mjs'
import { missingIdentityFixture, parsePostgresError, sqlLiteral, transactionalSql } from './reviewed_boundary_audit_postgres_test_utils.mjs'

const evidencePath = process.env.REVIEWED_BOUNDARY_AUDIT_DB_EVIDENCE ?? 'tmp/reviewed-boundary-audit-database-validation-evidence.json'
const env = { ...process.env }
const allowedHosts = new Set(['127.0.0.1', 'localhost', 'postgres'])
const reject = message => { throw new Error(message) }
if (!env.PGHOST || !allowedHosts.has(env.PGHOST)) reject(`PGHOST must be local GitHub Actions service host, got ${env.PGHOST ?? '<unset>'}`)
if (/supabase\.co|postgres:\/\/|service_role/i.test(JSON.stringify({ PGHOST: env.PGHOST, PGDATABASE: env.PGDATABASE, PGUSER: env.PGUSER }))) reject('remote Supabase or service-role connection is forbidden')
if (/prod|production|staging/i.test(env.PGDATABASE ?? '')) reject(`PGDATABASE must be disposable, got ${env.PGDATABASE}`)

const psqlArgs = ['-v', 'ON_ERROR_STOP=1', '--set=VERBOSITY=verbose']
const psql = (sql, tuples = false) => execFileSync('psql', [...psqlArgs, ...(tuples ? ['-At'] : []), '-c', sql], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const psqlFile = file => execFileSync('psql', [...psqlArgs, '-f', file], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const qJson = sql => JSON.parse(psql(sql, true) || 'null')
const rowCount = () => Number(psql('select count(*) from content_staging.migration_audit_events;', true))
const keyMaterial = ({ run_id, decision_id, book_id, segment_key, event_action, package_id = eventPackage, event_version = eventVersion }) => {
  const pairs = [['package_id', package_id], ['event_action', event_action], ['run_id', run_id], ['decision_id', decision_id], ['book_id', String(book_id)], ['segment_key', segment_key], ['event_version', String(event_version)]]
  return eventKeyAlgorithm + pairs.map(([key, value]) => `|${key}=${String(value).length}:${value}`).join('')
}
const eventKey = input => createHash('sha256').update(keyMaterial(input), 'utf8').digest('hex')
const details = (input, overrides = {}) => canonicalizeJson({
  package_id: input.package_id ?? eventPackage,
  package_version: '1.0.0',
  event_version: input.event_version ?? eventVersion,
  event_action: input.event_action,
  decision_id: input.decision_id,
  run_id: input.run_id,
  book_id: input.book_id,
  segment_key: input.segment_key,
  previous_approval_status: input.event_action === eventActions.rollback ? 'content-review' : 'boundary-review',
  resulting_approval_status: input.event_action === eventActions.rollback ? 'boundary-review' : 'content-review',
  target_table: 'content_staging.reading_segments',
  target_identity: { run_id: input.run_id, book_id: input.book_id, segment_key: input.segment_key },
  authority_manifest_hash: 'a'.repeat(64),
  package_hash: 'b'.repeat(64),
  ...overrides,
})
const insertSql = (identity, { structured = {}, payload, payloadOverrides = {}, conflict = '' } = {}) => {
  const values = { ...identity, ...structured }
  const packageId = Object.hasOwn(values, 'package_id') ? values.package_id : eventPackage
  const version = Object.hasOwn(values, 'event_version') ? values.event_version : eventVersion
  const key = Object.hasOwn(values, 'event_key') ? values.event_key : eventKey({ ...identity, package_id: packageId, event_version: version })
  const payloadValue = payload ?? details(identity, payloadOverrides)
  const columns = ['run_id', 'event_type', 'details', 'package_id', 'event_version', 'decision_id', 'book_id', 'segment_key', 'event_action', 'event_key']
  const literals = [sqlLiteral(values.run_id, 'uuid'), sqlLiteral(values.event_type), sqlLiteral(payloadValue, 'jsonb'), sqlLiteral(packageId), sqlLiteral(version), sqlLiteral(values.decision_id), sqlLiteral(values.book_id), sqlLiteral(values.segment_key), sqlLiteral(values.event_action), sqlLiteral(key)]
  if (literals.some(value => value === '')) throw new Error('empty SQL value expression')
  return `insert into content_staging.migration_audit_events (${columns.join(',')}) values (${literals.join(', ')}) ${conflict} returning id;`
}
const conflictClause = `on conflict (event_key) where ${conflictTargetPredicate} do nothing`
const base = { run_id: '00000000-0000-4000-8000-000000000101', decision_id: 'decision000000000000000001', book_id: 1, segment_key: 'aaaaaaaaaaaaaaaaaaaa', event_action: eventActions.application, event_type: eventTypes.application }
const rollback = { ...base, decision_id: 'decision000000000000000002', event_action: eventActions.rollback, event_type: eventTypes.rollback }
const minimalPrereq = `
create table if not exists public.books (id integer primary key, title text);
create table if not exists public.sections (id integer primary key, book_id integer references public.books(id), sec_position integer not null);
create table if not exists public.user_progress (book_id integer, current_section integer, completed_at timestamptz);
create table if not exists public.reading_sessions (id integer primary key generated always as identity, user_id uuid, book_id integer, section_id integer, read_at date, duration_s integer);
insert into public.books(id,title) values (1,'Test Book') on conflict do nothing;
insert into public.sections(id,book_id,sec_position) values (1,1,1) on conflict do nothing;
`
const evidence = { validation_mode: 'github-actions-ephemeral-postgresql', workflow_name: 'Reviewed Boundary Audit Database Validation', local_host_classification: env.PGHOST, no_remote_database_used: true, no_secrets_used: true, applied_migrations: [], role_bootstrap: { fixture: roleFixturePath, required_roles: requiredSupabaseRoles, applied: false, roles: [] }, migration_success: false, tests: [], test_counts: { total: 0, passed: 0 }, persistent_reviewed_boundary_row_count_after_cleanup: null, evidence_generation_timestamp_policy: 'no wall-clock timestamp; runtime artifact only', passed: false }
const recordCase = ({ id, statement, expectedSuccess, expectedSqlstate = null, expectedConstraint = null }) => {
  const before = rowCount()
  let actualSuccess = false
  let result = ''
  let error = { sqlstate: null, constraint: null, summary: null }
  try {
    result = psql(transactionalSql(statement), true)
    actualSuccess = true
  } catch (caught) {
    error = parsePostgresError(caught)
  }
  const after = rowCount()
  const expectedError = !expectedSuccess && error.sqlstate === expectedSqlstate && (!expectedConstraint || error.constraint === expectedConstraint)
  const passed = (expectedSuccess ? actualSuccess : expectedError) && before === after
  const test = { test_id: id, expected_success: expectedSuccess, actual_success: actualSuccess, expected_sqlstate: expectedSqlstate, actual_sqlstate: error.sqlstate, expected_constraint: expectedConstraint, actual_constraint: error.constraint, state_restored: before === after, passed }
  if (!passed && error.summary) test.error_summary = error.summary
  if (actualSuccess) test.result = result.slice(0, 220)
  evidence.tests.push(test)
  return test
}
const check = '23514'
try {
  evidence.postgresql_version = psql('select version();', true)
  evidence.search_path = psql('show search_path;', true)
  psqlFile(roleFixturePath)
  evidence.applied_migrations.push(roleFixturePath)
  evidence.role_bootstrap.applied = true
  evidence.role_bootstrap.roles = qJson(`select json_agg(json_build_object('rolname', rolname, 'rolsuper', rolsuper, 'rolinherit', rolinherit, 'rolcreaterole', rolcreaterole, 'rolcreatedb', rolcreatedb, 'rolcanlogin', rolcanlogin, 'rolreplication', rolreplication) order by rolname) from pg_roles where rolname = any(array[${requiredSupabaseRoles.map(value => sqlLiteral(value)).join(',')}]);`)
  if ((evidence.role_bootstrap.roles ?? []).length !== requiredSupabaseRoles.length || evidence.role_bootstrap.roles.some(role => role.rolsuper || role.rolcreaterole || role.rolcreatedb || role.rolcanlogin || role.rolreplication)) reject('Supabase role bootstrap privilege drift')
  psql(minimalPrereq)
  evidence.applied_migrations.push('local-minimal-public-fixture')
  psqlFile(foundationMigrationPath)
  evidence.applied_migrations.push(foundationMigrationPath)
  psqlFile(migrationPath)
  evidence.applied_migrations.push(migrationPath)
  evidence.migration_success = true
  evidence.extension_state = qJson(`select json_build_object('name', e.extname, 'version', e.extversion, 'schema', n.nspname, 'digest_success', encode(extensions.digest('abc','sha256'),'hex') = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';`)
  evidence.catalog_schema = {
    columns: qJson(`select json_agg(json_build_object('name', column_name, 'type', data_type, 'nullable', is_nullable = 'YES', 'default', column_default) order by ordinal_position) from information_schema.columns where table_schema='content_staging' and table_name='migration_audit_events';`),
    primary_key: qJson(`select json_agg(a.attname order by a.attnum) from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum=any(i.indkey) where n.nspname='content_staging' and c.relname='migration_audit_events' and i.indisprimary;`),
    foreign_keys: qJson(`select json_agg(pg_get_constraintdef(oid) order by conname) from pg_constraint where conrelid='content_staging.migration_audit_events'::regclass and contype='f';`),
    constraints: qJson(`select json_object_agg(conname, pg_get_constraintdef(oid)) from pg_constraint where conrelid='content_staging.migration_audit_events'::regclass and contype='c';`),
    indexes: qJson(`select json_object_agg(indexname, indexdef) from pg_indexes where schemaname='content_staging' and tablename='migration_audit_events';`),
    triggers: qJson(`select coalesce(json_agg(tgname order by tgname),'[]'::json) from pg_trigger where tgrelid='content_staging.migration_audit_events'::regclass and not tgisinternal;`),
  }
  psql(`insert into content_staging.migration_runs(id,migration_version,input_snapshot_sha256,reconstruction_plan_sha256) values ${['00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102'].map((id, index) => `(${sqlLiteral(id, 'uuid')},'test-${index}','${'c'.repeat(64)}','${'d'.repeat(64)}')`).join(',')};`)

  recordCase({ id: 'legacy-row', statement: `insert into content_staging.migration_audit_events(run_id,event_type,details) values (${sqlLiteral(base.run_id, 'uuid')},'legacy.event','{}'::jsonb);`, expectedSuccess: true })
  recordCase({ id: 'unrelated-package', statement: `insert into content_staging.migration_audit_events(run_id,event_type,details,package_id) values (${sqlLiteral(base.run_id, 'uuid')},'other.event','{}'::jsonb,'other-package');`, expectedSuccess: true })
  for (const field of ['event_version', 'decision_id', 'book_id', 'segment_key', 'event_action', 'event_key']) {
    const fixture = missingIdentityFixture(details(base), field)
    recordCase({ id: `missing-${field}`, statement: insertSql(base, fixture), expectedSuccess: false, expectedSqlstate: fixture.expectedSqlstate, expectedConstraint: fixture.expectedConstraint })
  }
  recordCase({ id: 'unsupported-version', statement: insertSql({ ...base, event_version: 2 }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_version_chk' })
  recordCase({ id: 'unsupported-action', statement: insertSql({ ...base, event_action: 'bad-action', event_type: 'reading-segment-reviewed-boundary.bad-action' }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_action_chk' })
  recordCase({ id: 'application-wrong-event-type', statement: insertSql(base, { structured: { event_type: eventTypes.rollback } }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_event_type_chk' })
  recordCase({ id: 'rollback-wrong-event-type', statement: insertSql(rollback, { structured: { event_type: eventTypes.application } }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_event_type_chk' })
  for (const [index, segmentKey] of ['bad', 'abc', 'AAAAAAAAAAAAAAAAAAAA'].entries()) recordCase({ id: `invalid-segment-${index + 1}`, statement: insertSql({ ...base, decision_id: `segmentcase${index}`.padEnd(24, '0'), segment_key: segmentKey }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_segment_key_chk' })
  for (const [id, key] of [['arbitrary-event-key', '0'.repeat(64)], ['changed-field-event-key', eventKey({ ...base, decision_id: 'otherdecision000000000' })], ['incorrect-field-order-key', createHash('sha256').update('wrong-order').digest('hex')]]) recordCase({ id, statement: insertSql({ ...base, decision_id: id.replaceAll('-', '').padEnd(24, '0').slice(0, 24) }, { structured: { event_key: key } }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_event_key_chk' })
  recordCase({ id: 'application-key-used-for-rollback', statement: insertSql(rollback, { structured: { event_key: eventKey({ ...rollback, event_action: eventActions.application }) } }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_event_key_chk' })
  const requiredDetails = ['package_id', 'package_version', 'event_version', 'event_action', 'decision_id', 'run_id', 'book_id', 'segment_key', 'previous_approval_status', 'resulting_approval_status', 'target_table', 'target_identity', 'authority_manifest_hash', 'package_hash']
  for (const [index, key] of requiredDetails.entries()) { const payload = details({ ...base, decision_id: `missingdetail${index}`.padEnd(24, '0') }); delete payload[key]; const identity = { ...base, decision_id: `missingdetail${index}`.padEnd(24, '0') }; recordCase({ id: `missing-details-${key}`, statement: insertSql(identity, { payload }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_details_chk' }) }
  const payloadDrifts = { wrong_package_id: { package_id: 'x' }, wrong_package_version: { package_version: '2.0.0' }, wrong_event_version: { event_version: 2 }, wrong_action: { event_action: eventActions.rollback }, wrong_decision: { decision_id: 'x' }, wrong_run: { run_id: '00000000-0000-4000-8000-000000000999' }, wrong_book: { book_id: 2 }, wrong_segment: { segment_key: 'b'.repeat(20) }, wrong_target_table: { target_table: 'x' }, wrong_target_identity: { target_identity: { run_id: base.run_id, book_id: 9, segment_key: base.segment_key } }, invalid_authority_hash: { authority_manifest_hash: 'x' }, invalid_package_hash: { package_hash: 'x' }, wrong_application_statuses: { previous_approval_status: 'content-review' } }
  for (const [index, [name, payloadOverrides]] of Object.entries(payloadDrifts).entries()) { const identity = { ...base, decision_id: `payloaddrift${index}`.padEnd(24, '0') }; recordCase({ id: name, statement: insertSql(identity, { payloadOverrides }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_details_chk' }) }
  recordCase({ id: 'wrong-rollback-statuses', statement: insertSql({ ...rollback, decision_id: 'wrongrollbackstatus00000' }, { payloadOverrides: { previous_approval_status: 'boundary-review' } }), expectedSuccess: false, expectedSqlstate: check, expectedConstraint: 'migration_audit_events_reviewed_boundary_details_chk' })
  recordCase({ id: 'valid-application', statement: insertSql({ ...base, decision_id: 'validapplication000000' }), expectedSuccess: true })
  recordCase({ id: 'valid-rollback', statement: insertSql({ ...rollback, decision_id: 'validrollback00000000' }), expectedSuccess: true })

  const conflictIdentity = { ...base, decision_id: 'conflictbase00000000' }
  const conflictOutput = psql(transactionalSql(`${insertSql(conflictIdentity, { conflict: conflictClause })}\n${insertSql(conflictIdentity, { conflict: conflictClause })}`), true)
  const returnedIds = conflictOutput.split(/\r?\n/).filter(line => /^\d+$/.test(line))
  evidence.conflict_target_result = { predicate_target_accepted: true, first_inserted_rows: returnedIds.length >= 1 ? 1 : 0, exact_duplicate_inserted_rows: returnedIds.length === 1 ? 0 : 1, variants: [] }
  const variants = [{ ...base, run_id: '00000000-0000-4000-8000-000000000102', decision_id: 'diffrun00000000000000' }, { ...base, decision_id: 'diffdecision000000000' }, { ...base, decision_id: 'diffbook0000000000000', book_id: 2 }, { ...base, decision_id: 'diffsegment000000000', segment_key: 'bbbbbbbbbbbbbbbbbbbb' }, { ...rollback, decision_id: conflictIdentity.decision_id }]
  for (const [index, variant] of variants.entries()) evidence.conflict_target_result.variants.push(recordCase({ id: `conflict-variant-${index + 1}`, statement: insertSql(variant, { conflict: conflictClause }), expectedSuccess: true }).passed)
  const plain = recordCase({ id: 'plain-conflict-target-no-arbiter', statement: insertSql({ ...base, decision_id: 'plainconflict00000000' }, { conflict: 'on conflict (event_key) do nothing' }), expectedSuccess: false, expectedSqlstate: '42P10' })
  evidence.conflict_target_result.plain_target_rejected_with_no_arbiter = plain.passed

  const originalPayload = details(conflictIdentity)
  const changedPayload = details(conflictIdentity, { package_hash: 'f'.repeat(64) })
  const verificationOutput = psql(transactionalSql(`${insertSql(conflictIdentity, { conflict: conflictClause })}
with attempted as (${insertSql(conflictIdentity, { conflict: conflictClause }).replace(/;$/, '')}) select case when count(*) = 0 then 'verified-no-op' else 'unexpected-insert' end from attempted;
with attempted as (${insertSql(conflictIdentity, { payload: changedPayload, conflict: conflictClause }).replace(/;$/, '')}) select case when count(*) = 0 and exists (select 1 from content_staging.migration_audit_events where event_key=${sqlLiteral(eventKey(conflictIdentity))} and package_id=${sqlLiteral(eventPackage)} and event_version=1 and decision_id=${sqlLiteral(conflictIdentity.decision_id)} and run_id=${sqlLiteral(conflictIdentity.run_id, 'uuid')} and book_id=1 and segment_key=${sqlLiteral(conflictIdentity.segment_key)} and event_action=${sqlLiteral(conflictIdentity.event_action)} and event_type=${sqlLiteral(conflictIdentity.event_type)} and details=${sqlLiteral(originalPayload, 'jsonb')}) and not exists (select 1 from content_staging.migration_audit_events where event_key=${sqlLiteral(eventKey(conflictIdentity))} and details=${sqlLiteral(changedPayload, 'jsonb')}) then 'AUDIT_CONFLICT' else 'verification-failed' end from attempted;`), true)
  evidence.duplicate_verification = { exact_duplicate_classification: verificationOutput.includes('verified-no-op') ? 'verified-no-op' : 'failed', conflicting_duplicate_classification: verificationOutput.includes('AUDIT_CONFLICT') ? 'AUDIT_CONFLICT' : 'failed' }
  evidence.test_counts = { total: evidence.tests.length + 4, passed: evidence.tests.filter(test => test.passed).length + (evidence.conflict_target_result.first_inserted_rows === 1 ? 1 : 0) + (evidence.conflict_target_result.exact_duplicate_inserted_rows === 0 ? 1 : 0) + (evidence.duplicate_verification.exact_duplicate_classification === 'verified-no-op' ? 1 : 0) + (evidence.duplicate_verification.conflicting_duplicate_classification === 'AUDIT_CONFLICT' ? 1 : 0) }
} catch (error) {
  evidence.error_summary = parsePostgresError(error).summary || String(error.message).slice(0, 300)
} finally {
  try {
    if (evidence.migration_success) {
      psql(`delete from content_staging.migration_audit_events where package_id=${sqlLiteral(eventPackage)} or event_type in ('legacy.event','other.event'); delete from content_staging.migration_runs where migration_version like 'test-%';`)
      evidence.persistent_reviewed_boundary_row_count_after_cleanup = Number(psql(`select count(*) from content_staging.migration_audit_events where package_id=${sqlLiteral(eventPackage)};`, true))
      evidence.cleanup_result = evidence.persistent_reviewed_boundary_row_count_after_cleanup === 0 ? 'passed' : 'failed'
    } else evidence.cleanup_result = 'not-applicable-before-migration'
  } catch (error) {
    evidence.cleanup_result = 'failed'
    evidence.cleanup_error_summary = parsePostgresError(error).summary
  }
  evidence.passed = evidence.migration_success && evidence.extension_state?.digest_success === true && evidence.catalog_schema?.columns?.length === 12 && evidence.test_counts.total > 0 && evidence.test_counts.passed === evidence.test_counts.total && evidence.conflict_target_result?.predicate_target_accepted === true && evidence.conflict_target_result?.plain_target_rejected_with_no_arbiter === true && evidence.cleanup_result === 'passed'
  await mkdir(dirname(evidencePath), { recursive: true })
  writeFileSync(evidencePath, JSON.stringify(canonicalizeJson(evidence), null, 2) + '\n')
}
if (!evidence.passed) {
  console.error(`Reviewed-boundary audit database validation failed; evidence written to ${evidencePath}`)
  process.exit(1)
}
console.log(`Reviewed-boundary audit database validation passed; evidence written to ${evidencePath}`)
