# Pilot source review

## Purpose

PR-0028 validates the source-review workflow with the smallest available
packet:

```text
container-intro-only-book-4-packet-01
```

The packet contains two structural introductions from *O Céu e o Inferno*:

- `PRIMEIRA PARTE — Doutrina`;
- `SEGUNDA PARTE — Exemplos`.

## Why this packet

It contains only two cases, both in the simplest inspection lane.

This makes it suitable for validating:

- local source verification;
- table-of-contents exclusion;
- actual source-page selection;
- structural evidence capture;
- public/private separation;
- progress accounting;
- non-application boundaries.

## Local source verification

The review requires:

```text
~/Downloads/WEB-O-Ceu-e-o-inferno-Guillon.pdf
```

The file must match the SHA-256 registered in `content/sources/manifest.json`.

The source is used only for local structural analysis.

## Page-selection method

For each expected heading, the pilot:

1. extracts selectable text locally;
2. identifies all pages containing the normalized heading tokens;
3. scores table-of-contents signals;
4. rejects pages containing dot leaders, numbered contents entries, or an
   explicit `Sumário` marker;
5. requires zero prose signals;
6. selects a distinct structural opening page.

The extracted page text is written only to:

```text
.vereda-private/source-review/pr-0028-pilot/
```

That directory remains ignored by Git.

## Structured decisions

When the selected page contains structural headings without independent prose,
the permitted decision is:

```text
exclude-structural-heading
```

The public record contains only:

- source filename and checksum;
- source PDF page;
- structural classification;
- decision enum;
- confidence level;
- non-application flags.

## Review result boundary

PR-0028 records two structured decisions.

It does not:

- commit source text or excerpts;
- approve the decisions for database application;
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

## Review progress after the pilot

```text
reviewed items: 2
pending items: 142
completed packets: 1
pending packets: 15
```
