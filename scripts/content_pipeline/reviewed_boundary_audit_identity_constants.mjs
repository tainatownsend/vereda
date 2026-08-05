export const migrationsDir = 'supabase/migrations'
export const migrationPath = 'supabase/migrations/20260805005500_reviewed_boundary_audit_identity.sql'
export const packageIds = {
  pr0055: 'reading-segment-reviewed-boundary-audit-identity-pr0055',
  pr0054: 'reading-segment-reviewed-boundary-execution-authority-pr0054',
  pr0053: 'reading-segment-reviewed-boundary-consolidated-application-pr0053',
}
export const eventPackage = 'reading-segment-reviewed-boundary-execution'
export const packageVersion = '1.0.0'
export const eventVersion = 1
export const targetTable = 'content_staging.reading_segments'
export const auditTable = 'content_staging.migration_audit_events'
export const targetIdentityColumns = ['run_id', 'book_id', 'segment_key']
export const identityColumns = ['package_id', 'event_action', 'run_id', 'decision_id', 'book_id', 'segment_key', 'event_version']
export const eventActions = { application: 'status-advanced', rollback: 'status-rollback' }
export const statuses = { applicationBefore: 'boundary-review', applicationAfter: 'content-review', rollbackBefore: 'content-review', rollbackAfter: 'boundary-review' }
export const hashAlgorithms = { json: 'sha256-canonical-json-v1', text_sql: 'sha256-normalized-lf-text-v1' }
export const safetyKeys = ['audit_schema_migration_generated','audit_schema_migration_executed','executable_application_sql_generated','executable_rollback_sql_generated','application_sql_executed','rollback_sql_executed','database_modified','supabase_modified','staging_modified','production_modified','reading_segments_modified','audit_events_inserted','ui_modified','source_text_modified','user_progress_modified','reader_sessions_modified','bookmarks_modified','notes_modified','highlights_modified','cutover_enabled']
export const artifactPaths = {
  policy:'content/migration/reading-segment-reviewed-boundary-audit-identity-policy.json',
  schemaContract:'content/migration/reading-segment-reviewed-boundary-audit-schema-extension-contract.json',
  identity:'content/migration/reading-segment-reviewed-boundary-audit-event-identity-contract.json',
  payload:'content/migration/reading-segment-reviewed-boundary-audit-event-payload-contract.json',
  conflict:'content/migration/reading-segment-reviewed-boundary-audit-conflict-contract.json',
  compatibility:'content/migration/reading-segment-reviewed-boundary-audit-compatibility-assessment.json',
  migrationPlan:'content/migration/reading-segment-reviewed-boundary-audit-migration-plan.json',
  migrationEvidence:'content/migration/reading-segment-reviewed-boundary-audit-migration-evidence.json',
  missing:'content/migration/reading-segment-reviewed-boundary-audit-missing-authority.json',
  manifest:'content/migration/reading-segment-reviewed-boundary-audit-authority-manifest.json',
  evidence:'content/migration/reading-segment-reviewed-boundary-audit-authority-evidence.json',
  triageBaseline:'content/migration/reading-segment-reviewed-boundary-audit-triage-baseline-evidence.json',
  summary:'content/migration/reports/reading-segment-reviewed-boundary-audit-authority-summary.md',
  docs:'docs/content-pipeline/reviewed-boundary-audit-identity.md',
}
export const historicalPaths = {
  pr0053Plan:'content/migration/reading-segment-reviewed-boundary-consolidated-application-plan.json',
  pr0053Manifest:'content/migration/reading-segment-reviewed-boundary-consolidated-application-manifest.json',
  pr0053Evidence:'content/migration/reading-segment-reviewed-boundary-consolidated-application-evidence.json',
  pr0054Policy:'content/migration/reading-segment-reviewed-boundary-execution-authority-policy.json',
  pr0054Audit:'content/migration/reading-segment-reviewed-boundary-execution-audit-contract.json',
  pr0054Schema:'content/migration/reading-segment-reviewed-boundary-execution-audit-schema.json',
  pr0054Manifest:'content/migration/reading-segment-reviewed-boundary-execution-authority-manifest.json',
}

export const conflictTargetPredicate = "package_id = 'reading-segment-reviewed-boundary-execution' and event_version = 1 and decision_id is not null and book_id is not null and segment_key is not null and event_action in ('status-advanced', 'status-rollback') and event_key is not null"
export const eventKeyAlgorithm = 'sha256-v1-length-delimited-reviewed-boundary-event-key'
