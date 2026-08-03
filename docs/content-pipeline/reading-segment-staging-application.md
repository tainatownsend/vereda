# Reading-segment staging application

## Purpose

PR-0019 applies the content-free boundary design created in PR-0018 to the
private `content_staging.reading_segments` table.

The application is limited to structural boundary metadata.

## Preconditions

Before application:

- PR-0017 contains one verified migration run;
- the run status is `loaded`;
- rights status is `blocked`;
- 826 editorial nodes exist;
- reading segments are empty;
- successor mappings are empty;
- dependency snapshots are empty;
- dry-run results are empty;
- production contains 908 legacy section records.

## Applied data

The load inserts 812 rows containing:

- deterministic segment key;
- production book ID;
- canonical source key;
- proposed order;
- boundary version;
- provisional start and end locators;
- display title;
- `approval_status = boundary-review`.

## Null content fields

Every staged row keeps these fields null:

- `content`;
- `word_count`;
- `normalized_content_sha256`.

The application does not load complete source text or approved Reader content.

## Transaction behavior

The load runs inside one transaction.

A failed precondition or postcondition rolls back the complete operation.

After successful insertion, the migration run moves from:

```text
loaded
```

to:

```text
reviewing
```

This status means boundary metadata exists but is not approved for production.

## Verification

The PR-0019 verification checks:

- migration-run and rights statuses;
- total and per-work counts;
- boundary-review-only status;
- null content fields;
- canonical editorial-node references;
- unique deterministic keys;
- contiguous per-work ordering;
- start and end locators;
- boundary version;
- segment index/count shape;
- empty successor mappings;
- empty dependency snapshots;
- empty dry-run results;
- audit-event presence;
- unchanged production section count;
- denied application-role access.

## Explicit exclusions

PR-0019 does not:

- approve boundaries;
- load source text;
- create mappings;
- capture dependencies;
- migrate progress;
- rewrite sessions;
- connect staging to the Reader;
- resolve publication rights;
- enable cutover.
