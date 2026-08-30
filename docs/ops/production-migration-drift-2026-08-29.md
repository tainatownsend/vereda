# Production migration drift — 2026-08-29

## Purpose

Record the currently observed difference between the Supabase production migration ledger and the repository's current `main` migration inventory. This is an operational reconciliation note only; it does not apply or roll back any production database changes.

## Production migration ledger observed

Supabase production currently reports these applied migrations:

- `20260828101520 book_candidate_voting`
- `20260828101530 book_candidate_backend_hardening`
- `20260828101542 book_candidate_submit_rpc_fix`
- `20260828104212 public_database_security_hardening`

## Current repository state

The current `main` branch contains `supabase/migrations/20260825062000_book_candidate_voting.sql`, but does not currently contain repository files for the later `book_candidate_backend_hardening`, `book_candidate_submit_rpc_fix`, or `public_database_security_hardening` changes that are already reflected in the production database.

The production ledger versions were generated when migrations were applied through the Supabase management action, so their recorded versions differ from the original repository filenames. Do not attempt to "repair" this by blindly re-applying files with different timestamp prefixes.

## Production read-only verification

After the applied hardening changes, read-only verification confirmed:

- `public.books` has RLS enabled;
- `anon` and `authenticated` retain `SELECT` but not `INSERT`, `UPDATE`, or `DELETE` on `public.books`;
- `handle_new_user()` and `set_updated_at()` pin `search_path=public` and are not browser-executable;
- `get_streak(uuid)` and `get_reading_minutes_last_7_days(uuid)` pin `search_path=public`, deny anonymous execution, and allow authenticated execution;
- owner-scoped RLS policies on profiles, user progress, reading sessions, and push subscriptions use cached `(select auth.uid())` expressions;
- community-book tables and authenticated RPC boundaries exist;
- the `submit_book_candidate` runtime ambiguity fix is present via `ON CONFLICT ON CONSTRAINT book_candidate_votes_pkey DO NOTHING`.

## Required reconciliation before future DB rollout

1. Treat production as the source of truth for the already-applied state.
2. Restore equivalent migration/source files to version control without causing them to be re-applied under conflicting versions.
3. Decide on one migration execution path going forward (repository-driven CLI/pipeline vs management-action application) so production history and Git history remain aligned.
4. Add a CI/runtime contract that validates the hardened catalog/RLS/function boundary against disposable PostgreSQL.
5. Do not modify or roll back production during reconciliation without an explicit release decision.
