# Book 3 manual-adjudication packet

## Purpose

PR-0036 prepares the first manual-adjudication packet from the queue created by
PR-0035.

The target batch is:

```text
manual-successor-anchor-adjudication-book-3-batch-01
```

It contains two unresolved cases from
*O Evangelho Segundo o Espiritismo*:

```text
Buscai e achareis
Dai gratuitamente o que gratuitamente recebestes
```

Their expected successors are:

```text
Ajuda-te a ti mesmo, que o céu te ajudará
Dom de curar
```

## Packet preparation

The canonical PDF is verified by SHA-256 and read locally.

For each case, the packet generator:

1. confirms current-title candidates inside a five-page radius around the
   source page recorded by PR-0033;
2. searches the complete PDF for exact and fuzzy successor-title candidates;
3. excludes table-of-contents-like pages;
4. limits the public successor-candidate list to eight entries;
5. stores only page references and match metadata publicly;
6. stores matched lines and page text only in private material.

## Public packet

The public packet contains:

- immutable queue and recovery identities;
- current and expected successor titles;
- source-page references;
- candidate counts;
- match methods and scores;
- token coverage and sequence ratios;
- review questions;
- explicit not-reviewed and non-application flags.

It does not contain extracted source text or excerpts.

## Private reviewer material

Private evidence is written to:

```text
.vereda-private/source-review/pr-0036-book-3-manual-adjudication/
```

A separate reviewer worksheet is generated in the user's Downloads directory.

The worksheet is not part of the repository and must not be committed or
redistributed.

## Decision boundary

PR-0036 prepares evidence only.

It does not:

- complete manual review;
- record a new review decision;
- modify historical decision, recovery, or consolidation artifacts;
- approve a boundary;
- generate or apply SQL;
- modify staging;
- load content;
- create successor mappings;
- modify production;
- migrate user progress;
- rewrite reading sessions;
- enable cutover.
