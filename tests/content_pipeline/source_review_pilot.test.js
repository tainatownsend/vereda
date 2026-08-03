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
    'content/migration/reading-segment-source-review-pilot-decisions.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('pilot source review', () => {
  it('reviews exactly two structural headings', () => {
    expect(
      decisions.decisions,
    ).toHaveLength(2)
    expect(decisions.totals).toMatchObject({
      packet_item_count: 2,
      reviewed_count: 2,
      unresolved_count: 0,
      excluded_structural_heading_count: 2,
      boundary_approved_count: 0,
      database_change_count: 0,
    })

    for (
      const decision of
      decisions.decisions
    ) {
      expect(
        decision.review_status,
      ).toBe('reviewed')
      expect(
        decision.selected_decision,
      ).toBe(
        'exclude-structural-heading',
      )
      expect(
        decision.evidence
          .visible_prose_presence,
      ).toBe('heading-only')
      expect(
        decision.reviewer_confidence,
      ).toBe('high')
    }
  })

  it('uses actual source openings rather than contents pages', () => {
    const pages =
      decisions.decisions.map(
        (decision) =>
          decision.evidence
            .source_pdf_page_reviewed,
      )

    expect(new Set(pages).size).toBe(2)
    expect(
      Math.min(...pages),
    ).toBeGreaterThan(8)
    expect(
      Math.max(...pages),
    ).toBeGreaterThan(100)

    for (
      const decision of
      decisions.decisions
    ) {
      expect(
        decision.evidence
          .toc_signal_count,
      ).toBe(0)
      expect(
        decision.evidence
          .prose_signal_count,
      ).toBe(0)
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
    }
  })

  it('records progress without applying decisions', () => {
    expect(progress.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      pending_count: 142,
      reviewed_count: 2,
      public_decision_count: 2,
      completed_packet_count: 1,
      pending_packet_count: 15,
      completed_mechanical_count: 166,
      remaining_boundary_review_count: 646,
      database_change_count: 0,
    })

    expect(
      progress.application_boundary
        .structured_decisions_recorded,
    ).toBe(true)

    for (const field of [
      'boundary_approved',
      'database_change_applied',
      'content_approved',
      'content_loaded',
      'successor_mapping_created',
      'dependency_snapshot_captured',
      'production_modified',
      'progress_migrated',
      'reading_sessions_rewritten',
      'cutover_enabled',
    ]) {
      expect(
        progress.application_boundary[
          field
        ],
      ).toBe(false)
    }
  })
})
