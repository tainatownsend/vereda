export const paths = {
  policy: 'content/migration/reading-segment-reviewed-boundary-content-integrity-policy.json',
  targets: 'content/migration/reading-segment-reviewed-boundary-content-integrity-targets.json',
  projection: 'content/migration/reading-segment-reviewed-boundary-content-integrity-projection-contract.json',
  snapshot: 'content/migration/reading-segment-reviewed-boundary-content-integrity-snapshot.json',
  drift: 'content/migration/reading-segment-reviewed-boundary-content-integrity-drift-contract.json',
  rollback: 'content/migration/reading-segment-reviewed-boundary-content-integrity-rollback-baseline.json',
  missing: 'content/migration/reading-segment-reviewed-boundary-content-integrity-missing-authority.json',
  evidence: 'content/migration/reading-segment-reviewed-boundary-content-integrity-readiness-evidence.json',
  compatibility: 'content/migration/reading-segment-reviewed-boundary-content-integrity-audit-compatibility.json',
  manifest: 'content/migration/reading-segment-reviewed-boundary-content-integrity-manifest.json',
  docs: 'docs/content-pipeline/reviewed-boundary-content-integrity.md',
}
export const sources = {
  decisions: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-evidence.json',
  authorized: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-plan.json',
  applicationManifest: 'content/migration/reading-segment-reviewed-boundary-consolidated-application-manifest.json',
  executionManifest: 'content/migration/reading-segment-reviewed-boundary-execution-authority-manifest.json',
  statusContract: 'content/migration/reading-segment-source-review-status-only-contract.json',
  auditIdentity: 'content/migration/reading-segment-reviewed-boundary-audit-event-identity-contract.json',
  schema: 'supabase/migrations/20260803033000_content_staging_foundation.sql',
}
export const artifactOrder = ['policy','targets','projection','snapshot','drift','rollback','missing','evidence','compatibility']
