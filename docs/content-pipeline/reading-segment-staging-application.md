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

## PR-0048 reviewed boundary application package

PR-0048 prepares a deterministic, review-only application package for the current cumulative public source-review decision set. It does not execute SQL and does not connect to Supabase.

Commands:

```sh
npm run content:staging:segments:reviewed-boundary:application:package:build
npm run content:staging:segments:reviewed-boundary:application:package:validate
```

Generated artifacts:

- `content/migration/reading-segment-reviewed-boundary-application-policy.json`
- `content/migration/reading-segment-reviewed-boundary-application-plan.json`
- `content/migration/reading-segment-reviewed-boundary-application-evidence.json`
- `content/migration/reports/reading-segment-reviewed-boundary-application-summary.md`
- `supabase/staging/20260804120000_prepare_reviewed_boundary_application_pr0048.sql`
- `supabase/audits/reviewed_boundary_application_pr0048_pre_apply_verification.sql`
- `supabase/audits/reviewed_boundary_application_pr0048_post_apply_verification.sql`

The package records 144 public decisions, excludes the 11 unresolved decisions, and prepares 133 reviewed operations. Final boundary flags remain: package prepared and validated, migration not applied, database/Supabase/production not modified, user progress and reader sessions not modified, and cutover not enabled.

### PR-0048 outcome-to-operation mapping

The reviewed-boundary package derives its operation mapping from the existing source-inspection and adjudication semantics rather than from the generated package alone:

| Public outcome | Eligible? | Operation type | Mutation semantics | Existing authority | Count |
| --- | --- | --- | --- | --- | ---: |
| `confirm-successor-start` | Yes | `confirm_successor_start` | Preserve the current segment and successor ordering, record the reviewed boundary trace, and advance the scoped staging segment from `boundary-review` to `content-review`. | `content/migration/reading-segment-source-inspection-policy.json` lists this as a same-page successor-boundary decision; no-anchor adjudication validators accept it as a resolved outcome. | 73 |
| `adjust-successor-start` | Yes | `adjust_successor_start` | Preserve the current segment identity, use the approved successor-start locator metadata, record the reviewed boundary trace, and advance the scoped staging segment from `boundary-review` to `content-review`. | `content/migration/reading-segment-source-inspection-policy.json` lists this as a same-page successor-boundary decision; no-anchor adjudication validators accept it as a resolved outcome. | 6 |
| `exclude-structural-heading` | Yes | `merge_with_successor` | Treat the current structural heading as non-independent content, merge the reviewed boundary into the successor relationship, record the reviewed boundary trace, and advance the scoped staging segment from `boundary-review` to `content-review`. | Container-intro and same-page review documentation define this when no independent prose exists between current and successor headings; the source-inspection policy also exposes the equivalent `merge-intro-with-successor` lane option. | 53 |
| `retain-intro-segment` | Yes | `confirm_successor_start` | Retain the intro as an independent segment because prose exists before the successor, record the reviewed boundary trace, and advance the scoped staging segment from `boundary-review` to `content-review`. | Container-intro documentation defines this when independent prose signals exist between current and successor headings; the source-inspection policy also exposes `retain-intro-and-confirm-successor-start`. | 1 |
| `unresolved` | No | none | Generate no application SQL operation; record only safe public exclusion metadata. | Source-inspection policy and source-review validators treat unresolved decisions as not approved and not applied. | 11 |
