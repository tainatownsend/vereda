# Mechanical boundary application plan

## Purpose

PR-0024 prepares the controlled database application for the 166 mechanical
boundary decisions independently accepted in PR-0023.

It generates SQL but does not execute it.

## Status transition

The planned transition is:

```text
boundary-review -> content-review
```

`content-review` means:

- the canonical start and end boundaries passed independent review;
- the segment may proceed to content review;
- no source text has been approved;
- no segment is ready for Reader publication.

The staging schema reserves `approved` for records that already contain
content, word count, and normalized-content checksum. PR-0024 does not use that
status.

## Target scope

The plan targets exactly 166 segments from:

```text
O Evangelho Segundo o Espiritismo
```

The other 646 staged segments remain in `boundary-review`.

## Generated SQL

### Preflight

```text
supabase/audits/mechanical_boundary_application_preflight.sql
```

Read-only checks confirm the current database still matches the reviewed
application assumptions.

### Application

```text
supabase/staging/20260803110000_apply_mechanical_boundary_decisions_v1.sql
```

The transaction:

- requires the verified migration run to remain in `reviewing`;
- requires rights to remain `blocked`;
- requires exactly 812 staged segments;
- requires all 166 targets to remain in `boundary-review`;
- verifies current locators against independent review evidence;
- changes only `approval_status` and `updated_at`;
- records one audit event;
- preserves the migration run in `reviewing`;
- rolls back on any failed precondition or postcondition.

### Verification

```text
supabase/audits/mechanical_boundary_application_verification.sql
```

Read-only checks verify the intended post-application state.

## Preserved fields

The application does not change:

- segment key;
- source key;
- segment order;
- start locator;
- end locator;
- display title;
- content;
- word count;
- normalized-content checksum.

## Database boundary

PR-0024 does not execute SQL.

Database application remains unauthorized until a later explicit application
step.

## Production boundary

The plan does not:

- load or approve content;
- create successor mappings;
- capture dependency snapshots;
- modify progress;
- rewrite reading sessions;
- modify production sections;
- enable cutover.
