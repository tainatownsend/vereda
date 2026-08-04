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
    'content/migration/reading-segment-source-review-container-intro-decisions.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('remaining container-intro review', () => {
  it('records outcomes for all 16 target items', () => {
    expect(
      decisions.decisions,
    ).toHaveLength(16)
    expect(
      decisions.packet_results,
    ).toHaveLength(3)
    expect(
      decisions.totals.reviewed_count +
        decisions.totals.unresolved_count,
    ).toBe(16)
  })

  it('uses conservative structured outcomes', () => {
    for (
      const decision of
      decisions.decisions
    ) {
      expect(
        decision.inspection_lane,
      ).toBe('container-intro-only')
      expect(
        decision.boundary_decision_recorded,
      ).toBe(true)
      expect(
        decision.boundary_approved,
      ).toBe(false)
      expect(
        decision.database_change_applied,
      ).toBe(false)

      if (
        decision.review_status ===
        'reviewed'
      ) {
        expect([
          'exclude-structural-heading',
          'retain-intro-segment',
        ]).toContain(
          decision.selected_decision,
        )
        expect(
          decision.evidence
            .successor_title_found,
        ).toBe(true)
      } else {
        expect(
          decision.review_status,
        ).toBe('unresolved')
        expect(
          decision.selected_decision,
        ).toBe('unresolved')
        expect(
          decision.reviewer_confidence,
        ).toBe('low')
      }
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

  it('updates cumulative progress without application', () => {
    expect(
      progress.totals,
    ).toMatchObject({
      item_count: 144,
      packet_count: 16,

      completed_mechanical_count: 166,
      remaining_boundary_review_count: 646,
      database_change_count: 0,
    })
    expect(
      progress.totals.pending_count,
    ).toBeLessThanOrEqual(126)
    expect(
      progress.totals.public_decision_count,
    ).toBeGreaterThanOrEqual(18)
    expect(
      progress.totals.completed_packet_count,
    ).toBeGreaterThanOrEqual(4)
    expect(
      progress.totals.pending_packet_count,
    ).toBeLessThanOrEqual(12)

    expect(
      progress.totals.reviewed_count +
        progress.totals.unresolved_count,
    ).toBeGreaterThanOrEqual(18)

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
