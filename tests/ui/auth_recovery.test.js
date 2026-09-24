import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../../src/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }))
afterEach(() => { vi.resetModules(); vi.clearAllMocks() })
it('exits loading and shows recovery when session lookup rejects', async () => {
  const { supabase } = await import('../../src/lib/supabase')
  supabase.auth.getSession.mockRejectedValue(new Error('Unavailable'))
  const { useAuthStore } = await import('../../src/store')
  await useAuthStore.getState().init()
  expect(useAuthStore.getState()).toMatchObject({ loading: false, authError: true, user: null })
})
it('also handles a returned auth error without treating it as signed out', async () => {
  const { supabase } = await import('../../src/lib/supabase')
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: new Error('Unavailable') })
  const { useAuthStore } = await import('../../src/store')
  await useAuthStore.getState().init()
  expect(useAuthStore.getState()).toMatchObject({ loading: false, authError: true })
})
