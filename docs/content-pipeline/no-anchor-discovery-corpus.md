# No-anchor discovery corpus

## Purpose

PR-0042 prepares semantic-anchor evidence for the final pending source-review
lane:

```text
same-page-no-semantic-anchor
```

Scope:

```text
88 items
8 packets
Book 1: 6
Book 2: 70
Book 3: 1
Book 4: 1
Book 5: 10
```

## Why discovery is required

The canonical structural map identifies these adjacent sections on the same
source-map page but does not provide a distinct body anchor for the successor
boundary.

The source may represent the section transition through:

- numbered paragraphs;
- unnumbered thematic openings;
- heading-like lines;
- semantic topic changes without a repeated table-of-contents title.

## Discovery method

The local preparation tool:

- verifies all five canonical PDFs by SHA-256;
- derives printed-page mappings from visible page headers;
- establishes packet-level search windows;
- creates numbered-paragraph, heading-like, and page-opening candidate blocks;
- ranks current and successor anchors using:
  - significant title-token coverage;
  - distinctive-token coverage;
  - ordered-token similarity;
  - text sequence similarity;
  - paragraph-number and heading bonuses;
  - printed-page proximity;
  - front-matter penalties;
- pairs current and successor candidates in canonical order;
- marks evidence as prepared, ambiguous, or incomplete.

The scoring output is discovery evidence, not an editorial decision.

## Public corpus

The public corpus contains only:

- immutable worklist, inspection, packet, segment, and run identities;
- canonical current and successor titles;
- search bounds and printed-page hints;
- candidate counts;
- PDF page and paragraph references;
- match scores and token-coverage metadata;
- ambiguity metadata;
- review questions;
- explicit non-review and non-application flags.

It contains no source text, excerpts, matched lines, candidate blocks, or page
text.

## Private evidence

Detailed evidence remains only in:

```text
.vereda-private/source-review/pr-0042-no-anchor-discovery/
```

A separate reviewer file is generated in Downloads:

```text
~/Downloads/vereda_pr_0042_private_no_anchor_discovery.txt
```

Neither private location may be committed or redistributed.

## Preserved cumulative state

```text
reviewed: 54
unresolved: 2
pending: 88
public decisions: 56
completed packets: 8
pending packets: 8
```

## Application boundary

PR-0042 does not:

- complete manual review;
- record an editorial decision;
- modify cumulative progress;
- modify historical artifacts;
- commit source text or excerpts;
- approve a boundary;
- generate or apply SQL;
- modify staging or production;
- create successor mappings;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
