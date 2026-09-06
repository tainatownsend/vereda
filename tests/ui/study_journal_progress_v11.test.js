import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const reflection = readFileSync('src/pages/ReflectionPage.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')
const favorites = readFileSync('src/pages/FavoritesPage.jsx', 'utf8')
const evolution = readFileSync('src/pages/EvolutionPage.jsx', 'utf8')
const journal = readFileSync('src/features/studyJournal/studyJournal.js', 'utf8')
const progress = readFileSync('src/features/studyProgress/studyProgress.js', 'utf8')
const migration = readFileSync('supabase/migrations/20260906062000_study_journal_foundation.sql', 'utf8')

describe('Vereda 1.1 personal study journal', () => {
  it('syncs reflections and study notes through a private journal with local resilience', () => {
    expect(journal).toContain(".from('study_journal_entries')")
    expect(journal).toContain("entryType: 'reflection'")
    expect(journal).toContain("entryType: 'note'")
    expect(journal).toContain('vereda-study-journal:')
    expect(reflection).toContain('Reflexão salva na sua conta.')
    expect(reflection).toContain('A sincronização será retomada quando estiver disponível.')
  })

  it('lets a reader attach one personal note to the current passage', () => {
    expect(reader).toContain('Minha nota neste trecho')
    expect(reader).toContain('Esta nota fica ligada a este trecho')
    expect(reader).toContain('saveSectionNote')
    expect(reader).toContain('getSectionNote')
    expect(reader).not.toContain('Voltar ao trecho')
  })

  it('makes saved study material include notes without adding a new primary destination', () => {
    expect(favorites).toContain('Notas de estudo')
    expect(favorites).toContain('Trechos, notas e reflexões')
  })

  it('shows learning context instead of streak or ranking language', () => {
    expect(evolution).toContain('Seu estudo em contexto')
    expect(evolution).toContain('Últimas 4 semanas')
    expect(evolution).toContain('dias de estudo')
    expect(evolution).toContain('tempo dedicado')
    expect(evolution).toContain('notas de estudo')
    expect(evolution).toContain('reflexões guardadas')
    expect(evolution).not.toContain('streak')
    expect(evolution).not.toContain('ranking')
    expect(progress).toContain(".from('reading_sessions')")
  })

  it('protects journal rows with owner-only RLS', () => {
    expect(migration).toContain('alter table public.study_journal_entries enable row level security')
    expect(migration).toContain('auth.uid() = user_id')
    expect(migration).toContain("entry_type in ('reflection', 'note')")
    expect(migration).toContain('unique (user_id, entry_key)')
  })
})
