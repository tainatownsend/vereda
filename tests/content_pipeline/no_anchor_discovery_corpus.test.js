import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const corpus = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-no-anchor-discovery-corpus.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('no-anchor discovery corpus', () => {
  it('prepares exactly 88 evidence-only items', () => {
    expect(corpus.items).toHaveLength(88)
    expect(corpus.totals).toMatchObject({
      packet_count: 8,
      item_count: 88,
      manual_review_completed_count: 0,
      review_decision_count: 0,
      cumulative_progress_change_count: 0,
      boundary_approved_count: 0,
      database_change_count: 0,
    })
    expect(
      corpus.totals.evidence_prepared_count +
        corpus.totals.evidence_ambiguous_count +
        corpus.totals.evidence_incomplete_count,
    ).toBe(88)
  })

  it('preserves the exact book and packet distribution', () => {
    expect(corpus.counts_by_book).toEqual({
      1: 6,
      2: 70,
      3: 1,
      4: 1,
      5: 10,
    })
    expect(corpus.counts_by_packet).toEqual({
      'same-page-no-semantic-anchor-book-1-packet-01': 6,
      'same-page-no-semantic-anchor-book-2-packet-01': 20,
      'same-page-no-semantic-anchor-book-2-packet-02': 20,
      'same-page-no-semantic-anchor-book-2-packet-03': 20,
      'same-page-no-semantic-anchor-book-2-packet-04': 10,
      'same-page-no-semantic-anchor-book-3-packet-01': 1,
      'same-page-no-semantic-anchor-book-4-packet-01': 1,
      'same-page-no-semantic-anchor-book-5-packet-01': 10,
    })
  })

  it('records candidates but no editorial decisions', () => {
    for (const item of corpus.items) {
      expect([
        'anchor-evidence-prepared-not-reviewed',
        'anchor-evidence-ambiguous-not-reviewed',
        'anchor-evidence-incomplete-not-reviewed',
      ]).toContain(item.corpus_status)
      expect(item.manual_review_required).toBe(true)
      expect(item.manual_review_completed).toBe(false)
      expect(item.selected_decision).toBeNull()
      expect(item.reviewer_confidence).toBeNull()
      expect(item.boundary_decision_recorded).toBe(false)
      expect(item.source_text_included).toBe(false)
      expect(item.source_excerpt_included).toBe(false)
      expect(item.database_change_applied).toBe(false)
    }
  })

  it('preserves the PR-0041 cumulative state', () => {
    expect(progress.status).toBe(
      'same-page-review-integrated-not-applied',
    )
    expect(progress.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      reviewed_count: 54,
      unresolved_count: 2,
      pending_count: 88,
      public_decision_count: 56,
      completed_packet_count: 8,
      pending_packet_count: 8,
      database_change_count: 0,
    })
  })

  it('preserves the complete non-application boundary', () => {
    const boundary = corpus.preparation_boundary

    expect(boundary.canonical_sources_read_locally).toBe(true)
    expect(boundary.semantic_anchor_candidates_generated).toBe(true)
    expect(boundary.private_evidence_generated).toBe(true)
    expect(boundary.public_corpus_generated).toBe(true)

    for (const [field, value] of Object.entries(boundary)) {
      if (
        ![
          'canonical_sources_read_locally',
          'semantic_anchor_candidates_generated',
          'private_evidence_generated',
          'public_corpus_generated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
