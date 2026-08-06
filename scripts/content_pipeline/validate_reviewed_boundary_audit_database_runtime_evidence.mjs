import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { conflictTargetPredicate, eventPackage, requiredSupabaseRoles } from './reviewed_boundary_audit_identity_constants.mjs'

export const requiredConstraintNames = [
  'migration_audit_events_reviewed_boundary_identity_complete_chk',
  'migration_audit_events_reviewed_boundary_action_chk',
  'migration_audit_events_reviewed_boundary_event_type_chk',
  'migration_audit_events_reviewed_boundary_version_chk',
  'migration_audit_events_reviewed_boundary_segment_key_chk',
  'migration_audit_events_reviewed_boundary_event_key_chk',
  'migration_audit_events_reviewed_boundary_details_chk',
]
export const requiredDetailsKeys = ['package_id', 'package_version', 'event_version', 'event_action', 'decision_id', 'run_id', 'book_id', 'segment_key', 'previous_approval_status', 'resulting_approval_status', 'target_table', 'target_identity', 'authority_manifest_hash', 'package_hash']
export const requiredPayloadDriftIds = ['wrong_package_id', 'wrong_package_version', 'wrong_event_version', 'wrong_action', 'wrong_decision', 'wrong_run', 'wrong_book', 'wrong_segment', 'wrong_target_table', 'wrong_target_identity', 'invalid_authority_hash', 'invalid_package_hash', 'wrong_application_statuses', 'wrong-rollback-statuses']
export const requiredTestIds = [
  'legacy-row', 'unrelated-package',
  ...['event_version', 'decision_id', 'book_id', 'segment_key', 'event_action', 'event_key'].map(field => `missing-${field}`),
  'unsupported-version', 'unsupported-action', 'application-wrong-event-type', 'rollback-wrong-event-type',
  'invalid-segment-1', 'invalid-segment-2', 'invalid-segment-3',
  'arbitrary-event-key', 'changed-field-event-key', 'application-key-used-for-rollback', 'incorrect-field-order-key',
  ...requiredDetailsKeys.map(key => `missing-details-${key}`), ...requiredPayloadDriftIds,
  'valid-application', 'valid-rollback', 'plain-conflict-target-no-arbiter',
]
export const conflictVariantIds = Array.from({ length: 5 }, (_, index) => `conflict-variant-${index + 1}`)
export const requiredRecordedTestIds = [...requiredTestIds, ...conflictVariantIds]
export const expectedRuntimeTestCount = requiredRecordedTestIds.length + 4
const successfulTestIds = new Set(['legacy-row', 'unrelated-package', 'valid-application', 'valid-rollback', ...conflictVariantIds])
export const expectedRuntimeCase = id => {
  if (successfulTestIds.has(id)) return { expected_success: true, expected_sqlstate: null, expected_constraint: null }
  if (id === 'plain-conflict-target-no-arbiter') return { expected_success: false, expected_sqlstate: '42P10', expected_constraint: null }
  if (id.startsWith('missing-') && !id.startsWith('missing-details-')) return { expected_success: false, expected_sqlstate: '23514', expected_constraint: 'migration_audit_events_reviewed_boundary_identity_complete_chk' }
  if (id === 'unsupported-version') return { expected_success: false, expected_sqlstate: '23514', expected_constraint: 'migration_audit_events_reviewed_boundary_version_chk' }
  if (id === 'unsupported-action') return { expected_success: false, expected_sqlstate: '23514', expected_constraint: 'migration_audit_events_reviewed_boundary_action_chk' }
  if (id.includes('wrong-event-type')) return { expected_success: false, expected_sqlstate: '23514', expected_constraint: 'migration_audit_events_reviewed_boundary_event_type_chk' }
  if (id.startsWith('invalid-segment-')) return { expected_success: false, expected_sqlstate: '23514', expected_constraint: 'migration_audit_events_reviewed_boundary_segment_key_chk' }
  if (['arbitrary-event-key', 'changed-field-event-key', 'application-key-used-for-rollback', 'incorrect-field-order-key'].includes(id)) return { expected_success: false, expected_sqlstate: '23514', expected_constraint: 'migration_audit_events_reviewed_boundary_event_key_chk' }
  return { expected_success: false, expected_sqlstate: '23514', expected_constraint: 'migration_audit_events_reviewed_boundary_details_chk' }
}

export function validateRuntimeEvidence(evidence) {
  const errors = []
  const fail = message => errors.push(message)
  if (evidence?.validation_mode !== 'github-actions-ephemeral-postgresql') fail('wrong validation mode')
  if (!/^PostgreSQL 15\./.test(evidence?.postgresql_version ?? '')) fail('missing PostgreSQL 15 version')
  if (!['127.0.0.1', 'localhost', 'postgres'].includes(evidence?.local_host_classification) || evidence?.no_remote_database_used !== true || evidence?.no_secrets_used !== true) fail('non-local database evidence')
  const roles = evidence?.role_bootstrap?.roles ?? []
  if (evidence?.role_bootstrap?.applied !== true || requiredSupabaseRoles.some(name => !roles.some(role => role.rolname === name && !role.rolsuper && !role.rolcreaterole && !role.rolcreatedb && !role.rolcanlogin && !role.rolreplication))) fail('role bootstrap evidence failed')
  if (evidence?.migration_success !== true) fail('migration application failed')
  if (evidence?.extension_state?.name !== 'pgcrypto' || evidence?.extension_state?.schema !== 'extensions' || evidence?.extension_state?.digest_success !== true) fail('pgcrypto evidence failed')
  if (evidence?.catalog_schema?.columns?.length !== 12 || evidence.catalog_schema.triggers?.length !== 0 || JSON.stringify(evidence.catalog_schema.primary_key) !== '["id"]') fail('catalog schema drift')
  const constraints = evidence?.catalog_schema?.constraints ?? {}
  for (const name of requiredConstraintNames) if (!constraints[name]) fail(`missing constraint ${name}`)
  const index = evidence?.catalog_schema?.indexes?.migration_audit_events_reviewed_boundary_event_key_uidx ?? ''
  if (!/CREATE UNIQUE INDEX/.test(index) || !index.includes('(event_key)') || !index.includes(eventPackage) || !index.includes('event_version = 1') || !index.includes("event_action = ANY (ARRAY['status-advanced'::text, 'status-rollback'::text])")) fail('partial unique index evidence drift')
  const tests = evidence?.tests ?? []
  for (const id of requiredRecordedTestIds) {
    const expected = expectedRuntimeCase(id)
    const test = tests.find(candidate => candidate.test_id === id)
    if (!test || test.passed !== true || test.state_restored !== true || test.expected_success !== expected.expected_success || test.actual_success !== expected.expected_success || test.expected_sqlstate !== expected.expected_sqlstate || test.actual_sqlstate !== expected.expected_sqlstate || test.expected_constraint !== expected.expected_constraint || test.actual_constraint !== expected.expected_constraint) fail(`missing or incorrectly classified test ${id}`)
  }
  if (tests.some(test => !test.passed)) fail('one or more database cases failed')
  const conflict = evidence?.conflict_target_result
  if (conflict?.predicate_target_accepted !== true || conflict?.first_inserted_rows !== 1 || conflict?.exact_duplicate_inserted_rows !== 0 || conflict?.plain_target_rejected_with_no_arbiter !== true || conflict?.variants?.length !== 5 || conflict.variants.some(value => value !== true)) fail(`conflict target evidence does not prove predicate ${conflictTargetPredicate}`)
  if (evidence?.duplicate_verification?.exact_duplicate_classification !== 'verified-no-op' || evidence?.duplicate_verification?.conflicting_duplicate_classification !== 'AUDIT_CONFLICT') fail('duplicate verification evidence failed')
  if (evidence?.tests?.length !== requiredRecordedTestIds.length || evidence?.test_counts?.total !== expectedRuntimeTestCount || evidence.test_counts.passed !== expectedRuntimeTestCount) fail('test count mismatch')
  if (evidence?.cleanup_result !== 'passed' || evidence?.persistent_reviewed_boundary_row_count_after_cleanup !== 0) fail('cleanup evidence failed')
  if (evidence?.passed !== true) fail('runtime evidence is not passing')
  if (errors.length) { const error = new Error(errors.join('\n')); error.errors = errors; throw error }
  return { passed: true, tests: evidence.test_counts.total, postgresql_version: evidence.postgresql_version }
}

export async function validateRuntimeEvidenceFile(path = process.env.REVIEWED_BOUNDARY_AUDIT_DB_EVIDENCE) {
  if (!path) throw new Error('REVIEWED_BOUNDARY_AUDIT_DB_EVIDENCE must identify the runtime evidence file')
  if (path.startsWith('content/migration/')) throw new Error('runtime evidence must not overwrite a committed content/migration artifact')
  return validateRuntimeEvidence(JSON.parse(await readFile(path, 'utf8')))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await validateRuntimeEvidenceFile(), null, 2)) }
  catch (error) { console.error('Runtime database evidence validation failed:'); for (const message of error.errors ?? [error.message]) console.error(`- ${message}`); process.exit(1) }
}
