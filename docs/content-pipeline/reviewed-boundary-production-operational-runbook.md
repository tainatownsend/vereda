# Post-PR-0061 reviewed-boundary operational runbook

> **Merging PR-0061 does not execute any phase. No command here is authorized merely by repository state.**

## Phase A — Real staging collection
Deliberately authorize and run the PR-0058 collector in `staging-readonly`; independently validate its temporary evidence and retain it securely outside Git.

## Phase B — Staging evidence admission and authorization
Run PR-0059 admission, then create separate collector-operator, technical-reviewer, and execution-authorizer attestations. Evaluate authorization and issue a staging-only token.

## Phase C — Real staging execution
Deliberately run the PR-0060 guarded staging executor. Independently validate execution evidence, perform independent reconciliation, and preserve the token-consumption receipt. Stop on partial or inconsistent results.

## Phase D — Staging observation
After reconciled commit time, observe for 24 hours. Verify integrity, audit state, status stability, application behavior, and absence of rollback or defects. Create the separate staging-validation-reviewer attestation only after a pass.

## Phase E — Production collection and review
Separately authorize a fresh `production-readonly` collection with an expected redacted production identity. Admit that evidence; create distinct production collection-operator, technical-reviewer, and execution-authorizer attestations; evaluate the four-hour production authorization.

## Phase F — Production execution
This repository package does not provide or enable production execution. A controlled future executor must validate all authority before connection, bind a production-only single-use token, lock exactly 74 rows, mutate only `approval_status`, atomically record compatible audit events, and fail closed. Application authority does not authorize rollback.

## Phase G — Closure
Independently reconcile production. If applied, confirm all 74 intended statuses and events; if rolled back, confirm separately authorized rollback, original statuses, and rollback events. Create the closure-reviewer attestation and redacted closure report, then archive, supersede, or securely delete evidence under retention policy.
