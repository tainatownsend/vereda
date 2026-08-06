# Reviewed-boundary production readiness and migration closure (PR-0061)

> **Merging this package executes none of the operational phases.** It performs no real staging execution, opens no production connection, mutates no database row, and leaves production execution unauthorized.

## Boundary and history

PR-0055 defines audit identity; PR-0056 fixes the integrity inventory; PR-0057 defines 74 `approval_status` application and symmetric rollback operations; PR-0058 supplies the guarded read-only collector; PR-0059 admits staging evidence and separates human authorization; PR-0060 supplies guarded staging execution and independent reconciliation. PR-0061 only defines the transition from future reconciled staging evidence through production review and final closure. CI fixtures prove mechanics, never real execution or authority.

The closed world is exactly 74 targets. The manifest records every discovered upstream reviewed-boundary artifact and both authoritative schema migrations with SHA-256 hashes. The generator rejects count, duplicate, target-set, and mutation-column disagreement.

## Lifecycle and current state

The lifecycle contract enumerates all 23 requested states and its permitted and forbidden transitions. The repository state is `STAGING_EVIDENCE_REQUIRED`; all 22 authority flags are false. Mixed, partial, or irreconcilable state is `MIGRATION_INCONSISTENT`; revocation and blocked states fail closed.

## Staging completion

Use `npm run content:staging:segments:reviewed-boundary:production-readiness:admit-staging-execution -- --mode=staging-review ...` only with temporary PR-0060 execution evidence, independent reconciliation, token receipt, expected hashes, redacted operator ID, and confirmation. Inputs must be regular non-symlink JSON files, closed-world, bounded, redacted, current, staging-only, complete, and independently reconcilable. The command has no database client.

The observation begins after the independently reconciled commit time and lasts **24 hours**. It checks stability, regression, rollback, integrity, target membership, content, boundaries, audits, behavior, and defects. Its outcomes range from `STAGING_OBSERVATION_NOT_STARTED` through active, passed, failed, expired, superseded, and inconsistent. A separate `staging-validation-reviewer` record binds exact evidence hashes, confirms the passed window and stable behavior, and permits evaluation—not production execution.

## Production review and authority

Production requires a fresh, separately authorized PR-0058 `production-readonly` collection. Staging evidence and fingerprints cannot substitute. The production identity is explicitly `production` and binds only redacted fingerprints, PostgreSQL version, schema/migration/table inventory, audit extension, collection details, target count, evidence/runtime hashes, operator, and timestamp. Hosts, credentials, connection strings, tokens, and sensitive project references are forbidden.

Admission modes are `blocked` (default), `fixture-production-review` (mechanics only), and `production-review`. Evidence must contain 74 unique authorized targets, complete matching digests, no drift, no mutation counters, a read-only transaction, compatible audit state, and the pre-application statuses derived from PR-0057 (`boundary-review`). Partial/mixed application is rejected.

Three separate records are required: production collection operator, production technical reviewer, and production execution authorizer. Staging records never substitute. Production evidence and authorization are valid for at most **4 hours**, distinct from the 24-hour observation. Drift, changed source/manifest/identity/schema/row/status/audit state, staging revocation or rollback, supersession, execution, rollback, expiry, or explicit revocation invalidates authority.

A production-only, single-use token binds evidence, decision, redacted identity, target and operation sets, PR-0057–0060 manifests, mode, timestamps, execution identifier, and confirmation. No default token exists and this package exposes no production execution entry point.

## Rollback, reconciliation, and closure

Rollback *readiness* requires all 74 original statuses, immutable hashes, production pre-application evidence, exact rollback operations, audit/conflict/transaction/reconciliation contracts, and distinct operator, authorizer, token, expiry, and revocation. Application authority never grants rollback execution; the committed rollback execution flag is false.

Independent production reconciliation requires 74 intended statuses and application events, no unauthorized mutation, preserved integrity, valid receipt and production identity, no conflict, explicit transaction outcome, and its own hash. Completion additionally requires reconciled staging and production, passed observation, all attestations, consumed/closed tokens, and resolved cleanup. Rolled-back closure instead requires explicit rollback authority, restored original statuses and events, preserved integrity, and rollback reconciliation. A closure reviewer attestation and redacted closure report are mandatory.

Raw evidence, tokens, and sensitive identity stay outside Git. Only validated redacted derivatives may be retained. Fixture, staging, and production artifacts remain labeled and separate; expiry/revocation/consumption/failures are recorded; superseded artifacts are marked; a final report supersedes placeholders; cleanup follows organizational retention policy.

## Operator checklist and escalation

1. Confirm source and manifest hashes and exact 74-target scope.
2. Never interpret CI or merge status as runtime evidence.
3. Stop on missing, drifted, partial, mixed, expired, revoked, or inconsistent state.
4. Preserve evidence outside the repository and request independent review.
5. Escalate audit conflicts, identity disagreement, unexpected status, rollback activity, or operational defects; use `MIGRATION_INCONSISTENT` until resolved.

The next operational steps after merge are the deliberately authorized phases in the accompanying runbook; none starts automatically.
