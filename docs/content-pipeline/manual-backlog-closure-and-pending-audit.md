# Manual backlog closure and pending review audit

## Purpose

PR-0038 combines two previously separate needs:

1. diagnose and adjudicate all five items remaining in the existing
   manual-adjudication backlog;
2. audit the complete 126-item pending source-review backlog.

The five manual cases span three batches and two canonical works:

```text
O Livro dos Espíritos: 3
O Livro dos Médiuns: 2
```

## Strict adjudication

The canonical PDFs are verified by SHA-256 and read locally.

For every item, the adjudication tool:

1. searches for flexible part-title structures while preserving the canonical
   title identity;
2. searches for the expected successor heading;
3. excludes table-of-contents-like pages;
4. creates bounded current-successor candidate pairs;
5. examines the interval between the selected headings;
6. distinguishes structural lines from independent prose;
7. records a decision only when the source boundary is defensible;
8. preserves `unresolved` when evidence remains missing or ambiguous.

Possible outcomes are:

```text
exclude-structural-heading
retain-intro-segment
unresolved
```

## Public evidence

Public evidence includes only:

- immutable migration and decision identities;
- source-file identity and page references;
- candidate counts;
- match methods and scores;
- pair distance and ambiguity;
- structural and prose counts;
- decision and confidence enums;
- explicit non-application flags.

It contains no source text, excerpts, quotations, or private notes.

## Private evidence

Matched source lines, selected pairs, candidate page text, and interval details
remain only in:

```text
.vereda-private/source-review/pr-0038-remaining-manual-adjudication/
```

A separate private reviewer file is generated in Downloads.

Neither private location may be committed or redistributed.

## Manual backlog closure

All four existing manual batches are marked as reviewed.

The closure artifact distinguishes:

- resolved items;
- items that remain unresolved after manual diagnosis;
- completed batches;
- the absence of pending manual batches.

Review completion does not imply boundary approval or database application.

## Pending source-review audit

The 126 pending items remain unreviewed.

They are distributed across:

```text
container-intro-same-page: 38
same-page-no-semantic-anchor: 88
```

Recommended review sequence:

1. process the 38 bounded same-page cases;
2. process the 88 semantic-anchor discovery cases.

The audit also records packet- and book-level counts.

## Application boundary

PR-0038 does not:

- commit source text or excerpts;
- modify historical decision, recovery, consolidation, or queue artifacts;
- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create successor mappings;
- modify production;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
