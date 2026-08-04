# Book 2 successor-anchor recovery

## Purpose

PR-0034 processes the final unresolved-analysis recovery batch:

```text
successor-anchor-recovery-book-2-batch-01
```

The bounded scope contains seven chapter or division introductions from
*O Livro dos Médiuns*.

## Search strategy

The canonical PDF is verified by SHA-256.

For each case, the recovery tool:

1. confirms the current title inside a three-page radius around the page
   selected by PR-0029;
2. searches as many as 45 pages for the canonical successor;
3. rejects table-of-contents-like pages;
4. reconstructs current and successor titles across multiple extracted lines;
5. uses a global exact-title fallback when no local pair is available;
6. generates scored current/successor pairs;
7. rejects an ambiguous top pair;
8. requires exact normalized matches for both titles before resolution;
9. classifies the interval only after a defensible pair is established.

## Outcomes

A case becomes `resolved` only when:

- the current title and canonical successor are exact normalized matches;
- both occur outside table-of-contents-like pages;
- the successor follows the current title inside the bounded window;
- the selected pair is not ambiguous;
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

The PR-0031, PR-0032, and PR-0033 recovery artifacts remain unchanged.

Resolved PR-0034 outcomes supersede original unresolved states only in the
cumulative progress record.

The public decision identity count remains 18.

## Public and private evidence

Public artifacts contain only:

- source identity and page references;
- local or global search scope;
- candidate counts;
- match methods and scores;
- current/successor distance;
- ambiguity flag;
- structural signal counts;
- decision enum;
- confidence;
- unresolved reason;
- explicit non-application flags.

Extracted source text, candidate page text, match windows, pair candidates, and
structural intervals remain only in:

```text
.vereda-private/source-review/pr-0034-book-2-successor-anchors/
```

## Application boundary

PR-0034 does not:

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
