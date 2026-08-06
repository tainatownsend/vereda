export const packageId = 'reading-segment-reviewed-boundary-application-rollback-pr0057'
export const packageVersion = '1.0.0'
export const sources = {
  application_plan:'content/migration/reading-segment-reviewed-boundary-consolidated-application-plan.json',
  application_evidence:'content/migration/reading-segment-reviewed-boundary-consolidated-application-evidence.json',
  execution_authority_manifest:'content/migration/reading-segment-reviewed-boundary-execution-authority-manifest.json',
  status_only_contract:'content/migration/reading-segment-source-review-status-only-contract.json',
  audit_identity_contract:'content/migration/reading-segment-reviewed-boundary-audit-event-identity-contract.json',
  audit_payload_contract:'content/migration/reading-segment-reviewed-boundary-audit-event-payload-contract.json',
  audit_conflict_contract:'content/migration/reading-segment-reviewed-boundary-audit-conflict-contract.json',
  integrity_targets:'content/migration/reading-segment-reviewed-boundary-content-integrity-targets.json',
  integrity_snapshot:'content/migration/reading-segment-reviewed-boundary-content-integrity-snapshot.json',
  integrity_drift:'content/migration/reading-segment-reviewed-boundary-content-integrity-drift-contract.json',
  rollback_baseline:'content/migration/reading-segment-reviewed-boundary-content-integrity-rollback-baseline.json',
  audit_compatibility:'content/migration/reading-segment-reviewed-boundary-content-integrity-audit-compatibility.json',
  integrity_manifest:'content/migration/reading-segment-reviewed-boundary-content-integrity-manifest.json',
  reading_segments_schema:'supabase/migrations/20260803033000_content_staging_foundation.sql',
  audit_schema_extension:'supabase/migrations/20260805005500_reviewed_boundary_audit_identity.sql',
}
export const names=['policy','stateMachine','applicationOperations','rollbackOperations','preflight','transaction','idempotency','audit','conflict','postflight','runtimeEvidence','gate','missingAuthority','readiness']
const suffix={policy:'policy',stateMachine:'execution-state-machine',applicationOperations:'application-operations',rollbackOperations:'rollback-operations',preflight:'preflight-contract',transaction:'transaction-contract',idempotency:'idempotency-contract',audit:'application-audit-contract',conflict:'application-conflict-contract',postflight:'postflight-contract',runtimeEvidence:'runtime-evidence-contract',gate:'execution-gate',missingAuthority:'application-missing-authority',readiness:'application-readiness-evidence'}
export const paths=Object.fromEntries(names.map(n=>[n,`content/migration/reading-segment-reviewed-boundary-application-rollback-${suffix[n]}.json`]))
paths.manifest='content/migration/reading-segment-reviewed-boundary-application-rollback-manifest.json'
