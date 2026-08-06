# Reviewed-boundary runtime integrity staging preflight (PR-0058)

## Purpose and scope

Repository artifacts prove the expected closed world of **74** status-only targets, but cannot prove actual database content. This package bridges that gap by reading only those stable `(run_id, book_id, segment_key)` identities, reconstructing each row's projections in memory, reconciling existing audit state, and writing temporary evidence. It never applies or rolls back a decision.

## Guarded modes and database identity

The default `blocked` mode cannot connect. `fixture` is restricted to synthetic local/ephemeral PostgreSQL. `staging-readonly` requires explicit staging identity. `production-readonly` is defined but rejected because `production_collection_authorized` is false. Modes are supplied only by `--mode`; environment variables never select a mode.

Every permitted invocation requires an expected environment, a project identifier/database fingerprint, PostgreSQL version and database name obtained after connection, required schemas/tables/columns including the PR-0055 audit extension, a migration/schema fingerprint, the current package-manifest hash, exactly 74 targets, an operator confirmation token, and a runtime execution identifier. Credentials and connection strings are never copied to evidence.

## Collection contract

The collector starts `BEGIN TRANSACTION READ ONLY`, takes a transaction-scoped advisory lock, checks identity/schema, and uses a parameterized `VALUES` CTE joined on all three stable identity fields. It never uses `SELECT FOR UPDATE`, broad target loading, application updates, rollback updates, or audit inserts. Missing, duplicate, unauthorized, malformed, cross-run, ordering, and target-set differences fail closed. The transaction is rolled back and the client is cleaned up even on failure.

For each target it inventories identity; source key, order/index/count, boundary version, locators and title; raw byte length; normalized length; stored/recomputed word count; stored/recomputed digest and agreement; observed/previous/intended status; and diagnostic timestamps. Timestamps do not enter immutable hashes.

Actual content exists only in collector memory. The centralized [`reviewed_boundary_content_normalization.mjs`](../../scripts/content_pipeline/reviewed_boundary_content_normalization.mjs) implements `reviewed-boundary-content-normalization-v1`: normalize CRLF/CR to LF and Unicode to NFC, replace NBSP, collapse horizontal whitespace, trim lines, remove outer blank lines, collapse excess blank lines, and append one LF. The collector hashes normalized UTF-8 itself; a stored digest is never sufficient.

Identity, boundary, content, status, and full pre-application projections are independently rebuilt with `sha256-canonical-json-v1`. Classifications are `MATCH`, `STATUS_ALREADY_APPLIED`, `STATUS_UNEXPECTED`, `IDENTITY_MISSING`, `DUPLICATE_TARGET`, `UNAUTHORIZED_TARGET`, `TARGET_SET_MISMATCH`, `BOUNDARY_DRIFT`, `CONTENT_DRIFT`, `STORED_CONTENT_DIGEST_MISMATCH`, `METADATA_DRIFT`, `SOURCE_HASH_DRIFT`, `INSUFFICIENT_BASELINE`, `AUDIT_EVENT_CONFLICT`, `AUDIT_IDENTITY_INVALID`, `PACKAGE_AUTHORITY_BLOCKED`, `DATABASE_IDENTITY_MISMATCH`, `SCHEMA_MISMATCH`, and `RUNTIME_MODE_BLOCKED`.

Audit events are read, never inserted. Reconciliation distinguishes absent or matching application events, event/status contradictions, conflicting applications, unexpected rollbacks, application-plus-rollback, duplicate semantic events, invalid identities, and invalid payloads. Partial or contradictory state blocks automation.

## Results, evidence, and validation

Package outcomes are `STAGING_PREFLIGHT_BLOCKED`, `STAGING_PREFLIGHT_MATCHED`, `STAGING_PREFLIGHT_ALREADY_APPLIED`, `STAGING_PREFLIGHT_INCONSISTENT`, and `STAGING_PREFLIGHT_ERROR`. Even a matched result is evidence for a later authority review—not execution authority.

Runtime output exists only at `tmp/reviewed-boundary-runtime-integrity-staging-preflight-evidence.json`. The independent validator checks the schema, current source/manifest hashes, exact identities and counts, result derivation, read-only transaction, zero mutation/audit counts, digest agreement, redaction, and evidence hash. It rejects blocked/production evidence, secrets, full content, fabricated success, stale hashes, and aggregate inconsistencies. No passing staging evidence is committed.

The workflow **Reviewed Boundary Runtime Integrity Staging Preflight Validation** uses ephemeral PostgreSQL 15, synthetic content, no remote service or repository secret, verifies 74-row mechanics and cleanup, and uploads only temporary fixture diagnostics. Fixture success says nothing about real staging completeness.

## Current authority and prerequisites

All of `source_snapshot_complete`, `source_snapshot_verified`, `content_integrity_authority_approved`, `application_preflight_ready`, `rollback_baseline_ready`, `application_execution_authorized`, `rollback_execution_authorized`, and `production_collection_authorized` remain `false`; the committed result is `STAGING_PREFLIGHT_BLOCKED`.

A real staging collection requires deliberate operator input, an explicitly authorized staging connection, matching identity/schema/package hashes, and independent review of temporary evidence. A later staging application additionally requires a separate authority package to consume approved evidence and enable execution.

**No application data was mutated. No application or rollback occurred. No production connection occurred. This PR does not authorize execution.**

## Canonical runtime-evidence hash

`reviewed-boundary-runtime-evidence-hash-v1` hashes the complete, final semantic evidence document except for `evidence_sha256` itself. Object keys are recursively sorted, array order is preserved, JSON is serialized without whitespace, UTF-8 bytes are hashed with SHA-256, and the lowercase hexadecimal digest is recorded. Nulls are significant and undefined values are forbidden. The evidence contract declares every included field and the sole excluded field; the evidence object is closed-world.

The collector JSON-finalizes database values (notably PostgreSQL timestamp `Date` objects) before hashing and writes the finalized document once. Previously it hashed in-memory `Date` objects as empty canonical objects, while persisted JSON converted those values to ISO strings; the validator therefore correctly recomputed a different digest from the file. The independent validator now reconstructs and canonicalizes the declared projection itself and does not import the producer's finalization or hashing functions.
