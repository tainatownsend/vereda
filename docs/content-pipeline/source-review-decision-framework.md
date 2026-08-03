# Source-review decision framework

## Purpose

PR-0027 defines how the 144 source-inspection cases will be reviewed and how
future structured decisions may be recorded.

It does not perform source review.

## Public and private separation

The workflow has two distinct areas.

### Public repository

The public repository may contain only:

- work and segment identifiers;
- packet identifiers;
- page numbers;
- structural locator types and values;
- one allowed decision option;
- confidence level;
- completion timestamp;
- explicit application-boundary flags.

It must not contain:

- source text;
- source excerpts;
- quotations;
- OCR output;
- normalized source content;
- private reviewer notes.

### Private local workspace

The local workspace is created under:

```text
.vereda-private/source-review/
```

The entire `.vereda-private/` directory is ignored by Git.

Temporary private notes or source references may be used there while consulting
the locally held editions. They must not be moved into public artifacts.

## Review statuses

### Pending

The item has not been reviewed. All decision and evidence values remain null.

### In review

The locally held edition is being consulted. Private notes stay only inside the
ignored workspace.

### Reviewed

The selected decision belongs to the permitted options for the inspection lane,
all required structured evidence is present, and no source text is included.

### Unresolved

The reviewer inspected the source but cannot determine a defensible boundary.
The structured decision remains `unresolved` for later escalation.

## Structured evidence

Depending on the inspection lane, a completed review may record:

- source PDF page reviewed;
- printed page reviewed;
- whether independent prose is visible;
- structural type of the successor anchor;
- structural locator type and value;
- selected decision;
- reviewer confidence;
- completion timestamp.

The evidence describes the location and structure. It does not quote the work.

## Generated worklists

The framework generates:

```text
content/migration/reading-segment-source-review-worklist.json
content/migration/reading-segment-source-review-worklist.csv
content/migration/reading-segment-source-review-packet-register.json
```

All 144 records begin as `pending`.

## Preparing the private workspace

Run:

```bash
npm run content:staging:segments:source-review:workspace:prepare
```

This creates:

```text
.vereda-private/source-review/README.md
.vereda-private/source-review/source-review-decisions.local.json
```

These files are local and ignored by Git.

## Review boundary

PR-0027 does not:

- inspect a source edition;
- record a public decision;
- approve a boundary;
- generate or apply SQL;
- modify private staging;
- load or approve content;
- create successor mappings;
- capture dependency snapshots;
- modify production;
- migrate progress;
- rewrite reading sessions;
- enable cutover.

## Preserved state

```text
166 rows: content-review
646 rows: boundary-review
144 source-inspection records: pending
85 structural-review cases: unchanged
10 size-review cases: unchanged
content rows: 0
successor mappings: 0
dependency snapshots: 0
production sections: 908
cutover: false
```

## Next controlled step

A later Pull Request will review one bounded packet at a time against the local
source editions and import only structured, content-free decisions.
