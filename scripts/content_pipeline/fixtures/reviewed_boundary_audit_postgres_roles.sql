-- Test-only Supabase role compatibility fixture for PR-0055 database validation.
-- Vanilla PostgreSQL service containers do not provide Supabase platform roles.
-- This file is intentionally outside supabase/migrations and must never be
-- applied to production, staging, or remote Supabase databases.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin nosuperuser nocreatedb nocreaterole noreplication inherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin nosuperuser nocreatedb nocreaterole noreplication inherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin nosuperuser nocreatedb nocreaterole noreplication inherit;
  end if;
end
$$;
