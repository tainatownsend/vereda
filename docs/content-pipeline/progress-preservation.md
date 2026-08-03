# Progress preservation

## Core rule

Production progress remains attached to current section IDs until the staging
content, mappings, and cutover transaction have been approved.

## Current section retained

When a current section maps directly to one verified successor with unchanged
content boundaries:

- the migration may preserve its completion state;
- the migration may preserve its resume relationship;
- the old-to-new mapping must remain available for rollback.

## Current section split

When one current section becomes multiple successor segments:

### Completed progress

All successor segments may be marked complete only when the current section is
proven to cover the complete ordered successor range.

Without that proof, automatic completion transfer is blocked.

### Incomplete progress

Resume should target the first successor containing or following the verified
current resume position.

When the exact position cannot be verified:

- resume at the first successor;
- preserve the original progress record;
- record the conservative fallback in the migration audit.

## Current sections merged

When multiple current sections become one successor:

- the successor is complete only if every contributing current section is
  complete;
- otherwise it remains incomplete.

## Unmatched sections

Any `review` relationship blocks automatic progress migration.

## Reading sessions

Historical reading sessions remain immutable.

When a new segment model is introduced, a separate mapping table may connect old
section references to new segment references. Existing session rows are not
rewritten.

## Required cutover controls

A production migration requires:

- staging tables;
- deterministic mapping tables;
- dependency counts;
- dry-run results;
- transactional cutover;
- post-cutover validation;
- rollback scripts;
- immutable migration audit records.
