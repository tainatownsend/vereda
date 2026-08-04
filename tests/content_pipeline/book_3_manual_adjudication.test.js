import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const decisions = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-book-3-manual-adjudication-decisions.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('Book 3 manual adjudication', () => {
  it('records exactly two reviewed outcomes', () => {
    expect(
      decisions.decisions,
    ).toHaveLength(2)
    expect(
      decisions.totals,
    ).toMatchObject({
      item_count: 2,
      reviewed_count: 2,
      unresolved_count: 0,
      exclude_structural_heading_count: 2,
      retain_intro_segment_count: 0,
      high_confidence_count: 2,
      manual_review_completed_count: 2,
      new_public_decision_identity_count: 0,
      boundary_approved_count: 0,
      database_change_count: 0,
    })
  })

  it('records defensible same-page heading boundaries', () => {
    for (
      const decision of
      decisions.decisions
    ) {
      const evidence =
        decision.evidence

      expect(
        decision.review_status,
      ).toBe('reviewed')
      expect(
        decision.selected_decision,
      ).toBe(
        'exclude-structural-heading',
      )
      expect(
        decision.reviewer_confidence,
      ).toBe('high')
      expect(
        decision.manual_review_completed,
      ).toBe(true)
      expect(
        evidence
          .current_title_is_structural_heading,
      ).toBe(true)
      expect(
        evidence
          .expected_successor_is_present,
      ).toBe(true)
      expect(
        evidence
          .independent_prose_exists_between,
      ).toBe(false)
      expect(
        evidence
          .source_boundary_is_defensible,
      ).toBe(true)
      expect(
        evidence
          .source_pdf_page_reviewed,
      ).toBe(
        evidence
          .successor_source_pdf_page_reviewed,
      )
    }
  })

  it('keeps public evidence content-free', () => {
    expect(
      decisions.contains_full_text,
    ).toBe(false)
    expect(
      decisions.contains_source_excerpt,
    ).toBe(false)

    for (
      const decision of
      decisions.decisions
    ) {
      expect(
        decision.source_text_included,
      ).toBe(false)
      expect(
        decision.source_excerpt_included,
      ).toBe(false)
      expect(
        decision.database_change_applied,
      ).toBe(false)
      expect(
        decision.cutover_enabled,
      ).toBe(false)
    }
  })

  it('updates cumulative manual-review progress', () => {
    expect(progress.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      pending_count: 126,
      reviewed_count: 13,
      unresolved_count: 5,
      public_decision_count: 18,
      manual_adjudication_item_count: 7,
      manual_adjudication_batch_count: 4,
      manual_adjudication_packet_prepared_count: 1,
      manual_adjudication_item_prepared_count: 2,
      manual_adjudication_reviewed_count: 2,
      manual_adjudication_resolved_count: 2,
      manual_adjudication_still_unresolved_count: 0,
      manual_adjudication_remaining_count: 5,
      manual_adjudication_completed_batch_count: 1,
      manual_adjudication_pending_batch_count: 3,
      database_change_count: 0,
    })

    expect(
      progress.totals.reviewed_count +
        progress.totals.unresolved_count,
    ).toBe(18)
  })

  it('preserves the complete non-application boundary', () => {
    const boundary =
      decisions.adjudication_boundary

    expect(
      boundary
        .private_reviewer_packet_read,
    ).toBe(true)
    expect(
      boundary.manual_review_completed,
    ).toBe(true)
    expect(
      boundary
        .structured_decisions_recorded,
    ).toBe(true)

    for (const [
      field,
      value,
    ] of Object.entries(
      boundary,
    )) {
      if (
        ![
          'private_reviewer_packet_read',
          'manual_review_completed',
          'structured_decisions_recorded',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
