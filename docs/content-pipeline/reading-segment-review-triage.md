# Reading-segment review triage

## Purpose

PR-0020 turns the PR-0018 review-reason list into an actionable editorial
work queue.

It does not approve boundaries or update staged database rows.

## Why triage is required

The original queue combines different concerns:

- missing boundary evidence;
- reconstruction decisions;
- same-page starts;
- container introductions;
- oversized delivery estimates;
- missing legacy size estimates.

These concerns do not carry equal risk.

A missing legacy word-count estimate is useful diagnostic information, but it
does not independently prove that a canonical start or end boundary is wrong.

## Priorities

### P0 — boundary blocker

Used when locator evidence is missing.

### P1 — structural decision

Used for reconstruction-plan splits and explicit manual reconstruction reviews.

### P2 — boundary evidence

Used for same-page successor starts and container-introduction boundaries.

### P3 — delivery size

Used when a legacy estimate suggests an oversized Reader unit.

### P4 — metadata only

Used when the only concern is the absence of a legacy word-count estimate.

## Dispositions

### Active manual review

P0–P3 items remain in the active review queue.

They are grouped into deterministic batches of no more than 25 items by
priority and work.

### Deferred metadata

An item may leave the active boundary-review workload only when its complete
reason set is:

```text
no-legacy-word-count-estimate
```

This deferment means only:

- canonical boundary work is not blocked by the absent legacy estimate;
- the missing size estimate remains recorded;
- no boundary is approved;
- no content is approved;
- no database status changes;
- no Reader behavior changes.

## Generated artifacts

- complete triage manifest;
- active manual-review queue;
- deferred metadata list;
- deterministic review batches;
- summary report.

## Database boundary

PR-0020 generates no SQL and applies no database changes.

All 812 staged rows remain in:

```text
boundary-review
```

The active editorial workload may be smaller than the database row count
because metadata-only diagnostics are tracked separately.

## Production boundary

PR-0020 does not:

- load content;
- approve boundaries;
- update staging;
- create successor mappings;
- capture dependency snapshots;
- modify progress;
- rewrite sessions;
- modify production sections;
- enable cutover.
