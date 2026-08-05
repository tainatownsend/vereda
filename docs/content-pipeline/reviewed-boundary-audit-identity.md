# PR-0055 Reviewed-Boundary Audit Identity

Audit identity authority approved: true.

PR-0055 extends content_staging.migration_audit_events with nullable structured identity columns and a reviewed-boundary-only partial unique index on event_key. Legacy audit rows remain valid because new columns are nullable and constraints are scoped to package_id = 'reading-segment-reviewed-boundary-execution'.

Logical identity: package_id, event_action, run_id, decision_id, book_id, segment_key, event_version. Event keys are lowercase hex SHA-256 values over the fixed label sha256-v1-length-delimited-reviewed-boundary-event-key followed by fixed-order length-delimited identity fields. Application action: status-advanced (boundary-review -> content-review). Rollback action: status-rollback (content-review -> boundary-review); rollback execution remains unauthorized. Event version: 1.

Future duplicate handling must use the predicate-bearing PostgreSQL conflict target: ON CONFLICT (event_key) WHERE package_id = 'reading-segment-reviewed-boundary-execution' and event_version = 1 and decision_id is not null and book_id is not null and segment_key is not null and event_action in ('status-advanced', 'status-rollback') and event_key is not null DO NOTHING. DO NOTHING alone is never equality proof; any conflict must be followed by exact structured-field, canonical-payload, authority-hash, and package-hash equality verification before classifying the event as a verified no-op.

Triage validator baseline: npm run content:staging:segments:triage:validate fails unchanged on PR-0054 base and PR-0055 with expected review_queue_sha256 06d53501303eaca9aa8a1ba9f81aa10fed02801996eba90ba38f9e15b3440b66 and actual 3045ca47395bfa47fb883eddaaa6a0b048a4a68e9e80897e2bdba48bb7f3d505; PR-0055 does not modify consumed triage files.

Migration generated: supabase/migrations/20260805005500_reviewed_boundary_audit_identity.sql. Migration executed: false. Application SQL generated: false. Rollback SQL generated: false. Database modified: false.
