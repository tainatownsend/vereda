import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const consolidation = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-unresolved-recovery-consolidation.json',
    'utf8',
  ),
)
const queue = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-manual-adjudication-queue.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('unresolved recovery consolidation', () => {
  it('accounts for every recovery attempt exactly once', () => {
    expect(
      consolidation.totals
        .recovery_attempt_count,
    ).toBe(14)
    expect(
      consolidation
        .resolved_recoveries,
    ).toHaveLength(7)
    expect(
      consolidation
        .unresolved_recoveries,
    ).toHaveLength(7)

    const recoveryIds = new Set([
      ...consolidation
        .resolved_recoveries,
      ...consolidation
        .unresolved_recoveries,
    ].map(
      (item) =>
        item.recovery_id,
    ))

    expect(
      recoveryIds.size,
    ).toBe(14)
  })

  it('preserves resolved outcomes without applying them', () => {
    for (
      const item of
      consolidation
        .resolved_recoveries
    ) {
      expect(
        item.final_status,
      ).toBe(
        'resolved-not-applied',
      )
      expect(
        item.selected_decision,
      ).toBe(
        'exclude-structural-heading',
      )
      expect(
        item.supersedes_original_unresolved,
      ).toBe(true)
      expect(
        item.boundary_approved,
      ).toBe(false)
      expect(
        item.database_change_applied,
      ).toBe(false)
      expect(
        item.cutover_enabled,
      ).toBe(false)
    }
  })

  it('routes every remaining case to manual adjudication', () => {
    const allowedLanes = [
      'manual-current-title-adjudication',
      'manual-source-opening-adjudication',
      'manual-successor-anchor-adjudication',
    ]

    for (
      const item of
      consolidation
        .unresolved_recoveries
    ) {
      expect(
        item.final_status,
      ).toBe(
        'manual-adjudication-required',
      )
      expect(
        item.selected_decision,
      ).toBe('unresolved')
      expect(
        allowedLanes,
      ).toContain(
        item
          .manual_adjudication_lane,
      )
      expect(
        item
          .automated_recovery_exhausted,
      ).toBe(true)
      expect(
        item.source_text_included,
      ).toBe(false)
      expect(
        item.database_change_applied,
      ).toBe(false)
    }
  })

  it('creates four batches covering seven unique items', () => {
    expect(
      queue.item_count,
    ).toBe(7)
    expect(
      queue.batches,
    ).toHaveLength(4)

    const decisionIds =
      queue.batches.flatMap(
        (batch) =>
          batch.original_decision_ids,
      )

    expect(
      decisionIds,
    ).toHaveLength(7)
    expect(
      new Set(decisionIds).size,
    ).toBe(7)
  })

  it('preserves cumulative review and application state', () => {
    expect(progress.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      pending_count: 126,
      public_decision_count: 18,
      completed_packet_count: 4,
      pending_packet_count: 12,
      recovery_attempt_count_total: 14,
      recovery_resolved_count_total: 7,
      recovery_still_unresolved_count_total: 7,
      manual_adjudication_item_count: 7,
      manual_adjudication_batch_count: 4,
      database_change_count: 0,
    })

    expect(
      progress.totals.reviewed_count,
    ).toBeGreaterThanOrEqual(11)
    expect(
      progress.totals.unresolved_count,
    ).toBeLessThanOrEqual(7)
    expect(
      progress.totals.reviewed_count +
        progress.totals.unresolved_count,
    ).toBe(18)

    for (const [
      field,
      value,
    ] of Object.entries(
      consolidation
        .consolidation_boundary,
    )) {
      if (
        ![
          'recovery_outcomes_consolidated',
          'manual_batches_generated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
