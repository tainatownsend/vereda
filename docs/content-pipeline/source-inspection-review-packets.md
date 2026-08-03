# Source-inspection review packets

## Purpose

PR-0026 prepares the remaining 144 source-inspection cases for controlled
editorial review.

It does not inspect or reproduce the source text.

## Why packets are needed

These cases cannot be resolved from committed structural metadata alone.

They include:

- container introductions that may contain prose, a structural heading, or both;
- same-page transitions without distinct semantic locator anchors;
- mixed container and same-page questions.

A reviewer must inspect the locally held source edition to determine the exact
boundary.

## Inspection lanes

### Container intro only

The current node is a division, chapter, or other container introduction whose
relationship to the successor requires source inspection.

### Container intro and same page

The introduction and its successor begin in a shared page context.

The reviewer must decide both whether the introduction is an independent
segment and where the successor begins.

### Same page without semantic anchor

The current and successor segments share a page but committed metadata does not
contain a distinct semantic locator for the transition.

### Other source inspection

Fallback lane for any source-dependent case outside the known reason
combinations.

## Packet contents

Each item includes:

- inspection identifier;
- work and segment identity;
- review reasons;
- inspection lane;
- allowed decision options;
- source PDF and printed-page references;
- previous segment metadata;
- current segment metadata;
- successor segment metadata;
- adjacency and successor-link checks;
- explicit non-approval flags.

## Rights boundary

Packets contain no:

- source text;
- source excerpt;
- normalized source content;
- source-text checksum.

They use only structural metadata already committed to the repository.

## Review boundary

PR-0026 does not:

- inspect the local PDFs;
- record editorial decisions;
- approve boundaries;
- modify staging;
- load or approve content;
- create successor mappings;
- capture dependency snapshots;
- modify production;
- migrate progress;
- rewrite sessions;
- enable cutover.

## Preserved database state

The PR-0025 state remains:

```text
166 rows: content-review
646 rows: boundary-review
content rows: 0
successor mappings: 0
dependency snapshots: 0
production sections: 908
cutover: false
```

## Next controlled step

A later source-review PR will use the locally held editions and these packets to
record decisions without committing copyrighted source text.
