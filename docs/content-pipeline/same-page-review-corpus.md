# Same-page review corpus

## Purpose

PR-0039 prepares the complete evidence corpus for the lowest-risk pending
source-review lane:

```text
container-intro-same-page
```

Scope:

```text
38 items
4 packets
Book 1: 23
Book 4: 5
Book 5: 10
```

This PR prepares evidence only.

It records no review decision and does not modify cumulative progress.

## Source verification

The canonical PDFs for Books 1, 4, and 5 are verified locally by SHA-256.

The public repository retains only source identity and structured match
metadata.

## Pair preparation

For each item, the generator:

1. reads the current canonical title from the source-review worklist;
2. reads the canonical successor title from the source-inspection packet;
3. searches the verified PDF for both headings;
4. forms candidates only when both headings occur on the same PDF page;
5. requires the current heading to precede the successor heading;
6. ranks candidates using exactness, token coverage, sequence similarity, and
   distance from the printed-page hint;
7. penalizes likely front-matter occurrences;
8. identifies ambiguous top candidates;
9. preserves incomplete evidence when no defensible pair is found.

Possible corpus states are:

```text
evidence-prepared-not-reviewed
evidence-ambiguous-not-reviewed
evidence-incomplete-not-reviewed
```

These states are not review decisions.

## Public corpus

The public corpus contains:

- immutable decision, inspection, packet, segment, and run identities;
- current and successor titles;
- source PDF page references;
- printed-page hints;
- match methods and scores;
- token coverage and sequence ratios;
- pair-candidate counts;
- ambiguity metadata;
- intervening-line counts;
- review questions;
- explicit non-review and non-application flags.

It contains no source text, excerpts, matched lines, or page text.

## Private evidence

Matched heading lines, intervening lines, and candidate page text remain only
in:

```text
.vereda-private/source-review/pr-0039-same-page-review-corpus/
```

A separate reviewer file is generated in Downloads:

```text
~/Downloads/vereda_pr_0039_private_same_page_review_corpus.txt
```

Neither private location may be committed or redistributed.

## Progress boundary

PR-0039 preserves the PR-0038 cumulative state:

```text
reviewed: 16
unresolved: 2
pending: 126
public decisions: 18
```

The 38 items remain pending until a later adjudication PR records validated
decisions.

## Application boundary

PR-0039 does not:

- complete manual review;
- record a decision;
- change cumulative progress;
- modify historical artifacts;
- commit source text or excerpts;
- approve a boundary;
- generate or apply SQL;
- modify staging or production;
- create successor mappings;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
