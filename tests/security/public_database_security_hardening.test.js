import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260828060000_public_database_security_hardening.sql',
  'utf8',
)

describe('public database security hardening', () => {
  it('keeps the book catalog publicly readable but not client writable', () => {
    expect(migration).toContain('alter table public.books enable row level security')
    expect(migration).toContain('create policy "Leitura pública dos livros"')
    expect(migration).toContain('for select')
    expect(migration).toContain('grant select on table public.books to anon, authenticated')
    expect(migration).toContain('revoke insert, update, delete, truncate, references, trigger')
    expect(migration).toContain('from anon, authenticated')
  })

  it('pins trigger helper search paths and removes direct browser execution', () => {
    expect(migration).toContain('alter function public.handle_new_user() set search_path = public')
    expect(migration).toContain(
      'revoke execute on function public.handle_new_user() from public, anon, authenticated',
    )
    expect(migration).toContain('alter function public.set_updated_at() set search_path = public')
    expect(migration).toContain(
      'revoke execute on function public.set_updated_at() from public, anon, authenticated',
    )
  })

  it('makes authenticated reading RPC privileges explicit', () => {
    expect(migration).toContain('alter function public.get_streak(uuid) set search_path = public')
    expect(migration).toContain('revoke execute on function public.get_streak(uuid) from public, anon')
    expect(migration).toContain('grant execute on function public.get_streak(uuid) to authenticated')
    expect(migration).toContain(
      'alter function public.get_reading_minutes_last_7_days(uuid) set search_path = public',
    )
    expect(migration).toContain(
      'grant execute on function public.get_reading_minutes_last_7_days(uuid) to authenticated',
    )
  })

  it('preserves owner-only RLS while caching auth.uid once per statement', () => {
    expect(migration).toContain('alter policy "Usuário acessa apenas seu próprio perfil"')
    expect(migration).toContain('alter policy "Usuário acessa apenas seu próprio progresso"')
    expect(migration).toContain('alter policy "Usuário acessa apenas suas próprias sessões"')
    expect(migration).toContain('alter policy "Users can manage own subscriptions"')
    expect(migration).toContain('(select auth.uid()) = id')
    expect(migration).toContain('(select auth.uid()) = user_id')
    expect(migration).not.toMatch(/using \(auth\.uid\(\) =/)
    expect(migration).not.toMatch(/with check \(auth\.uid\(\) =/)
  })
})
