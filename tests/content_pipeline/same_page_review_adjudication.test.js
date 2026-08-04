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
    'content/migration/reading-segment-same-page-review-decisions.json',
    'utf8',
  ),
)
const integration = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-same-page-review-integration-plan.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('same-page review adjudication', () => {
  it('records exactly 38 structural-heading exclusions', () => {
    expect(
      decisions.decisions,
    ).toHaveLength(38)
    expect(
      decisions.totals,
    ).toMatchObject({
      item_count: 38,
      reviewed_count: 38,
      unresolved_count: 0,
      exclude_structural_heading_count:
        38,
      retain_intro_segment_count: 0,
      manual_override_count: 4,
      manual_review_completed_count:
        38,
      boundary_approved_count: 0,
      database_change_count: 0,
      cumulative_progress_change_count:
        0,
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
      expect([
        'high',
        'medium',
      ]).toContain(
        decision.reviewer_confidence,
      )
      expect(
        decision.evidence
          .current_precedes_successor,
      ).toBe(true)
      expect(
        decision.evidence
          .independent_prose_exists_between,
      ).toBe(false)
      expect(
        decision.evidence
          .source_boundary_is_defensible,
      ).toBe(true)
      expect(
        decision.source_text_included,
      ).toBe(false)
      expect(
        decision.source_excerpt_included,
      ).toBe(false)
      expect(
        decision.database_change_applied,
      ).toBe(false)
    }
  })

  it('records four explicit private-candidate overrides', () => {
    const overrides =
      decisions.decisions.filter(
        (item) =>
          item.evidence
            .selection_method ===
          'manual-private-candidate-override',
      )

    expect(overrides).toHaveLength(4)
    expect(
      new Set(
        overrides.map(
          (item) =>
            item.segment_key,
        ),
      ),
    ).toEqual(
      new Set([
        'db8bb3a8b36c8c95b97c00e0',
        '8e9626db621b38dd240f023d',
        'f754887de0b4ba992aa5b65d',
        '6d5e399b0300c55668d17cd6',
      ]),
    )
  })

  it('creates but does not apply the cumulative integration plan', () => {
    expect(
      integration.current_state,
    ).toEqual({
      reviewed_count: 16,
      unresolved_count: 2,
      pending_count: 126,
      public_decision_count: 18,
      completed_packet_count: 4,
      pending_packet_count: 12,
    })
    expect(
      integration.projected_state,
    ).toEqual({
      reviewed_count: 54,
      unresolved_count: 2,
      pending_count: 88,
      public_decision_count: 56,
      completed_packet_count: 8,
      pending_packet_count: 8,
    })
    expect(
      integration.integration_boundary
        .progress_update_applied,
    ).toBe(false)
  })

  it('preserves or advances cumulative progress monotonically', () => {
    expect(
      progress.totals.database_change_count,
    ).toBe(0)
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
      progress.totals
        .completed_packet_count,
    ).toBeGreaterThanOrEqual(4)
    expect(
      progress.totals
        .pending_packet_count,
    ).toBeLessThanOrEqual(12)
  })

  it('preserves the complete non-application boundary', () => {
    const boundary =
      decisions.adjudication_boundary

    expect(
      boundary.private_corpus_read,
    ).toBe(true)
    expect(
      boundary.manual_review_completed,
    ).toBe(true)
    expect(
      boundary.structured_decisions_recorded,
    ).toBe(true)
    expect(
      boundary.integration_plan_generated,
    ).toBe(true)

    for (const [
      field,
      value,
    ] of Object.entries(
      boundary,
    )) {
      if (
        ![
          'private_corpus_read',
          'manual_review_completed',
          'structured_decisions_recorded',
          'integration_plan_generated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
