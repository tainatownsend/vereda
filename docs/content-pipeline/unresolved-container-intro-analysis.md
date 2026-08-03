# Unresolved container-intro analysis

## Purpose

PR-0030 analyzes the 14 `container-intro-only` outcomes that remained
`unresolved` after PR-0029.

It does not reread the source PDFs and does not change any decision.

## Current unresolved distribution

```text
current-title-window-not-found: 3
selected-page-has-contents-signals: 1
successor-title-not-found: 10
```

## Resolution lanes

### Current-title window recovery

Three items had candidate pages but the line-window matcher could not
reconstruct the current canonical title.

The next bounded method should test:

- punctuation-insensitive title matching;
- normalized token windows;
- titles split across multiple extracted lines;
- line joins containing edition-specific formatting.

### Non-contents occurrence recovery

One item selected only a table-of-contents occurrence.

The next method should combine:

- canonical structure-map locators;
- a page-range floor after the contents section;
- title variants;
- later-page candidate search.

### Successor-anchor recovery

Ten items selected a current title but did not find the canonical successor
inside the bounded six-page search window.

The next method should test:

- normalized successor-title variants;
- alternative structural labels;
- numbered-item anchors;
- wider anchor-only search;
- canonical successor metadata independent of prose classification.

## Resolution batches

The queue groups cases by:

```text
resolution lane + work
```

This produces five deterministic batches.

## Analysis boundary

PR-0030 does not:

- open or extract a source PDF;
- read source text;
- record a new review decision;
- replace an unresolved decision;
- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create mappings;
- modify production;
- migrate progress;
- rewrite sessions;
- enable cutover.

## Preserved progress

```text
reviewed items: 4
unresolved items: 14
pending items: 126
public decisions: 18
completed packets: 4
pending packets: 12
```

## Next controlled step

A later PR will implement one recovery lane at a time using the locally held
private evidence and canonical structural metadata.

Any case that still lacks defensible evidence will remain unresolved.
