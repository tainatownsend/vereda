# Same-page review adjudication

## Purpose

PR-0040 adjudicates the complete 38-item evidence corpus prepared by PR-0039.

The corpus covers four packets:

```text
Book 1: 23
Book 4: 5
Book 5: 10
```

## Outcome

All 38 items are recorded as:

```text
exclude-structural-heading
```

The selected source pairs show:

- the current container heading;
- an optional structural synopsis;
- the canonical successor heading;
- no independent prose between the current and successor headings.

## Candidate corrections

Four items require an explicit private-candidate selection instead of blindly
using the first ranked candidate:

```text
Da volta do Espírito, extinta a vida corpórea, à vida espiritual
Temor da morte
Uranografia geral
Teorias sobre a formação da Terra
```

These corrections distinguish actual chapter openings from synopsis-line,
running-header, or close-score candidates.

## Public evidence

Public decisions contain only:

- immutable corpus, decision, inspection, packet, segment, and run identities;
- source PDF page references;
- selected private-candidate indexes;
- match methods and scores;
- title token coverage;
- intervening-line counts;
- structured content classification;
- decision and confidence enums;
- explicit non-application flags.

No source text, matched lines, page text, excerpts, or reviewer notes are
committed.

## Private evidence

Detailed selected pairs remain only in:

```text
.vereda-private/source-review/pr-0040-same-page-adjudication/
```

A separate reviewer file is generated in Downloads:

```text
~/Downloads/vereda_pr_0040_private_same_page_adjudication.txt
```

Neither private location may be committed or redistributed.

## Deferred integration

PR-0040 records and validates the decisions but deliberately leaves cumulative
progress unchanged.

Current state:

```text
reviewed: 16
unresolved: 2
pending: 126
public decisions: 18
completed packets: 4
pending packets: 12
```

Projected integration state:

```text
reviewed: 54
unresolved: 2
pending: 88
public decisions: 56
completed packets: 8
pending packets: 8
```

A later integration PR should apply this delta after updating cumulative
validator compatibility.

## Application boundary

PR-0040 does not:

- update cumulative progress;
- modify historical artifacts;
- commit source text or excerpts;
- approve a boundary;
- generate or apply SQL;
- modify staging or production;
- create successor mappings;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
