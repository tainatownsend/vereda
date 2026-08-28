begin;

-- ============================================================
-- VEREDA — Public database security hardening
-- ============================================================
-- This migration preserves the app's public read-only catalog while closing
-- mutation paths that should never be available to browser client roles.

-- 1. Books are public reference content, not client-editable data.
alter table public.books enable row level security;

drop policy if exists "Leitura pública dos livros" on public.books;
create policy "Leitura pública dos livros"
on public.books
for select
to public
using (true);

grant select on table public.books to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.books
  from anon, authenticated;

-- 2. Trigger-only helpers should not be callable through the Data API, and
-- privileged trigger functions must use a fixed search path.
alter function public.handle_new_user() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = public;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- 3. Reading helpers are authenticated application RPCs. Pin their search
-- path and make the intended caller boundary explicit instead of inheriting
-- PostgreSQL's default PUBLIC EXECUTE privilege.
alter function public.get_streak(uuid) set search_path = public;
revoke execute on function public.get_streak(uuid) from public, anon;
grant execute on function public.get_streak(uuid) to authenticated;

alter function public.get_reading_minutes_last_7_days(uuid) set search_path = public;
revoke execute on function public.get_reading_minutes_last_7_days(uuid) from public, anon;
grant execute on function public.get_reading_minutes_last_7_days(uuid) to authenticated;

-- 4. Preserve the existing owner-only RLS semantics while evaluating the
-- request user once per statement instead of once per row.
alter policy "Usuário acessa apenas seu próprio perfil"
on public.profiles
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

alter policy "Usuário acessa apenas seu próprio progresso"
on public.user_progress
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "Usuário acessa apenas suas próprias sessões"
on public.reading_sessions
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "Users can manage own subscriptions"
on public.push_subscriptions
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

commit;
