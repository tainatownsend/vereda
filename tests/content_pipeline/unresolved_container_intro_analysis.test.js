import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const analysis = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-container-intro-unresolved-analysis.json',
    'utf8',
  ),
)
const queue = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-container-intro-resolution-queue.json',
    'utf8',
  ),
)

describe('unresolved container-intro analysis', () => {
  it('analyzes all 14 unresolved outcomes', () => {
    expect(
      analysis.items,
    ).toHaveLength(14)
    expect(analysis.totals).toMatchObject({
      unresolved_count: 14,
      reviewed_count_preserved: 4,
      pending_count_preserved: 126,
      public_decision_count_preserved: 18,
      completed_packet_count_preserved: 4,
      pending_packet_count_preserved: 12,
      resolution_lane_count: 3,
      resolution_batch_count: 5,
      source_file_read_count: 0,
      source_text_read_count: 0,
      review_decision_change_count: 0,
      database_change_count: 0,
    })
  })

  it('classifies the three known unresolved causes', () => {
    expect(
      analysis.reason_counts,
    ).toEqual({
      'current-title-window-not-found': 3,
      'selected-page-has-contents-signals': 1,
      'successor-title-not-found': 10,
    })

    expect(
      analysis.lane_counts,
    ).toEqual({
      'current-title-window-recovery': 3,
      'non-contents-occurrence-recovery': 1,
      'successor-anchor-recovery': 10,
    })
  })

  it('keeps every original decision unresolved', () => {
    for (const item of analysis.items) {
      expect(
        item.original_review_status,
      ).toBe('unresolved')
      expect(
        item.original_selected_decision,
      ).toBe('unresolved')
      expect(
        item.decision_change_allowed,
      ).toBe(false)
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
    }
  })

  it('creates five complete resolution batches', () => {
    expect(queue.batches).toHaveLength(5)
    expect(queue.item_count).toBe(14)

    const decisionIds =
      queue.batches.flatMap(
        (batch) =>
          batch.decision_ids,
      )

    expect(decisionIds).toHaveLength(14)
    expect(
      new Set(decisionIds).size,
    ).toBe(14)

    for (const batch of queue.batches) {
      expect(batch.item_count).toBeGreaterThan(0)
      expect(batch.status).toBe(
        'analysis-ready-not-resolved',
      )
      expect(batch.source_files_read).toBe(false)
      expect(batch.decisions_changed).toBe(false)
      expect(
        batch.database_change_applied,
      ).toBe(false)
    }
  })

  it('preserves the complete non-application boundary', () => {
    const boundary =
      analysis.analysis_boundary

    expect(
      boundary.analysis_generated,
    ).toBe(true)
    expect(
      boundary.resolution_batches_generated,
    ).toBe(true)

    for (const [field, value] of Object.entries(
      boundary,
    )) {
      if (
        ![
          'analysis_generated',
          'resolution_batches_generated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
