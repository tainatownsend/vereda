# Content staging foundation

## Purpose

PR-0014 defines a private and non-production database workspace for rebuilding
the five works without changing the current Reader data.

## Schema boundary

All new database objects are created inside:

```text
content_staging
```

The migration does not alter:

- `public.books`;
- `public.sections`;
- `public.user_progress`;
- `public.reading_sessions`;
- existing Reader RPCs.

The public tables are referenced only for foreign keys and aggregate
dependency checks.

## Staging entities

### Migration runs

Tracks one reconstruction attempt, its source checksums, rights state, status,
and audit history.

### Editorial nodes

Stores canonical source hierarchy.

Editorial nodes describe the book. They do not determine Reader screen size.

### Reading segments

Stores future Reader delivery units.

A segment may represent:

- one editorial node;
- part of a large editorial node;
- a reviewed group of small editorial nodes.

### Current-successor mappings

Connects legacy `public.sections` IDs to future reading segments.

Mappings are reversible and retain the original section ID for rollback.

Canonical units without a current predecessor are not inserted into this
mapping table. They remain represented by canonical coverage and receive
staged reading segments only after their boundaries are approved.

### Dependency snapshots

Stores aggregate counts for:

- progress positioned at a current section;
- completed book-progress records;
- reading sessions;
- distinct users with sessions.

No user identifiers are stored in the staging snapshot.

### Dry-run results

Stores blocking, warning, and informational checks.

### Audit events

Records staging and migration workflow events.

## Access boundary

The staging schema is unavailable to:

- `public`;
- `anon`;
- `authenticated`.

Only the administrative `service_role` receives access.

No staging table is exposed to the application in this Pull Request.

## Application boundary

PR-0014 creates SQL and validation artifacts only.

The migration is not automatically applied by the repository script.

No cutover function exists.
