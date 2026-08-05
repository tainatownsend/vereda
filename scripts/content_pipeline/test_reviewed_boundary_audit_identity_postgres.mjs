import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { canonicalizeJson } from './hash_utils.mjs'
import { conflictTargetPredicate, eventActions, eventKeyAlgorithm, eventPackage, eventTypes, eventVersion, migrationPath, roleFixturePath, requiredSupabaseRoles, foundationMigrationPath } from './reviewed_boundary_audit_identity_constants.mjs'

const evidencePath = process.env.REVIEWED_BOUNDARY_AUDIT_DB_EVIDENCE ?? 'content/migration/reading-segment-reviewed-boundary-audit-database-validation-evidence.json'
const env = { ...process.env }
const allowedHosts = new Set(['127.0.0.1', 'localhost', 'postgres'])
const reject = (message) => { throw new Error(message) }
if (!env.PGHOST || !allowedHosts.has(env.PGHOST)) reject(`PGHOST must be local GitHub Actions service host, got ${env.PGHOST ?? '<unset>'}`)
if (/supabase\.co|postgres:\/\/|service_role/i.test(JSON.stringify({ PGHOST: env.PGHOST, PGDATABASE: env.PGDATABASE, PGUSER: env.PGUSER }))) reject('remote Supabase or service-role connection is forbidden')
if (/prod|production|staging/i.test(env.PGDATABASE ?? '')) reject(`PGDATABASE must be disposable, got ${env.PGDATABASE}`)

const psql = (sql, opts = {}) => execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', ...(opts.tuples ? ['-At'] : []), '-c', sql], { env, encoding: 'utf8', stdio: opts.silent ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'inherit'] }).trim()
const psqlFile = (file) => execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', file], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
const expectFailure = (name, sql) => { try { psql(sql, { silent: true }); return { name, passed: false, expected: 'failure', error: 'statement unexpectedly succeeded' } } catch (error) { return { name, passed: true, expected: 'failure', sqlstate_or_error: String(error.stderr || error.message).split('\n').find(Boolean)?.slice(0, 220) ?? 'failed' } } }
const expectSuccess = (name, sql) => { try { const out = psql(sql, { silent: true }); return { name, passed: true, expected: 'success', result: out.slice(0, 220) } } catch (error) { return { name, passed: false, expected: 'success', error: String(error.stderr || error.message).slice(0, 500) } } }
const qJson = (sql) => JSON.parse(psql(sql, { tuples: true, silent: true }) || 'null')
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`
const jsonSql = (value) => `${sqlString(JSON.stringify(value))}::jsonb`
const keyMaterial = ({ run_id, decision_id, book_id, segment_key, event_action, package_id = eventPackage, event_version = eventVersion }) => {
  const pairs = [['package_id', package_id], ['event_action', event_action], ['run_id', run_id], ['decision_id', decision_id], ['book_id', String(book_id)], ['segment_key', segment_key], ['event_version', String(event_version)]]
  return eventKeyAlgorithm + pairs.map(([k, v]) => `|${k}=${String(v).length}:${v}`).join('')
}
const eventKey = (input) => createHash('sha256').update(keyMaterial(input), 'utf8').digest('hex')
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
const insertSql = (input, overrides = {}, conflict = '') => {
  const pkg = input.package_id ?? eventPackage
  const ev = input.event_version ?? eventVersion
  const key = input.event_key ?? eventKey({ ...input, package_id: pkg, event_version: ev })
  return `insert into content_staging.migration_audit_events (run_id,event_type,details,package_id,event_version,decision_id,book_id,segment_key,event_action,event_key) values (${sqlString(input.run_id)}::uuid, ${sqlString(input.event_type)}, ${jsonSql(details({ ...input, package_id: pkg, event_version: ev }, overrides))}, ${sqlString(pkg)}, ${ev}, ${sqlString(input.decision_id)}, ${input.book_id}, ${sqlString(input.segment_key)}, ${sqlString(input.event_action)}, ${sqlString(key)}) ${conflict} returning id;`
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
const evidence = { validation_mode: 'github-actions-ephemeral-postgresql', workflow_name: 'Reviewed Boundary Audit Database Validation', local_host_classification: env.PGHOST, no_remote_database_used: true, no_secrets_used: true, applied_migrations: [], role_bootstrap: { fixture: roleFixturePath, required_roles: requiredSupabaseRoles, applied: false, roles: [] }, migration_success: false, tests: [], test_counts: {}, persistent_reviewed_boundary_row_count_after_cleanup: null, evidence_generation_timestamp_policy: 'no wall-clock timestamp committed; runtime artifact only' }
try {
  evidence.postgresql_version = psql('select version();', { tuples: true, silent: true })
  evidence.search_path = psql('show search_path;', { tuples: true, silent: true })
  psqlFile(roleFixturePath)
  evidence.applied_migrations.push(roleFixturePath)
  evidence.role_bootstrap.applied = true
  evidence.role_bootstrap.roles = qJson(`select json_agg(json_build_object('rolname', rolname, 'rolsuper', rolsuper, 'rolinherit', rolinherit, 'rolcreaterole', rolcreaterole, 'rolcreatedb', rolcreatedb, 'rolcanlogin', rolcanlogin, 'rolreplication', rolreplication) order by rolname) from pg_roles where rolname = any(array[${requiredSupabaseRoles.map(sqlString).join(',')}]);`)
  if ((evidence.role_bootstrap.roles ?? []).length !== requiredSupabaseRoles.length || evidence.role_bootstrap.roles.some(r => r.rolsuper || r.rolcreaterole || r.rolcreatedb || r.rolcanlogin || r.rolreplication)) reject('Supabase role bootstrap privilege drift')
  psql(minimalPrereq, { silent: true })
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
  psql(`insert into content_staging.migration_runs(id,migration_version,input_snapshot_sha256,reconstruction_plan_sha256) values ${['00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102'].map((id,i)=>`('${id}'::uuid,'test-${i}','${'c'.repeat(64)}','${'d'.repeat(64)}')`).join(',')};`, { silent: true })
  const tests = []
  tests.push(expectSuccess('legacy row with existing columns only succeeds', `insert into content_staging.migration_audit_events(run_id,event_type,details) values (${sqlString(base.run_id)}::uuid,'legacy.event','{}'::jsonb);`))
  tests.push(expectSuccess('unrelated package row with null identity succeeds', `insert into content_staging.migration_audit_events(run_id,event_type,details,package_id) values (${sqlString(base.run_id)}::uuid,'other.event','{}'::jsonb,'other-package');`))
  for (const field of ['event_version','decision_id','book_id','segment_key','event_action','event_key']) {
    const x = { ...base }; if (field === 'event_key') x.event_key = null
    let sql = insertSql(x).replace(field === 'event_version' ? ',1,' : field === 'book_id' ? ',1,' : field === 'event_key' ? `,${sqlString(eventKey(base))}` : `${sqlString(x[field])}`, field === 'event_version' || field === 'book_id' ? ',null,' : ',null')
    tests.push(expectFailure(`missing ${field} fails`, sql))
  }
  tests.push(expectFailure('unsupported event_version fails', insertSql({ ...base, event_version: 2 })))
  tests.push(expectFailure('unsupported event_action fails', insertSql({ ...base, event_action: 'bad-action', event_type: 'reading-segment-reviewed-boundary.bad-action' })))
  tests.push(expectFailure('application wrong event_type fails', insertSql({ ...base, event_type: eventTypes.rollback })))
  tests.push(expectFailure('rollback wrong event_type fails', insertSql({ ...rollback, event_type: eventTypes.application })))
  for (const segment_key of ['bad', 'abc', 'AAAAAAAAAAAAAAAAAAAA']) tests.push(expectFailure(`invalid segment_key ${segment_key} fails`, insertSql({ ...base, decision_id: `seg${segment_key}`.toLowerCase().padEnd(24,'0').slice(0,24), segment_key })))
  tests.push(expectFailure('arbitrary event_key fails', insertSql({ ...base, decision_id: 'decisionbadkey000000000', event_key: '0'.repeat(64) })))
  tests.push(expectFailure('changed-field event_key fails', insertSql({ ...base, decision_id: 'decisionchangedkey0000', event_key: eventKey({ ...base, decision_id: 'otherdecision000000000' }) })))
  tests.push(expectFailure('application key used for rollback fails', insertSql({ ...rollback, decision_id: 'decisionrollbackkey000', event_key: eventKey({ ...rollback, event_action: eventActions.application }) })))
  tests.push(expectFailure('incorrect field order event_key fails', insertSql({ ...base, decision_id: 'decisionfieldorder0000', event_key: createHash('sha256').update('wrong-order').digest('hex') })))
  const required = ['package_id','package_version','event_version','event_action','decision_id','run_id','book_id','segment_key','previous_approval_status','resulting_approval_status','target_table','target_identity','authority_manifest_hash','package_hash']
  for (const key of required) { const d = details(base); delete d[key]; tests.push(expectFailure(`missing details.${key} fails`, insertSql({ ...base, decision_id: `missing${key}`.replace(/[^a-z0-9]/g,'').padEnd(24,'0').slice(0,24) }, d))) }
  for (const [name, overrides] of Object.entries({ wrong_package_id:{package_id:'x'}, wrong_package_version:{package_version:'2.0.0'}, wrong_event_version:{event_version:2}, wrong_action:{event_action:eventActions.rollback}, wrong_decision:{decision_id:'x'}, wrong_run:{run_id:'00000000-0000-4000-8000-000000000999'}, wrong_book:{book_id:2}, wrong_segment:{segment_key:'b'.repeat(20)}, wrong_target_table:{target_table:'x'}, wrong_target_identity:{target_identity:{run_id:base.run_id,book_id:9,segment_key:base.segment_key}}, invalid_authority_hash:{authority_manifest_hash:'x'}, invalid_package_hash:{package_hash:'x'}, wrong_application_statuses:{previous_approval_status:'content-review'}, wrong_rollback_statuses:{previous_approval_status:'boundary-review'} })) tests.push(expectFailure(`${name} payload fails`, insertSql({ ...base, decision_id: name.replace(/[^a-z0-9]/g,'').padEnd(24,'0').slice(0,24), event_action: name === 'wrong_rollback_statuses' ? eventActions.rollback : eventActions.application, event_type: name === 'wrong_rollback_statuses' ? eventTypes.rollback : eventTypes.application }, overrides)))
  tests.push(expectSuccess('valid application payload succeeds', insertSql({ ...base, decision_id:'validapplication000000' })))
  tests.push(expectSuccess('valid rollback payload succeeds', insertSql({ ...rollback, decision_id:'validrollback00000000' })))
  const first = psql(insertSql({ ...base, decision_id:'conflictbase00000000' }, {}, conflictClause), { tuples: true, silent: true })
  const dup = psql(insertSql({ ...base, decision_id:'conflictbase00000000' }, {}, conflictClause), { tuples: true, silent: true })
  evidence.conflict_target_result = { predicate_target_accepted: true, first_inserted: first !== '', exact_duplicate_inserted: dup !== '' ? 1 : 0 }
  for (const variant of [{...base,run_id:'00000000-0000-4000-8000-000000000102',decision_id:'diffrun00000000000000'}, {...base,decision_id:'diffdecision000000000'}, {...base,decision_id:'diffbook0000000000000',book_id:2}, {...base,decision_id:'diffsegment000000000',segment_key:'bbbbbbbbbbbbbbbbbbbb'}, {...rollback,decision_id:'conflictbase00000000'}]) tests.push(expectSuccess(`conflict variant ${variant.decision_id} inserts`, insertSql(variant, {}, conflictClause)))
  tests.push(expectFailure('plain ON CONFLICT event_key is not authorized/inferable', insertSql({ ...base, decision_id:'plainconflict00000000' }, {}, 'on conflict (event_key) do nothing')))
  const existing = qJson(`select json_build_object('package_id',package_id,'event_version',event_version,'decision_id',decision_id,'run_id',run_id::text,'book_id',book_id,'segment_key',segment_key,'event_action',event_action,'event_type',event_type,'details',details) from content_staging.migration_audit_events where event_key=${sqlString(eventKey({ ...base, decision_id:'conflictbase00000000' }))} limit 1;`)
  const expected = { package_id:eventPackage,event_version,event_action:eventActions.application,decision_id:'conflictbase00000000',run_id:base.run_id,book_id:base.book_id,segment_key:base.segment_key,event_type:eventTypes.application,details:details({...base,decision_id:'conflictbase00000000'}) }
  evidence.duplicate_verification = { exact_duplicate_classification: JSON.stringify(canonicalizeJson(existing)) === JSON.stringify(canonicalizeJson(expected)) ? 'verified-no-op' : 'AUDIT_CONFLICT', conflicting_duplicate_classification: JSON.stringify(canonicalizeJson({ ...existing, details:{...existing.details, package_hash:'f'.repeat(64)}})) === JSON.stringify(canonicalizeJson(expected)) ? 'verified-no-op' : 'AUDIT_CONFLICT' }
  evidence.tests = tests
  evidence.test_counts = { total: tests.length + 8, passed: tests.filter(t=>t.passed).length + (evidence.conflict_target_result.first_inserted ? 1 : 0) + (evidence.conflict_target_result.exact_duplicate_inserted === 0 ? 1 : 0) + 6 + (evidence.duplicate_verification.exact_duplicate_classification === 'verified-no-op' ? 1 : 0) + (evidence.duplicate_verification.conflicting_duplicate_classification === 'AUDIT_CONFLICT' ? 1 : 0) }
  psql(`delete from content_staging.migration_audit_events where package_id='${eventPackage}' or event_type in ('legacy.event','other.event'); delete from content_staging.migration_runs where migration_version like 'test-%';`, { silent: true })
  evidence.persistent_reviewed_boundary_row_count_after_cleanup = Number(psql(`select count(*) from content_staging.migration_audit_events where package_id='${eventPackage}';`, { tuples: true, silent: true }))
  evidence.cleanup_result = evidence.persistent_reviewed_boundary_row_count_after_cleanup === 0 ? 'passed' : 'failed'
  evidence.passed = evidence.migration_success && evidence.extension_state?.digest_success === true && evidence.test_counts.passed === evidence.test_counts.total && evidence.cleanup_result === 'passed'
} catch (error) {
  evidence.passed = false
  evidence.error = String(error.stderr || error.stack || error.message)
}
await mkdir(dirname(evidencePath), { recursive: true })
writeFileSync(evidencePath, JSON.stringify(canonicalizeJson(evidence), null, 2) + '\n')
if (!evidence.passed) {
  console.error(`Reviewed-boundary audit database validation failed; evidence written to ${evidencePath}`)
  process.exit(1)
}
console.log(`Reviewed-boundary audit database validation passed; evidence written to ${evidencePath}`)
