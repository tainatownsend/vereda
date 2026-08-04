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
    'content/migration/reading-segment-same-page-review-corpus.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)
const audit = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-pending-source-review-audit.json',
    'utf8',
  ),
)

describe('same-page review corpus', () => {
  it('prepares all 38 audited same-page items', () => {
    expect(
      corpus.items,
    ).toHaveLength(38)
    expect(
      corpus.totals,
    ).toMatchObject({
      packet_count: 4,
      item_count: 38,
      manual_review_completed_count: 0,
      review_decision_count: 0,
      boundary_approved_count: 0,
      database_change_count: 0,
    })
    expect(
      corpus.totals
        .evidence_prepared_count +
        corpus.totals
          .evidence_ambiguous_count +
        corpus.totals
          .evidence_incomplete_count,
    ).toBe(38)
  })

  it('preserves the exact packet and book distribution', () => {
    expect(
      corpus.counts_by_book,
    ).toEqual({
      1: 23,
      4: 5,
      5: 10,
    })
    expect(
      corpus.counts_by_packet,
    ).toEqual({
      'container-intro-same-page-book-1-packet-01':
        20,
      'container-intro-same-page-book-1-packet-02':
        3,
      'container-intro-same-page-book-4-packet-01':
        5,
      'container-intro-same-page-book-5-packet-01':
        10,
    })
  })

  it('records only evidence-preparation states', () => {
    for (
      const item of
      corpus.items
    ) {
      expect([
        'evidence-prepared-not-reviewed',
        'evidence-ambiguous-not-reviewed',
        'evidence-incomplete-not-reviewed',
      ]).toContain(
        item.corpus_status,
      )
      expect(
        item.manual_review_required,
      ).toBe(true)
      expect(
        item.manual_review_completed,
      ).toBe(false)
      expect(
        item.selected_decision,
      ).toBeNull()
      expect(
        item.reviewer_confidence,
      ).toBeNull()
      expect(
        item.source_text_included,
      ).toBe(false)
      expect(
        item.source_excerpt_included,
      ).toBe(false)
      expect(
        item.database_change_applied,
      ).toBe(false)
      expect(
        item.cutover_enabled,
      ).toBe(false)

      if (
        item.corpus_status ===
        'evidence-incomplete-not-reviewed'
      ) {
        expect(
          item.selected_pair,
        ).toBeNull()
      } else {
        expect(
          item.selected_pair
            .current_precedes_successor,
        ).toBe(true)
        expect(
          item.selected_pair
            .source_pdf_page,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the PR-0038 progress state unchanged', () => {
    expect([
      'remaining-manual-adjudication-recorded-not-applied',
      'same-page-review-integrated-not-applied',
    ]).toContain(progress.status)
    expect(
      progress.totals,
    ).toMatchObject({
      manual_adjudication_reviewed_count:
        7,
      manual_adjudication_resolved_count:
        5,
      manual_adjudication_still_unresolved_count:
        2,
      manual_adjudication_completed_batch_count:
        4,
      manual_adjudication_pending_batch_count:
        0,
      database_change_count: 0,
    })
    expect(
      progress.totals.reviewed_count,
    ).toBeGreaterThanOrEqual(16)
    expect(
      progress.totals.unresolved_count,
    ).toBeLessThanOrEqual(2)
    expect(
      progress.totals.pending_count,
    ).toBeLessThanOrEqual(126)
    expect(
      progress.totals
        .public_decision_count,
    ).toBeGreaterThanOrEqual(18)
    expect(
      audit.totals,
    ).toMatchObject({
      container_intro_same_page_count:
        38,
      same_page_no_semantic_anchor_count:
        88,
      database_change_count: 0,
    })
  })

  it('preserves the complete preparation boundary', () => {
    const boundary =
      corpus.preparation_boundary

    expect(
      boundary
        .canonical_sources_read_locally,
    ).toBe(true)
    expect(
      boundary
        .private_evidence_generated,
    ).toBe(true)
    expect(
      boundary
        .public_corpus_generated,
    ).toBe(true)

    for (const [
      field,
      value,
    ] of Object.entries(
      boundary,
    )) {
      if (
        ![
          'canonical_sources_read_locally',
          'private_evidence_generated',
          'public_corpus_generated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
