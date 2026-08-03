# Mechanical Boundary Application Evidence

- Status: `mechanical-boundaries-applied-and-verified`
- Policy version: `2026-08-03-mechanical-boundary-application-evidence-v1`
- Migration run ID: `adcff561-8f92-545c-a219-615818a454f4`
- Captured at: `2026-08-03T18:04:58.284Z`
- Preflight checks passed: `19`
- Verification checks passed: `20`
- Target rows moved to content-review: `166`
- Target rows remaining in boundary-review: `0`
- Unaffected rows remaining in boundary-review: `646`
- Application audit events: `1`
- Content rows: `0`
- Successor mappings: `0`
- Dependency snapshots: `0`
- Dry-run results: `0`
- Production sections: `908`
- Cutover enabled: `false`

## Applied transition

```text
166 rows: boundary-review -> content-review
646 rows: remain in boundary-review
```

## Evidence

The committed evidence includes the exact CSV exports from the read-only
preflight and post-application verification queries.

Every preflight and verification check passed.

## Preserved boundaries

The application changed only the private staging review status and audit
metadata.

It did not approve or load content, create successor mappings, capture
dependency snapshots, modify production, migrate progress, rewrite reading
sessions, or enable cutover.

