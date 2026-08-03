# Reading-segment resolution analysis

## Purpose

PR-0021 analyzes the 405 active review items created by PR-0020.

It identifies where structural metadata may support a future deterministic
resolution and where source or editorial review is still required.

It does not approve or apply any resolution.

## Resolution paths

### Mechanical anchor candidate

A same-page boundary becomes a mechanical candidate only when:

- the item has the `same-page-successor-boundary` reason;
- no structural, missing-locator, container-introduction, or oversized reason
  is present;
- the current proposal has a non-page canonical locator anchor;
- the successor proposal has a non-page canonical locator anchor;
- the two anchor signatures differ.

This is a candidate for future resolution, not an approved boundary.

### Source inspection required

Used when:

- locator evidence is missing;
- a container introduction must be separated;
- a same-page boundary lacks distinct non-page canonical anchors;
- the available metadata cannot determine the exact transition.

No source text is committed by this PR.

### Structural review required

Used for:

- reconstruction-plan splits;
- explicit manual reconstruction decisions.

These cases require editorial judgment before any boundary decision.

### Delivery-size review required

Used when the only active concern is an oversized legacy word-count estimate.

The canonical boundary may still be valid, but the Reader delivery unit may
need subdivision.

## Canonical anchor evidence

Page numbers alone are not treated as semantic anchors.

The analyzer ignores generic fields such as:

- printed page;
- PDF page;
- boundary role;
- source node ID;
- successor segment key.

Non-page locator fields are normalized into deterministic tokens and hashed
into short signatures.

The signatures are evidence for comparing locators. They are not source-text
hashes and do not contain book content.

## Generated queues

PR-0021 generates separate queues for:

- mechanical anchor candidates;
- source inspection;
- structural review;
- delivery-size review.

Every active item appears in exactly one queue.

## Batching

All 405 items are grouped into deterministic batches of no more than 25,
ordered by:

- resolution path;
- work;
- segment order;
- segment key.

## Database boundary

PR-0021 generates no SQL and applies no database changes.

All 812 staged rows remain in:

```text
boundary-review
```

## Rights boundary

The analysis uses only structural metadata already committed to the repository.

It does not commit:

- complete source text;
- excerpts;
- normalized content;
- source-text hashes.

## Production boundary

PR-0021 does not:

- approve boundaries;
- approve or load content;
- update staging;
- create successor mappings;
- capture dependency snapshots;
- modify progress;
- rewrite sessions;
- modify production;
- enable cutover.
