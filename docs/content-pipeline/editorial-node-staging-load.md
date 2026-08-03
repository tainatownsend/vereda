# Canonical editorial-node staging load

## Purpose

PR-0017 creates the first traceable content-staging migration run and loads the
five canonical source-structure maps into `content_staging.editorial_nodes`.

The load contains structural metadata only.

## Inputs

The load is generated from:

- the five canonical source maps;
- the five reconstruction plans;
- the current production-structure snapshot;
- the verified empty staging foundation from PR-0016.

Every input file receives a SHA-256 reference.

## Migration run

The run has:

- a deterministic UUID;
- a unique migration version;
- the production snapshot checksum;
- one combined reconstruction-plan checksum;
- five source-map checksums;
- `rights_status = blocked`;
- `status = loaded` only after all nodes pass transactional checks.

## Editorial nodes

Each staged node contains:

- book ID;
- deterministic source key;
- parent source key;
- node type;
- canonical order;
- label;
- title;
- source locator metadata;
- source-map checksum.

Source locator metadata may include:

- source node ID;
- PDF table-of-contents page;
- printed page;
- paragraph or page locator;
- hierarchy depth.

It does not include book content.

## Transactional protections

The load stops when:

- the private staging schema is missing;
- any staging table already contains rows;
- production no longer contains the expected 908 sections;
- the five production book IDs are unavailable;
- the number of inserted nodes differs from the generated manifest;
- an editorial parent reference is unresolved;
- a downstream staging entity receives rows.

Any failure rolls back the transaction.

## Explicitly empty entities

PR-0017 keeps these tables empty:

- `content_staging.reading_segments`;
- `content_staging.current_successor_mappings`;
- `content_staging.dependency_snapshots`;
- `content_staging.dry_run_results`.

## Rights boundary

The run remains blocked for rights clearance.

Loading table-of-contents metadata does not authorize:

- complete source-text loading;
- content redistribution;
- Reader publication;
- production cutover.

## Production boundary

PR-0017 does not modify:

- `public.books`;
- `public.sections`;
- `public.user_progress`;
- `public.reading_sessions`;
- Reader RPCs;
- frontend code.

## Next gate

Reading-segment design begins only after the editorial hierarchy has been
verified in staging.

Segment work must remain separate from:

- complete text loading;
- progress mappings;
- dependency snapshots;
- dry-run approval;
- production cutover.
