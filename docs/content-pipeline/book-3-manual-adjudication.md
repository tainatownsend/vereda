# Book 3 manual adjudication

## Purpose

PR-0037 adjudicates the first manual-review packet prepared by PR-0036:

```text
manual-successor-anchor-adjudication-book-3-batch-01
```

The packet contains:

```text
Buscai e achareis
Dai gratuitamente o que gratuitamente recebestes
```

## Review basis

The private PR-0036 reviewer worksheet is read locally.

No PDF is required by this PR.

For each case, the review confirms:

1. the current title is a chapter-level structural heading;
2. the expected successor is present as an exact heading;
3. both headings occur in the same chapter-opening structure;
4. only structural summary lines occur between the two headings;
5. no independent prose belongs to the current container segment;
6. the boundary is defensible.

## Decisions

Both cases are recorded as:

```text
review_status: reviewed
selected_decision: exclude-structural-heading
reviewer_confidence: high
manual_review_completed: true
supersedes_original_unresolved: true
```

The decisions are recorded but not applied.

## Public evidence

Public evidence contains only:

- immutable packet, consolidation, recovery, and decision identities;
- source-file identity and page references;
- exact manual match methods;
- same-page anchor relationship;
- structured answers to the review questions;
- structural-line counts;
- decision and confidence enums;
- explicit non-application flags.

It contains no source text, excerpts, quotations, or private review notes.

## Private evidence

Source lines, page text, and the local reviewer-packet hash remain only in:

```text
.vereda-private/source-review/pr-0037-book-3-manual-adjudication/
```

The private PR-0036 worksheet remains outside the repository in Downloads.

Neither private location may be committed or redistributed.

## Historical preservation

PR-0037 does not modify:

- PR-0029 source-review decisions;
- PR-0031 through PR-0034 recovery artifacts;
- PR-0035 consolidation or manual queue;
- PR-0036 public packet.

The two new records supersede existing unresolved outcomes only in cumulative
progress.

The public decision identity count remains 18.

## Application boundary

PR-0037 does not:

- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create successor mappings;
- modify production;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
