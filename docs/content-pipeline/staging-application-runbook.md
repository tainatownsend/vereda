# Private content-staging application runbook

## Scope

PR-0016 prepares evidence for applying only the private `content_staging`
foundation created in PR-0014.

The process is intentionally divided into two gates:

1. read-only production preflight;
2. explicit staging-schema application and post-application verification.

Passing the first gate does not authorize production content replacement.

## Gate 1: read-only production preflight

Run:

```text
supabase/audits/content_migration_preflight.sql
```

Export the result as CSV.

The local importer verifies:

- all required checks are present;
- every blocking check passed;
- production still has the expected 908 section records;
- no user identifiers are included;
- dependency values are aggregate nonnegative counts.

A failed or changed preflight blocks application.

## Gate 2: private schema application

Gate 2 may begin only after Gate 1 evidence is reviewed.

The only SQL eligible for application is:

```text
supabase/migrations/20260803033000_content_staging_foundation.sql
```

The migration creates objects only inside `content_staging`.

It must not be combined with:

- content imports;
- migration-run inserts;
- dependency snapshots;
- Reader changes;
- progress updates;
- section updates;
- cutover SQL.

## Post-application verification

After application, run:

```text
supabase/audits/content_staging_post_apply_verification.sql
```

The verification checks:

- schema existence;
- expected tables, functions, and view;
- denial of application-role access;
- service-role schema access;
- empty staging tables;
- unchanged production section count.

## Stop conditions

Stop immediately when:

- any blocking preflight check fails;
- the production section count differs from 908;
- the migration contains local edits not present in the reviewed branch;
- the SQL Editor reports any error;
- application roles can access the staging schema;
- staging tables contain rows immediately after application;
- public content tables change.

## Cutover boundary

PR-0016 does not:

- load editorial nodes;
- load reading segments;
- create mappings;
- capture dependency snapshots;
- migrate progress;
- rewrite sessions;
- expose staging to the Reader;
- execute a content cutover.
