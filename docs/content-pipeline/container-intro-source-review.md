# Remaining container-intro source review

## Purpose

PR-0029 reviews the three remaining packets in the
`container-intro-only` inspection lane.

The scope contains 16 cases:

```text
O Livro dos Espíritos: 4
O Livro dos Médiuns: 9
O Evangelho Segundo o Espiritismo: 3
```

The two pilot decisions from *O Céu e o Inferno* remain preserved.

## Conservative review method

Each canonical PDF is located by SHA-256 in the local Downloads directory.

For each item, the review:

1. locates candidate pages containing the current canonical title;
2. penalizes table-of-contents indicators;
3. uses the successor printed page only as a distance hint;
4. identifies the current title window;
5. searches up to six pages for the canonical successor title;
6. analyzes only the lines structurally located between the two titles;
7. records one of three outcomes.

## Outcomes

### Exclude structural heading

Recorded only when:

- the current and successor titles are identified;
- no prose signal exists between them;
- the decision is allowed by the worklist.

```text
exclude-structural-heading
```

### Retain intro segment

Recorded only when:

- the current and successor titles are identified;
- independent prose signals exist between them;
- the decision is allowed by the worklist.

```text
retain-intro-segment
```

### Unresolved

Recorded when the source structure cannot support a defensible automatic
classification.

Examples include:

- no exact current-title candidate;
- the selected occurrence still resembles a contents page;
- the successor title cannot be located within the bounded search window;
- the derived decision is not allowed by the packet policy.

No decision is forced.

## Public and private evidence

Public artifacts may contain only:

- source file and SHA-256;
- source page references;
- structural signal counts;
- decision enum;
- confidence;
- unresolved reason;
- explicit non-application flags.

Extracted page text and lines between headings remain only in:

```text
.vereda-private/source-review/pr-0029-container-intro/
```

The directory is ignored by Git.

## Review boundary

The PR records structured outcomes but does not:

- approve boundaries;
- generate or apply SQL;
- modify private staging;
- load or approve content;
- create successor mappings;
- capture dependency snapshots;
- modify production;
- migrate progress;
- rewrite reading sessions;
- enable cutover.

## Preserved database state

```text
166 rows: content-review
646 rows: boundary-review
content rows: 0
successor mappings: 0
dependency snapshots: 0
production sections: 908
cutover: false
```

## Expected cumulative progress

```text
public decisions: 18
pending source-review items: 126
completed packets: 4
pending packets: 12
```

Reviewed and unresolved totals depend on the verified local source structure.
