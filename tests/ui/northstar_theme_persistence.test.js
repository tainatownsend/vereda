// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { useUIStore } from '@/store'

beforeEach(() => {
  localStorage.clear()
  useUIStore.setState({ appTheme: 'light', darkMode: false, readerTheme: 'light', fontSize: 'md' })
})

describe('North Star independent appearance settings', () => {
  it('persists Reader sepia without changing the global app mode', () => {
    const s = useUIStore.getState()
    s.setReaderTheme('sepia')
    expect(useUIStore.getState()).toMatchObject({ readerTheme: 'sepia', appTheme: 'light', darkMode: false })
    expect(JSON.parse(localStorage.getItem('vereda-ui')).state.readerTheme).toBe('sepia')
  })
  it('preserves Reader theme when app light/dark changes', () => {
    useUIStore.getState().setReaderTheme('dark')
    useUIStore.getState().setAppTheme('light')
    expect(useUIStore.getState().readerTheme).toBe('dark')
    useUIStore.getState().setAppTheme('dark')
    expect(useUIStore.getState()).toMatchObject({ readerTheme: 'dark', appTheme: 'dark', darkMode: true })
  })
  it('updates system-selected appearance and ignores OS changes in manual mode', () => {
    const matchMedia = vi.fn(() => ({ matches: true }))
    vi.stubGlobal('matchMedia', matchMedia)
    useUIStore.getState().setAppTheme('system')
    expect(useUIStore.getState()).toMatchObject({ appTheme: 'system', darkMode: true })
    useUIStore.getState().syncSystemAppearance(false)
    expect(useUIStore.getState().darkMode).toBe(false)
    useUIStore.getState().setAppTheme('light')
    useUIStore.getState().syncSystemAppearance(true)
    expect(useUIStore.getState().darkMode).toBe(false)
    vi.unstubAllGlobals()
  })
  it('ignores invalid reader or app themes', () => {
    useUIStore.getState().setReaderTheme('unknown')
    useUIStore.getState().setAppTheme('broken')
    expect(useUIStore.getState()).toMatchObject({ appTheme: 'light', readerTheme: 'light' })
  })
})
