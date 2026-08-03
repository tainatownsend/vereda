# Book reconstruction plan

## Purpose

PR-0013 converts the structural comparison from PR-0012 into a versioned,
reviewable reconstruction plan.

The plan is still diagnostic.

It does not:

- extract or commit complete book text;
- modify production sections;
- modify user progress;
- modify reading sessions;
- execute a database migration;
- authorize redistribution of the selected translations.

## Plan layers

### Current-section decisions

Every current section receives a decision:

- `keep`;
- `relabel-review`;
- `reclassify`;
- `split`;
- `review`.

The plan records:

- current section identity and order;
- canonical relationship;
- confidence;
- reason;
- manual-review requirement;
- progress-preservation strategy;
- provisional segment identity when appropriate.

### Canonical coverage

Every canonical editorial node receives a coverage status:

- `covered`;
- `covered-title-review`;
- `covered-role-review`;
- `aggregate-needs-split`;
- `multiple-current-records`;
- `relationship-blocked`;
- `missing-current-unit`.

### Reconstruction strategy

Each work receives one strategy:

#### `metadata-alignment`

Current boundaries appear aligned, but metadata still requires verification.

#### `targeted-staging-reconstruction`

Selected editorial units require reconstruction in staging.

#### `full-staging-reconstruction`

The complete work should be reconstructed in staging and compared as an ordered
set before cutover.

## Segment identity

Canonical source keys identify editorial units.

They are not always equivalent to Reader segments.

A Reader segment may represent:

- one canonical section;
- part of a large canonical section;
- a controlled group of small canonical sections.

For direct, non-split relationships, PR-0013 generates a provisional segment
key based on:

- book slug;
- canonical source key;
- segment index;
- boundary version.

These keys are explicitly marked as non-production.

Split candidates do not receive provisional segment keys until their content
boundaries are reviewed.

## Manual-review queue

The queue is prioritized as follows:

1. unmatched records;
2. split candidates;
3. reclassification candidates;
4. title-review candidates.

No item in that queue is automatically approved.
