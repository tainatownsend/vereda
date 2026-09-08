import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync('src/App.jsx', 'utf8')
const favorites = readFileSync('src/pages/FavoritesPage.jsx', 'utf8')
const notes = readFileSync('src/pages/StudyNotesPage.jsx', 'utf8')
const saved = readFileSync('src/pages/SavedPassagesPage.jsx', 'utf8')
const passage = readFileSync('src/pages/PassagePage.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const library = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
const push = readFileSync('src/hooks/usePushNotifications.js', 'utf8')
const store = readFileSync('src/store/index.js', 'utf8')
const bottomNav = readFileSync('src/components/ui/BottomNav.jsx', 'utf8')

describe('UX-17 final low-tech usability pass', () => {
  it('gives study notes their own direct destination instead of sending users to progress', () => {
    expect(app).toContain('path="/notas"')
    expect(app).toContain('StudyNotesPage')
    expect(favorites).toContain("navigate('/notas')")
    expect(notes).toContain('Notas de estudo')
    expect(notes).toContain('Abrir trecho de origem')
    expect(notes).toContain("navigate(`/trecho/${note.sectionId}?from=notas`)")
  })

  it('returns people to the saved collection they came from after opening a passage', () => {
    expect(saved).toContain("navigate(`/trecho/${section.id}?from=salvos`)")
    expect(passage).toContain("searchParams.get('from')")
    expect(passage).toContain("if (source === 'notas')")
    expect(passage).toContain("path: '/notas'")
    expect(passage).toContain("if (source === 'salvos')")
    expect(passage).toContain("path: '/salvos'")
    expect(passage).toContain("path: '/descobrir'")
  })

  it('does not flash false empty journal copy while Favorites is still loading', () => {
    expect(favorites).toContain('journalLoading')
    expect(favorites).toContain("count={journalLoading ? null : notes.length}")
    expect(favorites).toContain("count={journalLoading ? null : reflections.length}")
    expect(favorites).toContain("{count ?? '—'}")
    expect(favorites).toContain('Carregando suas notas de estudo...')
    expect(favorites).toContain('Carregando suas reflexões...')
  })

  it('keeps small supporting text legible on Home, Library, and primary navigation', () => {
    expect(home).not.toContain('text-[9.5px]')
    expect(home).toContain('text-xs font-semibold text-ink/85')
    expect(library).not.toContain('text-[10px] font-medium')
    expect(library).toContain('text-xs font-medium text-muted')
    expect(bottomNav).not.toContain('text-[0.66rem]')
    expect(bottomNav).toContain('text-xs font-medium')
  })

  it('explains reminder limitations honestly and surfaces failed actions', () => {
    expect(push).toContain('supported, permission, subscribed')
    expect(settings).toContain('!pushSupported')
    expect(settings).toContain('Este navegador ou dispositivo não oferece lembretes push')
    expect(settings).toContain('Não foi possível ativar o lembrete')
    expect(settings).toContain('Não foi possível desativar o lembrete')
    expect(settings).toContain('Não foi possível atualizar seu nome')
    expect(settings).toContain('Não foi possível atualizar o horário')
  })

  it('propagates profile and sign-out API failures before the UI reports success', () => {
    expect(store).toContain('const { data, error } = await supabase')
    expect(store).toContain("throw new Error('Entre na sua conta para atualizar seu perfil.')")
    expect(store).toContain('if (error) throw error')
    expect(store).toContain('const { error } = await supabase.auth.signOut()')
    expect(store.indexOf('const { error } = await supabase.auth.signOut()')).toBeLessThan(store.indexOf("set({ user: null, profile: null })"))
  })

  it('keeps the privacy explanation aligned with synced journal data', () => {
    expect(settings).toContain('trechos salvos, notas de estudo e reflexões')
  })

  it('keeps deferred Community out of the v1 experience even on an old deep link', () => {
    expect(app).not.toContain("import CommunityPage from '@/pages/CommunityPage'")
    expect(app).toContain('path="/comunidade" element={<Navigate to="/descobrir" replace />}')
    expect(bottomNav).not.toContain("'/comunidade'")
  })
})
