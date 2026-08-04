import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const packet = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-book-3-manual-adjudication-packet.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('Book 3 manual-adjudication packet', () => {
  it('prepares exactly two unresolved items', () => {
    expect(
      packet.packet_items,
    ).toHaveLength(2)
    expect(
      packet.totals.packet_item_count,
    ).toBe(2)

    for (
      const item of
      packet.packet_items
    ) {
      expect(
        item.packet_status,
      ).toBe(
        'packet-prepared-not-reviewed',
      )
      expect(
        item.selected_decision,
      ).toBe('unresolved')
      expect(
        item.manual_review_required,
      ).toBe(true)
      expect(
        item.manual_review_completed,
      ).toBe(false)
    }
  })

  it('includes bounded public candidate metadata without source text', () => {
    expect(
      packet.contains_full_text,
    ).toBe(false)
    expect(
      packet.contains_source_excerpt,
    ).toBe(false)

    for (
      const item of
      packet.packet_items
    ) {
      expect(
        item.current_title_candidate_count,
      ).toBeGreaterThan(0)
      expect(
        item.current_title_candidates,
      ).toHaveLength(
        item.current_title_candidate_count,
      )
      expect(
        item.successor_candidates,
      ).toHaveLength(
        item.successor_candidate_count,
      )
      expect(
        item.source_text_included,
      ).toBe(false)
      expect(
        item.source_excerpt_included,
      ).toBe(false)
    }
  })

  it('preserves cumulative review counts', () => {
    expect(progress.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      pending_count: 126,
      reviewed_count: 11,
      unresolved_count: 7,
      public_decision_count: 18,
      manual_adjudication_item_count: 7,
      manual_adjudication_batch_count: 4,
      manual_adjudication_packet_prepared_count: 1,
      manual_adjudication_item_prepared_count: 2,
      manual_adjudication_reviewed_count: 0,
      database_change_count: 0,
    })
  })

  it('preserves the complete non-application boundary', () => {
    const boundary =
      packet.packet_boundary

    expect(
      boundary.local_source_read,
    ).toBe(true)
    expect(
      boundary
        .private_reviewer_packet_generated,
    ).toBe(true)
    expect(
      boundary
        .public_packet_generated,
    ).toBe(true)

    for (const [
      field,
      value,
    ] of Object.entries(
      boundary,
    )) {
      if (
        ![
          'local_source_read',
          'private_reviewer_packet_generated',
          'public_packet_generated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
