# Book 3 successor-anchor recovery

## Purpose

PR-0033 processes the smaller of the two remaining
`successor-anchor-recovery` batches.

The bounded scope contains three chapter introductions from
*O Evangelho Segundo o Espiritismo*:

```text
Não separeis o que Deus juntou
Buscai e achareis
Dai gratuitamente o que gratuitamente recebestes
```

Their canonical successors are:

```text
Indissolubilidade do casamento
Ajuda-te a ti mesmo, que o céu te ajudará
Dom de curar
```

## Recovery method

The canonical PDF is verified by SHA-256.

For each case, the recovery tool:

1. confirms the current title near the source page recorded by PR-0029;
2. rejects table-of-contents-like pages;
3. reconstructs current and successor titles across multiple extracted lines;
4. searches as many as 30 PDF pages beyond the current title;
5. generates current/successor candidate pairs;
6. rejects an ambiguous top pair;
7. classifies the interval only after a reliable successor anchor is found.

## Outcomes

A case becomes `resolved` only when:

- the current title is confirmed;
- a non-contents successor anchor is found;
- the pair is not ambiguous;
- the successor is inside the bounded expanded window;
- the structural interval supports an allowed decision.

Possible decisions:

```text
exclude-structural-heading
retain-intro-segment
```

A case remains `still-unresolved` whenever any required condition is missing.

No outcome is forced.

## Historical preservation

The PR-0029 decision artifact remains unchanged.

The PR-0031 title-window recovery artifact remains unchanged.

The PR-0032 non-contents recovery artifact remains unchanged.

A resolved PR-0033 record supersedes an original unresolved state only in the
cumulative progress record.

The public decision identity count remains 18.

## Public and private evidence

Public artifacts contain only:

- source identity and page references;
- candidate counts;
- match methods and scores;
- current/successor distance;
- ambiguity flag;
- structural signal counts;
- decision enum;
- confidence;
- unresolved reason;
- explicit non-application flags.

Extracted source text, candidate page text, match windows, and structural
intervals remain only in:

```text
.vereda-private/source-review/pr-0033-book-3-successor-anchors/
```

## Application boundary

PR-0033 does not:

- commit source text or excerpts;
- modify historical decision or recovery artifacts;
- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create successor mappings;
- modify production;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
