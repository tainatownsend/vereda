# Mechanical Boundary Application Plan

- Status: `planned-not-applied`
- Policy version: `2026-08-03-mechanical-boundary-application-plan-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Staged reading segments: `812`
- Accepted decisions: `166`
- Planned target rows: `166`
- Unaffected rows: `646`
- Preflight checks: `19`
- Post-application checks: `20`
- SQL applied: `false`
- Content approved or loaded: `false`
- Production modified: `false`
- Cutover enabled: `false`

## Planned transition

```text
boundary-review -> content-review
```

This transition records that the 166 canonical boundaries passed independent review and may proceed to content review.

It is not final content approval.

## Planned targets by work

| Work | Target rows |
| --- | ---: |
| O Evangelho Segundo o Espiritismo | 166 |

## Generated SQL

- read-only preflight;
- transactional one-time application;
- read-only post-application verification.

The application changes only `approval_status` and `updated_at` on the 166 private staging rows.

It does not change segment keys, order, source keys, start locators, end locators, display titles, content fields, production records, mappings, dependency snapshots, progress, sessions, or cutover.

## Decision

PR-0024 prepares the application package but does not execute it.

The SQL may be considered for manual execution only after this Pull Request is merged and the preflight returns all checks as passing.

