import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync('src/App.jsx', 'utf8')
const favorites = readFileSync('src/pages/FavoritesPage.jsx', 'utf8')
const notes = readFileSync('src/pages/StudyNotesPage.jsx', 'utf8')
const home = readFileSync('src/pages/HomePage.jsx', 'utf8')
const library = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const settings = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
const push = readFileSync('src/hooks/usePushNotifications.js', 'utf8')

describe('UX-17 final low-tech usability pass', () => {
  it('gives study notes their own direct destination instead of sending users to progress', () => {
    expect(app).toContain('path="/notas"')
    expect(app).toContain('StudyNotesPage')
    expect(favorites).toContain("navigate('/notas')")
    expect(notes).toContain('Notas de estudo')
    expect(notes).toContain('Abrir trecho de origem')
    expect(notes).toContain("navigate(`/trecho/${note.sectionId}`)")
  })

  it('does not flash false zero counts while the journal is still loading', () => {
    expect(favorites).toContain('journalLoading')
    expect(favorites).toContain("count={journalLoading ? null : notes.length}")
    expect(favorites).toContain("count={journalLoading ? null : reflections.length}")
    expect(favorites).toContain("{count ?? '—'}")
  })

  it('keeps small supporting text legible on Home and Library', () => {
    expect(home).not.toContain('text-[9.5px]')
    expect(home).toContain('text-xs font-semibold text-ink/85')
    expect(library).not.toContain('text-[10px] font-medium')
    expect(library).toContain('text-xs font-medium text-muted')
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

  it('keeps the privacy explanation aligned with synced journal data', () => {
    expect(settings).toContain('trechos salvos, notas de estudo e reflexões')
  })
})
