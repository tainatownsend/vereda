# Mechanical reading-segment resolution proposals

## Purpose

PR-0022 converts the 166 mechanical candidates from PR-0021 into a formal,
reviewable proposal package.

It does not approve or apply the proposals.

## Resolution method

Each proposal uses:

```text
canonical-successor-start-anchor
```

The canonical start locator of the immediately following segment becomes the
proposed exclusive end locator of the current segment.

## Required evidence

Generation stops unless every candidate confirms:

- the same work;
- adjacent segment order;
- the design-manifest successor link;
- exact equality between the stored next-start locator and the successor start;
- shared source-page or printed-page evidence;
- distinct non-page canonical anchor signatures.

## Approval boundary

Every proposal remains:

```text
proposal_status = proposed-not-approved
boundary_approved = false
content_approved = false
database_change_applied = false
successor_mapping_created = false
cutover_enabled = false
```

## Review batches

The 166 proposals are placed in deterministic batches of no more than 25 items.

Every proposal appears in exactly one batch.

## Rights boundary

PR-0022 uses only committed structural locator metadata.

It does not commit source text, excerpts, normalized content, or source-text
checksums.

## Database boundary

PR-0022 generates no SQL and applies no database operation.

All 812 staged rows remain in `boundary-review`.
