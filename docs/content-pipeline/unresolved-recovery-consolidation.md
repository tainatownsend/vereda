# Unresolved recovery consolidation

## Purpose

PR-0035 closes the bounded automated-recovery phase for the 14 unresolved
container-introduction decisions analyzed by PR-0030.

It consolidates outcomes from:

```text
PR-0031 — current-title window recovery
PR-0032 — non-contents occurrence recovery
PR-0033 — Book 3 successor-anchor recovery
PR-0034 — Book 2 successor-anchor recovery
```

No PDF or source file is read by this PR.

## Consolidated result

```text
Recovery attempts: 14
Resolved outcomes: 7
Still unresolved: 7
Resolved as exclude-structural-heading: 7
Resolved as retain-intro-segment: 0
```

Resolved outcomes remain structured and unapplied.

They do not approve boundaries or modify staging.

## Manual-adjudication lanes

The seven remaining cases are routed to three manual lanes.

### Manual current-title adjudication

Used when bounded recovery could not confirm the canonical current title.

```text
Expected items: 4
```

### Manual source-opening adjudication

Used when the initial occurrence was table-of-contents-like and no later
defensible opening was recovered.

```text
Expected items: 1
```

### Manual successor-anchor adjudication

Used when the current title was confirmed but the canonical successor was not
recovered inside the expanded search window.

```text
Expected items: 2
```

## Deterministic batching

Cases are grouped by:

1. manual-adjudication lane;
2. source work;
3. stable segment order.

The result is four batches covering all seven remaining cases exactly once.

## Historical preservation

PR-0035 does not modify:

- the PR-0029 source-review decisions;
- the PR-0031 title-window recovery artifact;
- the PR-0032 non-contents recovery artifact;
- the PR-0033 Book 3 recovery artifact;
- the PR-0034 Book 2 recovery artifact.

The cumulative public decision identity count remains 18.

## Application boundary

PR-0035 does not:

- read PDF or source files;
- read source text;
- create a new review decision;
- commit source text or excerpts;
- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create successor mappings;
- modify production;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
