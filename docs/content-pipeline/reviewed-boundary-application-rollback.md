# PR-0057 guarded reviewed-boundary application and rollback

This package defines, but does not execute, the application and rollback mechanism for the exact 74 status-only decisions. Each application operation identifies one row by `run_id`, `book_id`, and `segment_key`, advances only `approval_status` from `boundary-review` to `content-review`, and carries the immutable PR-0056 integrity references. Its symmetric rollback restores only the original status and requires a matching application audit event plus later explicit rollback authority.

## Fail-closed preflight and integrity

Preflight validates the exact target set, source hashes, identity, authority, audit conflicts, and every immutable boundary field. At runtime actual content must be loaded, normalized with `reviewed-boundary-content-normalization-v1`, and independently measured. The normalized digest, byte and normalized lengths, word count, stored-versus-recomputed agreement, and content projection are recomputed; the stored digest is never trusted alone. Boundary or content drift, digest disagreement, incomplete baselines, source drift, missing/duplicate/unauthorized targets, unexpected status, or audit conflict aborts the whole transaction.

## Transaction, locks, audit, and retries

The future application uses one all-or-nothing transaction. It takes a transaction-scoped advisory lock derived from the package identifier, loads and locks all rows with `FOR UPDATE` in `(run_id, book_id, segment_order, segment_key)` order, preflights all 74 before mutation, changes only statuses, inserts PR-0055 structured audit events, and runs postflight before commit. No per-row commits are allowed. The SQL is a non-executable, parameterized contract; the default mode is blocked.

Application uses `status-advanced`; rollback uses `status-rollback`, producing distinct deterministic event keys. The PR-0055 predicate-bearing partial-index conflict target is retained. An exact retry with all intended statuses, identical events, and unchanged integrity is a successful no-op without an update or duplicate audit insert. Any status/event disagreement, partial application, payload conflict, missing row, or later drift requires reconciliation.

Postflight proves all 74 rows and events, unchanged boundary/content projections and digest agreement, correct affected-row count, no rollback events, no unauthorized mutations, and complete reconciliation. Failure rolls back. Rollback uses the same lock and closed-world transaction, and additionally requires confirmed application execution, exactly matching application events, applied statuses, unchanged identity/boundary/content, no conflicts, a complete rollback baseline, and authority from a later package.

## Evidence and current state

Future runtime evidence belongs only under `tmp/` and reports database/version identity, source hashes, authority, classification and mutation counts, audit/conflict counts, postflight or rollback result, zero unauthorized mutations, transaction outcome, and cleanup. Passing runtime evidence is not committed.

PostgreSQL 15 integration is appropriate when an executable runtime is introduced. This PR supplies non-executable templates only; the existing PR-0055 ephemeral PostgreSQL workflow already validates the scoped audit partial-index behavior. Synthetic tests can prove mechanics but cannot approve the real targets.

The current state is `PACKAGE_BLOCKED`: all 74 content baselines are incomplete, and source snapshot completion, snapshot verification, content-integrity authority, application preflight readiness, application authority, and rollback-baseline readiness remain false. Real staging execution additionally needs an explicitly approved runtime database identity, zero drift/conflicts, a matching manifest hash, apply mode, and deliberate operator confirmation. Rollback needs later explicit authority.

PR-0057 did not mutate `content_staging.reading_segments`, did not connect to Supabase or any production database, and does not authorize staging or production execution.
