# Vereda production migration policy

Production migration history has two different identities that must not be confused:

1. **Repository source identity** — the reviewed SQL file committed in Git.
2. **Production application identity** — the version recorded by Supabase when that SQL was applied through the management migration path.

The canonical reconciliation map is `supabase/production-migration-ledger.json`.

## Canonical production path

For future production DDL:

1. prepare and review the SQL in a feature branch;
2. validate the change with the existing disposable/runtime contracts where relevant;
3. apply the approved SQL through the Supabase management migration path;
4. capture the production application-time version returned by Supabase;
5. add that version, source path, and immutable source identity to `production-migration-ledger.json`;
6. when the guarded migration manifest cannot safely accept the file, preserve the exact applied operational SQL under `supabase/staging/*.applied.sql`;
7. run security/performance advisors and record/remediate findings introduced by the change;
8. only then release frontend code that depends on the new schema.

## Replay rule

An entry marked `applied` in the production ledger is already production state. A repository migration must **not** be replayed merely because its filename timestamp differs from the application-time version in Supabase.

This specifically protects the book-candidate hardening migrations and the Vereda 1.1 study-journal schema from being applied twice under alternate timestamps.

## `supabase/migrations` status

The directory remains the historical/reviewed baseline used by repository and disposable-database contracts. Its filename versions are not authoritative evidence that a production migration is missing.

Any future migration automation must consult `production-migration-ledger.json` before proposing production DDL.

## Current reconciled production applications

The ledger currently records:

- `20260828101520 book_candidate_voting`
- `20260828101530 book_candidate_backend_hardening`
- `20260828101542 book_candidate_submit_rpc_fix`
- `20260828104212 public_database_security_hardening`
- `20260908042626 study_journal_foundation`
- `20260908042732 study_journal_privilege_hardening`
- `20260908042944 study_journal_performance_hardening`

These are production-applied state and must not be replayed under their repository filename versions.
