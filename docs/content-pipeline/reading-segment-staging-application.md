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

## PR-0048 reviewed boundary application semantics and readiness

PR-0048 now defines a readiness-classification package rather than an executable application package. The repository does not yet define safe source-review database mutation semantics for `adjust-successor-start` or `exclude-structural-heading` / merge outcomes, and it does not approve source-review status-only advancement merely because the mechanical pipeline used that model.

Commands:

```sh
npm run content:staging:segments:reviewed-boundary:application:readiness:build
npm run content:staging:segments:reviewed-boundary:application:readiness:validate
```

Generated artifacts:

- `content/migration/reading-segment-reviewed-boundary-application-semantics-policy.json`
- `content/migration/reading-segment-reviewed-boundary-application-readiness-plan.json`
- `content/migration/reading-segment-reviewed-boundary-application-readiness-evidence.json`
- `content/migration/reading-segment-reviewed-boundary-missing-contracts.json`
- `content/migration/reports/reading-segment-reviewed-boundary-application-readiness-summary.md`
- `supabase/audits/reviewed_boundary_application_pr0048_readiness_inspection.sql`

The readiness package records 144 public decisions, 74 status-only candidates, 6 locator-mutation contract requirements, 53 merge contract requirements, and 11 unresolved decisions that are not eligible. No decision is marked application-ready. No executable or mutating SQL is generated.

### PR-0048 readiness classification

| Public outcome | Readiness category | Application-ready? | Existing authority | Missing authority | Count |
| --- | --- | --- | --- | --- | ---: |
| `confirm-successor-start` | `status-only-candidate` | No | Historical mechanical application supports scoped status-only advancement with unchanged segment identity, order, and locators. | Formal source-review contract approving status-only advancement for this outcome. | 73 |
| `retain-intro-segment` | `status-only-candidate` | No | Container-intro review defines retained intro as independent prose before successor; historical mechanical application supports status-only advancement for mechanical decisions. | Formal source-review contract approving status-only advancement for retained intro outcomes. | 1 |
| `adjust-successor-start` | `locator-mutation-contract-required` | No | Editorial review artifacts define the outcome meaning. | Exact target row, locator column, current locator, replacement locator, ordering/overlap/reconstruction invariants, audit, and rollback contract. | 6 |
| `exclude-structural-heading` | `merge-contract-required` | No | Editorial review artifacts define structural-heading exclusion when no independent prose exists. | Whether current segment remains, is disabled, or is deleted; locator absorption; successor field changes; ordering, reconstruction, user-progress safety, audit, and rollback contract. | 53 |
| `unresolved` | `unresolved-not-eligible` | No | Review artifacts record unresolved outcomes as not approved and not applied. | None for application; unresolved records remain excluded until resolved. | 11 |
