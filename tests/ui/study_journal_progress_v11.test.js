import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const reflection = readFileSync('src/pages/ReflectionPage.jsx', 'utf8')
const reader = readFileSync('src/pages/ReaderPage.jsx', 'utf8')
const favorites = readFileSync('src/pages/FavoritesPage.jsx', 'utf8')
const evolution = readFileSync('src/pages/EvolutionPage.jsx', 'utf8')
const journal = readFileSync('src/features/studyJournal/studyJournal.js', 'utf8')
const progress = readFileSync('src/features/studyProgress/studyProgress.js', 'utf8')
const appliedSchema = readFileSync('supabase/staging/study_journal_foundation.applied.sql', 'utf8')

describe('Vereda 1.1 personal study journal', () => {
  it('supports account sync with local resilience after the database gate', () => {
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

  it('shows learning context with explicitly gentle language', () => {
    expect(evolution).toContain('Seu estudo em contexto')
    expect(evolution).toContain('Últimas 4 semanas')
    expect(evolution).toContain('dias de estudo')
    expect(evolution).toContain('tempo dedicado')
    expect(evolution).toContain('notas de estudo')
    expect(evolution).toContain('reflexões guardadas')
    expect(evolution).toContain('Sem ranking e sem sequência para manter')
    expect(evolution).not.toContain('streak')
    expect(progress).toContain(".from('reading_sessions')")
  })

  it('records the applied owner-only RLS schema outside the guarded migration manifest', () => {
    expect(appliedSchema).toContain('APPLIED TO PRODUCTION')
    expect(appliedSchema).toContain('20260908042626 study_journal_foundation')
    expect(appliedSchema).toContain('20260908042732 study_journal_privilege_hardening')
    expect(appliedSchema).toContain('20260908042944 study_journal_performance_hardening')
    expect(appliedSchema).toContain('alter table public.study_journal_entries enable row level security')
    expect(appliedSchema).toContain('(select auth.uid()) = user_id')
    expect(appliedSchema).toContain("entry_type in ('reflection', 'note')")
    expect(appliedSchema).toContain('unique (user_id, entry_key)')
    expect(appliedSchema).toContain('grant select, insert, update, delete on table public.study_journal_entries to authenticated')
    expect(appliedSchema).not.toContain('PENDING APPLICATION')
  })
})
