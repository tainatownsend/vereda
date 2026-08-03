# Mechanical boundary application evidence

## Purpose

PR-0025 applies and verifies the 166 independently accepted mechanical boundary
decisions.

The application must follow three gates:

1. run the read-only preflight;
2. apply the transaction exactly once;
3. run the read-only post-application verification.

## Preflight gate

Run:

```text
supabase/audits/mechanical_boundary_application_preflight.sql
```

The result must contain exactly 19 rows and every `passed` value must be true.

Do not run the application SQL when any check fails.

## Application gate

Run exactly once:

```text
supabase/staging/20260803110000_apply_mechanical_boundary_decisions_v1.sql
```

The transaction moves 166 private staging rows from `boundary-review` to
`content-review`.

It does not load or approve content.

## Verification gate

Run:

```text
supabase/audits/mechanical_boundary_application_verification.sql
```

The result must contain exactly 20 rows and every `passed` value must be true.

## Evidence capture

Download the preflight and verification results as CSV files.

Then run:

```bash
npm run content:staging:segments:mechanical:application:evidence:capture -- \
  "$HOME/Downloads/mechanical_boundary_application_preflight.csv" \
  "$HOME/Downloads/mechanical_boundary_application_verification.csv"
```

The capture command verifies the CSV rows against the committed SQL check keys,
copies the exact exports into the repository, and generates the evidence
manifest and summary report.

## Expected verified state

```text
166 rows: content-review
646 rows: boundary-review
content rows: 0
successor mappings: 0
dependency snapshots: 0
dry-run results: 0
production sections: 908
cutover: false
```

## Preserved boundaries

PR-0025 does not:

- approve or load content;
- create successor mappings;
- capture dependency snapshots;
- modify production;
- migrate progress;
- rewrite reading sessions;
- enable cutover.
