# Non-contents occurrence recovery

## Purpose

PR-0032 processes the second recovery lane prepared by PR-0030:

```text
non-contents-occurrence-recovery
```

The lane contains one case:

```text
PARTE TERCEIRA — Das leis morais
```

The original PR-0029 source match was on PDF page 8 and contained strong
table-of-contents signals.

## Recovery method

The canonical PDF for *O Livro dos Espíritos* is verified by SHA-256.

The recovery tool:

1. excludes PDF pages before page 20;
2. reconstructs current-title variants across as many as eight extracted lines;
3. supports `PARTE TERCEIRA`, `TERCEIRA PARTE`, Roman numeral, and numeric
   variants;
4. rejects table-of-contents-like candidates;
5. locates the canonical successor `Da lei divina ou natural`;
6. requires a current/successor pair no more than 15 PDF pages apart;
7. inspects only the structural interval between those headings.

## Outcomes

The case becomes `resolved` only when:

- a later non-contents current-title occurrence is found;
- the successor title is found after it;
- the pair satisfies the bounded distance;
- the interval supports an allowed decision.

Possible decisions:

```text
exclude-structural-heading
retain-intro-segment
```

The case remains `still-unresolved` when a defensible pair cannot be found.

No outcome is forced.

## Historical preservation

The PR-0029 decision artifact remains unchanged.

The PR-0031 title-window recovery artifact remains unchanged.

A resolved PR-0032 record supersedes the original unresolved state only in the
cumulative progress record.

The public decision identity count remains 18.

## Public and private evidence

Public artifacts contain only:

- source identity and page references;
- candidate counts;
- match methods and scores;
- table-of-contents signals;
- structural signal counts;
- decision enum;
- confidence;
- unresolved reason;
- explicit non-application flags.

Extracted text, candidate page text, matched lines, and structural intervals
remain only in:

```text
.vereda-private/source-review/pr-0032-non-contents-recovery/
```

## Application boundary

PR-0032 does not:

- commit source text or excerpts;
- modify historical decision artifacts;
- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create successor mappings;
- modify production;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
