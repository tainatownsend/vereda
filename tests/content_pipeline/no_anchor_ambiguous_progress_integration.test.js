import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const readJson = (path) =>
  JSON.parse(
    readFileSync(
      path,
      'utf8',
    ),
  )

const historical = readJson(
  'content/migration/reading-segment-source-review-progress.json',
)
const current = readJson(
  'content/migration/reading-segment-source-review-progress-current.json',
)
const evidence = readJson(
  'content/migration/reading-segment-no-anchor-ambiguous-progress-integration-evidence.json',
)

describe(
  'no-anchor ambiguous progress integration',
  () => {
    it(
      'preserves the immutable historical baseline',
      () => {
        expect(
          historical.status,
        ).toBe(
          'same-page-review-integrated-not-applied',
        )
        expect(
          historical.totals,
        ).toMatchObject({
          reviewed_count: 54,
          unresolved_count: 2,
          pending_count: 88,
          public_decision_count: 56,
          completed_packet_count: 8,
          pending_packet_count: 8,
        })
      },
    )

    it(
      'creates the current cumulative state',
      () => {
        expect(
          current.status,
        ).toBe(
          'no-anchor-ambiguous-progress-integrated-not-applied',
        )
        expect(
          current.totals,
        ).toMatchObject({
          item_count: 144,
          packet_count: 16,
          reviewed_count: 70,
          unresolved_count: 11,
          pending_count: 63,
          public_decision_count: 81,
          completed_packet_count: 8,
          pending_packet_count: 8,
          no_anchor_ambiguous_item_count:
            25,
          no_anchor_ambiguous_reviewed_count:
            16,
          no_anchor_ambiguous_unresolved_count:
            9,
          no_anchor_prepared_pending_count:
            63,
        })
      },
    )

    it(
      'keeps current totals and packets balanced',
      () => {
        expect(
          current.totals.pending_count +
            current.totals.reviewed_count +
            current.totals.unresolved_count,
        ).toBe(
          current.totals.item_count,
        )
        expect(
          current.totals
            .public_decision_count,
        ).toBe(
          current.totals.reviewed_count +
            current.totals
              .unresolved_count,
        )

        const packets =
          current.packets.filter(
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
        ).toBe(63)
        expect(
          packets.reduce(
            (sum, packet) =>
              sum + packet.reviewed_count,
            0,
          ),
        ).toBe(16)
        expect(
          packets.reduce(
            (sum, packet) =>
              sum + packet.unresolved_count,
            0,
          ),
        ).toBe(9)
      },
    )

    it(
      'keeps historical and application boundaries closed',
      () => {
        expect(
          evidence.integration_boundary,
        ).toMatchObject({
          validated_decisions_integrated:
            true,
          current_progress_snapshot_created:
            true,
          historical_progress_modified:
            false,
          historical_validators_modified:
            false,
          historical_tests_modified:
            false,
          database_change_applied:
            false,
          production_modified:
            false,
          cutover_enabled:
            false,
        })
      },
    )
  },
)
