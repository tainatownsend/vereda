import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  candidateSimilarity,
  findCandidateMatch,
  normalizeCandidateTitle,
  voteLabel,
} from '@/features/bookRequests/bookCandidates'

const appSource = readFileSync('src/App.jsx', 'utf8')
const pageSource = readFileSync('src/pages/BookRequestsPage.jsx', 'utf8')
const librarySource = readFileSync('src/pages/LibraryPage.jsx', 'utf8')
const settingsSource = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
const landingSource = readFileSync('src/pages/LandingPage.jsx', 'utf8')
const migrationSource = readFileSync(
  'supabase/migrations/20260825062000_book_candidate_voting.sql',
  'utf8',
)
const hardeningMigrationSource = readFileSync(
  'supabase/migrations/20260828052000_book_candidate_backend_hardening.sql',
  'utf8',
)
const submitRpcFixMigrationSource = readFileSync(
  'supabase/migrations/20260828053500_book_candidate_submit_rpc_fix.sql',
  'utf8',
)
const referenceUrlMigrationSource = readFileSync(
  'supabase/migrations/20260830065000_book_candidate_reference_url.sql',
  'utf8',
)

describe('community book request matching', () => {
  it('normalizes accents, punctuation and a leading article', () => {
    expect(normalizeCandidateTitle('  O Livro dos Médiuns! ')).toBe('livro dos mediuns')
    expect(normalizeCandidateTitle('Obras Póstumas')).toBe('obras postumas')
  })

  it('finds exact normalized candidates before allowing a duplicate', () => {
    const candidates = [
      { id: 1, title: 'O Livro dos Médiuns', vote_count: 12 },
      { id: 2, title: 'Obras Póstumas', vote_count: 4 },
    ]

    expect(findCandidateMatch(candidates, 'Livro dos Mediuns')).toMatchObject({
      candidate: { id: 1 },
      exact: true,
    })
  })

  it('finds a close title without treating unrelated titles as matches', () => {
    expect(candidateSimilarity('Obras Postumas', 'Obras Postuma')).toBeGreaterThan(0.78)
    expect(candidateSimilarity('A Genese', 'O Ceu e o Inferno')).toBeLessThan(0.78)
  })

  it('uses plain-language vote counts', () => {
    expect(voteLabel(1)).toBe('1 voto')
    expect(voteLabel(8)).toBe('8 votos')
  })
})

describe('community book request product contract', () => {
  it('routes the authenticated request screen and gives it one natural in-app entry point', () => {
    expect(appSource).toContain('path="/sugerir-obra"')
    expect(appSource).toContain('BookRequestsPage')
    expect(librarySource).toContain("navigate('/sugerir-obra')")
    expect(librarySource).toContain('Sugerir uma obra complementar')
    expect(settingsSource).not.toContain("navigate('/sugerir-obra')")
    expect(settingsSource).not.toContain('Sugerir uma obra')
  })

  it('asks for a vote when an existing candidate is found', () => {
    expect(pageSource).toContain('Esta obra já está na lista.')
    expect(pageSource).toContain('Ela já tem {voteLabel(candidate.vote_count)}.')
    expect(pageSource).toContain('Quero dar meu voto também')
  })

  it('accepts an optional HTTPS reference only after the title is not found', () => {
    expect(pageSource).toContain('Link de referência (opcional)')
    expect(pageSource).toContain('p_reference_url: referenceUrlValidation.value')
    expect(pageSource).toContain('rel="noopener noreferrer nofollow"')
    expect(pageSource).toContain('Ver referência · {hostname}')
  })

  it('makes the community feature visible from the public presentation page', () => {
    expect(landingSource).toContain('Sugerir ou votar em uma obra')
    expect(landingSource).toContain('Criar conta para sugerir uma obra')
  })

  it('enforces one vote per user and exposes counts through safe RPCs', () => {
    expect(migrationSource).toContain('primary key (candidate_id, user_id)')
    expect(migrationSource).toContain('create or replace function public.get_book_candidates()')
    expect(migrationSource).toContain('create or replace function public.submit_book_candidate(')
    expect(migrationSource).toContain('create or replace function public.set_book_candidate_vote(')
    expect(migrationSource).toContain('coalesce(bool_or(bcv.user_id = auth.uid()), false)')
    expect(migrationSource).not.toContain('authenticated users can read book candidates')
  })

  it('keeps RLS checks efficient and indexes the candidate submitter foreign key', () => {
    expect(hardeningMigrationSource).toContain('idx_book_candidates_submitted_by')
    expect(hardeningMigrationSource).toContain('submitted_by = (select auth.uid())')
    expect(hardeningMigrationSource).toContain('user_id = (select auth.uid())')
    expect(hardeningMigrationSource).not.toContain('user_id = auth.uid()')
  })

  it('uses an unambiguous primary-key conflict target when the submit RPC creates the first vote', () => {
    expect(submitRpcFixMigrationSource).toContain(
      'on conflict on constraint book_candidate_votes_pkey do nothing',
    )
    expect(submitRpcFixMigrationSource).not.toContain(
      'on conflict (candidate_id, user_id) do nothing',
    )
    expect(referenceUrlMigrationSource).toContain(
      'on conflict on constraint book_candidate_votes_pkey do nothing',
    )
  })

  it('stores only bounded HTTPS reference metadata and keeps the RPC backwards compatible', () => {
    expect(referenceUrlMigrationSource).toContain('add column if not exists reference_url text')
    expect(referenceUrlMigrationSource).toContain("reference_url ~* '^https://[^[:space:]]+$'")
    expect(referenceUrlMigrationSource).toContain('length(reference_url) <= 2048')
    expect(referenceUrlMigrationSource).toContain('p_reference_url text default null')
    expect(referenceUrlMigrationSource).toContain('bc.reference_url')
    expect(referenceUrlMigrationSource).toContain(
      'grant execute on function public.submit_book_candidate(text, text, text) to authenticated',
    )
  })
})
