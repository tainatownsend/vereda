# No-anchor ambiguous review packet

## Purpose

PR-0043 prepares a deterministic manual-review packet for the 25 ambiguous
items identified by the PR-0042 no-anchor discovery corpus.

It does not record editorial decisions.

## Scope

```text
Discovery corpus: 88 items
Prepared evidence: 63 items
Ambiguous evidence: 25 items
Incomplete evidence: 0 items
```

Only the 25 ambiguous items are included in the review packet.

The 63 prepared items remain unchanged.

## Review packet

Each public packet item contains:

- immutable discovery, decision, inspection, packet, segment, book, and run
  identities;
- canonical current and successor titles;
- the pair-score gap that caused the ambiguity;
- two to five public candidate summaries;
- zero-based and one-based candidate indexes;
- source PDF pages and anchor metadata;
- explicit review questions;
- allowed eventual outcomes;
- explicit non-review and non-application flags.

The public packet does not contain source text.

## Private reviewer evidence

The ignored private reviewer packet contains:

- the current-anchor block for each candidate;
- the successor-anchor block for each candidate;
- source PDF and printed-page references;
- paragraph numbers;
- anchor and pair scores;
- candidate ordering;
- review questions and allowed outcomes.

Private material remains in:

```text
.vereda-private/source-review/pr-0043-no-anchor-ambiguous-review/
```

A separate reviewer file is generated in Downloads.

Neither private location may be committed or redistributed.

## Eventual outcomes

The later adjudication step may record one of:

```text
confirm-successor-start
adjust-successor-start
merge-with-successor
unresolved
```

PR-0043 records none of these outcomes.

## Preserved cumulative state

```text
reviewed: 54
unresolved: 2
pending: 88
public decisions: 56
completed packets: 8
pending packets: 8
```

## Preparation boundary

PR-0043 does not:

- modify the 63 prepared discovery items;
- complete manual review;
- record an editorial decision;
- modify cumulative progress;
- commit source text or excerpts;
- approve a boundary;
- generate or apply SQL;
- modify staging or production;
- create successor mappings;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
