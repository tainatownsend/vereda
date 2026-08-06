# Reviewed-boundary staging evidence authorization (PR-0059)

## Purpose and scope

Collection and admission are separate security boundaries. PR-0058 can temporarily collect redacted, read-only runtime facts; this package deliberately imports and independently validates such a document before any fact can become repository-backed authority. The closed world is exactly 74 reviewed-boundary targets and the 74 status-only application and rollback operations. `approval_status` is the sole permitted mutation column.

This package never connects to a database, never applies or rolls back an operation, and never inserts an audit event. No application or rollback occurred in this PR. Production collection and execution remain unauthorized.

## Modes and import boundary

The explicit modes are `blocked` (default and refusal), `fixture-review` (mechanics only), `staging-review` (deliberately supplied staging-readonly evidence), and `production-review` (defined but rejected). Modes are never inferred. Fixture evidence can reach only `EVIDENCE_ADMISSION_FIXTURE_ONLY`; it cannot establish staging authority.

Use `scripts/content_pipeline/admit_reviewed_boundary_staging_evidence.mjs` with explicit mode, evidence path, expected evidence SHA-256, expected PR-0058 runtime manifest SHA-256, redacted operator identity reference, and deliberate confirmation. The importer rejects missing arguments, symlinks, non-files, files over 10 MiB, paths outside an optional allowed root, malformed/closed-world JSON, stale hashes, identity mismatch, production, content or secret leakage, and unsafe runtime results. Output defaults below `tmp/reviewed-boundary-staging-authorization/`.

Independent validation rehashes the persisted semantic JSON using recursive sorted keys, preserved arrays, compact UTF-8 JSON, lowercase SHA-256, and a projection excluding only the self-hash. JSON finalization happens before hashing, including timestamps, avoiding runtime `Date` representation differences. It reconciles all 74 identities against PR-0057, requires 74 complete digest matches, `STAGING_PREFLIGHT_MATCHED`, a rolled-back read-only transaction, and zero drift, conflicts, mutations, or insertions.

## Identity, baselines, and authority

The redacted database attestation binds environment class, database fingerprint, PostgreSQL major version, schema and migration fingerprints, runtime manifest and evidence hashes, execution identifier, collection time, collector mode, target count, operator/reviewer references, and version. Hosts, usernames, credentials, connection strings, tokens, raw sensitive identifiers, and full content are forbidden. Fixture and staging identities are structurally distinct.

Each admitted target contains stable identity, order and statuses; identity, boundary, content, and full-pre-application hashes; stored/recomputed content digests and counts; lengths; audit and runtime classifications; and evidence/manifest references—never full content or raw titles/locators. A qualifying real package derives a complete source snapshot, independently verified source snapshot, content-integrity baseline, rollback baseline, and immediate application-preflight baseline. Those derivations are evidence-backed; committed defaults remain incomplete.

## Human review, expiry, and revocation

Three separate records are mandatory. The collector operator confirms deliberate staging-readonly collection, expected staging selection, no production, no mutation, and no credential/content persistence. The technical reviewer confirms independent validation, exact reconciliation, identity, no drift/conflict, derivations, and artifact hash. The execution authorizer explicitly enables only the exact staging package under PR-0057's guarded transaction and `approval_status` restriction. One person may hold multiple roles, but must make separate deliberate attestations.

The conservative validity window is **24 hours**. Authorization expires or is revoked on age, application-plan/PR-0057/PR-0058/source hash changes, target-set/schema/database/row/status/audit drift, supersession, explicit revocation, or application/rollback start or completion. Evaluation requires an explicit timestamp; static generation never uses the current clock.

An eligible decision can produce a separate, one-time, non-credential staging application token binding the evidence, decision, PR-0057 and PR-0058 manifests, database fingerprint, exact target-set hash, staging mode, issue/expiry times, unique execution identifier, and operator confirmation. It expires, is invalid after drift or source change, and is consumed once. Rollback requires a distinct token. It can never authorize production.

## Storage and current state

Raw evidence remains in the secure operator review boundary and temporary `tmp/` storage. Only minimal redacted admitted baselines, database and human attestations, decisions, and revocations may later be committed. Never commit raw evidence with excess detail, full content, credentials, connection strings, access tokens, unredacted identity, or passing fixtures as authority. A newer package supersedes and revokes the old package; temporary input should be securely deleted under operator policy.

No real staging evidence or real attestation is committed. All snapshot, integrity, preflight, rollback, staging execution, production collection, and production execution authority flags remain false, with `STAGING_EVIDENCE_REQUIRED`. A later execution PR requires a fresh admitted staging package, all three attestations, unexpired independent authorization, a one-time staging token, and an immediate PR-0057 guarded preflight.
