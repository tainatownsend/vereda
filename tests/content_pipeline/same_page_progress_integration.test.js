import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)
const evidence = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-same-page-progress-integration-evidence.json',
    'utf8',
  ),
)

describe('same-page progress integration', () => {
  it('integrates the complete 38-item decision set', () => {
    expect(
      progress.status,
    ).toBe(
      'same-page-review-integrated-not-applied',
    )
    expect(
      progress.totals,
    ).toMatchObject({
      item_count: 144,
      packet_count: 16,
      reviewed_count: 54,
      unresolved_count: 2,
      pending_count: 88,
      public_decision_count: 56,
      completed_packet_count: 8,
      pending_packet_count: 8,
      same_page_review_item_count: 38,
      same_page_review_reviewed_count:
        38,
      same_page_review_unresolved_count:
        0,
      same_page_review_excluded_count:
        38,
      same_page_review_completed_packet_count:
        4,
      database_change_count: 0,
    })
  })

  it('updates exactly four same-page packets', () => {
    const targetIds = new Set([
      'container-intro-same-page-book-1-packet-01',
      'container-intro-same-page-book-1-packet-02',
      'container-intro-same-page-book-4-packet-01',
      'container-intro-same-page-book-5-packet-01',
    ])
    const packets =
      progress.packets.filter(
        (packet) =>
          targetIds.has(
            packet.packet_id,
          ),
      )

    expect(packets).toHaveLength(4)
    expect(
      packets.reduce(
        (sum, packet) =>
          sum + packet.item_count,
        0,
      ),
    ).toBe(38)

    for (const packet of packets) {
      expect(packet).toMatchObject({
        pending_count: 0,
        in_review_count: 0,
        unresolved_count: 0,
        status: 'reviewed-not-applied',
      })
      expect(
        packet.reviewed_count,
      ).toBe(packet.item_count)
    }
  })

  it('preserves all 88 no-anchor items as pending', () => {
    const packets =
      progress.packets.filter(
        (packet) =>
          packet.inspection_lane ===
          'same-page-no-semantic-anchor',
      )

    expect(packets).toHaveLength(8)
    expect(
      packets.reduce(
        (sum, packet) =>
          sum + packet.pending_count,
        0,
      ),
    ).toBe(88)

    for (const packet of packets) {
      expect(packet).toMatchObject({
        reviewed_count: 0,
        unresolved_count: 0,
        in_review_count: 0,
        status: 'pending',
      })
    }
  })

  it('keeps cumulative totals balanced', () => {
    expect(
      progress.totals.pending_count +
        progress.totals.reviewed_count +
        progress.totals
          .unresolved_count,
    ).toBe(
      progress.totals.item_count,
    )
    expect(
      progress.totals
        .public_decision_count,
    ).toBe(
      progress.totals.reviewed_count +
        progress.totals
          .unresolved_count,
    )
    expect(
      progress.totals
        .completed_packet_count +
        progress.totals
          .pending_packet_count,
    ).toBe(
      progress.totals.packet_count,
    )
  })

  it('preserves the complete non-application boundary', () => {
    const boundary =
      evidence.integration_boundary

    expect(
      boundary
        .validated_decisions_integrated,
    ).toBe(true)
    expect(
      boundary
        .cumulative_progress_modified,
    ).toBe(true)
    expect(
      boundary
        .packet_progress_modified,
    ).toBe(true)

    for (const [
      field,
      value,
    ] of Object.entries(
      boundary,
    )) {
      if (
        ![
          'validated_decisions_integrated',
          'cumulative_progress_modified',
          'packet_progress_modified',
          'historical_validator_compatibility_updated',
          'historical_test_compatibility_updated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
