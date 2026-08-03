# Current-title window recovery

## Purpose

PR-0031 processes the first recovery lane prepared by PR-0030:

```text
current-title-window-recovery
```

The bounded scope contains three cases:

- two from *O Livro dos Espíritos*;
- one from *O Livro dos Médiuns*.

## Recovery method

The two canonical PDFs are located by SHA-256.

For each case, the recovery tool:

1. starts from the previously selected non-contents source page;
2. searches that page and a two-page radius;
3. normalizes accents and punctuation;
4. supports `PARTE PRIMEIRA` and `PRIMEIRA PARTE` order variants;
5. supports ordinal word, Roman numeral, and numeric variants;
6. reconstructs titles split across as many as eight extracted lines;
7. locates the canonical successor heading inside a bounded four-page search;
8. classifies only the structural interval between the current and successor
   headings.

## Outcomes

A case becomes `resolved` only when:

- the current title window is recovered;
- the selected page has no contents signals;
- the canonical successor heading is found;
- the evidence supports an allowed decision.

Possible replacement decisions:

```text
exclude-structural-heading
retain-intro-segment
```

A case remains `still-unresolved` when any required condition is missing.

No outcome is forced.

## Historical decision preservation

The PR-0029 decision artifact remains unchanged.

A resolved PR-0031 record references and supersedes the corresponding original
`unresolved` decision only in the cumulative review state.

The number of public decision identities remains 18.

## Public and private evidence

Public artifacts contain only:

- source identity and page references;
- title-match method and score;
- structural signal counts;
- decision enum;
- confidence;
- unresolved reason;
- explicit non-application flags.

Extracted text, matched lines, candidate pages, and structural intervals remain
only in:

```text
.vereda-private/source-review/pr-0031-title-window-recovery/
```

## Application boundary

PR-0031 does not:

- commit source text or excerpts;
- modify the historical PR-0029 decision artifact;
- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create successor mappings;
- modify production;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
