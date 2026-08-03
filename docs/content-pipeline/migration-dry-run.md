# Migration dry-run framework

## Read-only production preflight

The preflight SQL checks:

- total section records;
- duplicate positions inside a work;
- orphan reading sessions;
- reading-session and section book mismatches;
- progress positions outside the valid range;
- aggregate dependency totals.

It does not return:

- user IDs;
- email addresses;
- book text;
- progress details by user;
- individual reading-session records.

## Staging dependency snapshot

After a migration run is created, the administrative snapshot function can
store aggregate dependencies per current section.

The function does not store user identifiers.

## Dry-run checks

The staging evaluator blocks readiness when it finds:

- duplicate production section positions;
- orphan reading sessions;
- reading-session book mismatches;
- invalid progress positions;
- mappings awaiting review;
- one-to-many mappings without multiple successors;
- approved segments without a dependency snapshot.

## Explicit omissions

PR-0014 does not provide:

- a production cutover function;
- a destructive rollback command;
- section deletion;
- progress updates;
- reading-session rewrites;
- content import.

## Required sequence before cutover

1. Apply and inspect the private staging schema.
2. Create a traceable migration run.
3. Load reviewed editorial nodes.
4. Load reviewed reading segments.
5. Load reversible mappings.
6. Capture aggregate dependencies.
7. Evaluate the dry run.
8. Resolve every blocking result.
9. Rehearse a transactional cutover and rollback.
10. Approve a later production migration.
