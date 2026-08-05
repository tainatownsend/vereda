export const paths = {
  policy: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-policy.json',
  plan: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-plan.json',
  exclusions: 'content/migration/reading-segment-reviewed-boundary-consolidated-exclusions.json',
  manifest: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-manifest.json',
  evidence: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-evidence.json',
  preflight: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-preflight.json',
  postflight: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-postflight.json',
  idempotency: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-idempotency.json',
  audit: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-audit.json',
  rollback: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-rollback.json',
  missingAuthority: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-missing-authority.json',
  schemaModel: 'content/migration/reading-segment-reviewed-boundary-consolidated-staging-schema.json',
  summary: 'content/migration/reports/reading-segment-reviewed-boundary-consolidated-application-summary.md',
  docs: 'docs/content-pipeline/reviewed-boundary-consolidated-application-package.md',
  preflightSql: 'supabase/audits/reading_segment_reviewed_boundary_consolidated_preflight.sql',
  postflightSql: 'supabase/audits/reading_segment_reviewed_boundary_consolidated_postflight.sql',
  migrationsDir: 'supabase/migrations',
  stagingSchema: 'supabase/migrations/20260803033000_content_staging_foundation.sql',
  statusContract: 'content/migration/reading-segment-source-review-status-only-contract.json',
  statusPlan: 'content/migration/reading-segment-source-review-status-only-eligibility-plan.json',
  statusEvidence: 'content/migration/reading-segment-source-review-status-only-contract-evidence.json',
  locatorContract: 'content/migration/reading-segment-source-review-successor-locator-adjustment-contract.json',
  headingContract: 'content/migration/reading-segment-source-review-structural-heading-merge-contract.json',
  finalUnresolvedDecisions: 'content/migration/reading-segment-source-review-final-unresolved-adjudication-decisions.json',
  progress: 'content/migration/reading-segment-source-review-progress-current.json',
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
}
export const targetTable = 'content_staging.reading_segments'
export const targetColumns = ['run_id','book_id','segment_key']
export const changedColumns = ['approval_status']
export const preservedColumns = ['run_id','book_id','segment_key','source_key','segment_order','segment_index','segment_count','boundary_version','start_locator','end_locator','display_title','content','word_count','normalized_content_sha256','created_at','updated_at']
export const databaseManagedColumns = []
export const unavailableColumns = []
export const blockingColumns = []
export const forbiddenColumns = ['source_locator','source_title','source_path','section_id','subsection_id','source_paragraph_index','source_hash']
export const statusOnlyOutcomes = ['confirm-successor-start','retain-intro-segment']
