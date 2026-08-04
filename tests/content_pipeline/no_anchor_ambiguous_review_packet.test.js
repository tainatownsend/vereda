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
    'content/migration/reading-segment-no-anchor-discovery-corpus.json',
    'utf8',
  ),
)
const packet = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe(
  'no-anchor ambiguous review packet',
  () => {
    it(
      'isolates every ambiguous discovery item',
      () => {
        const ambiguous =
          corpus.items.filter(
            (item) =>
              item.corpus_status ===
              'anchor-evidence-ambiguous-not-reviewed',
          )

        expect(ambiguous).toHaveLength(25)
        expect(packet.items).toHaveLength(25)
        expect(
          new Set(
            packet.items.map(
              (item) =>
                item.discovery_item_id,
            ),
          ),
        ).toEqual(
          new Set(
            ambiguous.map(
              (item) =>
                item.discovery_item_id,
            ),
          ),
        )
      },
    )

    it(
      'preserves all prepared items',
      () => {
        expect(
          corpus.items.filter(
            (item) =>
              item.corpus_status ===
              'anchor-evidence-prepared-not-reviewed',
          ),
        ).toHaveLength(63)
        expect(
          packet.totals
            .prepared_lane_preserved_count,
        ).toBe(63)
      },
    )

    it(
      'provides deterministic candidate choices without decisions',
      () => {
        expect(
          packet.totals.item_count,
        ).toBe(25)
        expect(
          packet.totals
            .manual_review_completed_count,
        ).toBe(0)
        expect(
          packet.totals
            .review_decision_count,
        ).toBe(0)

        for (
          const item of
          packet.items
        ) {
          expect(
            item.candidate_count,
          ).toBeGreaterThanOrEqual(2)
          expect(
            item.candidate_count,
          ).toBeLessThanOrEqual(5)
          expect(
            item.candidates,
          ).toHaveLength(
            item.candidate_count,
          )
          expect(
            item.pair_ambiguous,
          ).toBe(true)
          expect(
            item.review_status,
          ).toBe(
            'packet-prepared-not-reviewed',
          )
          expect(
            item.selected_candidate_index,
          ).toBeNull()
          expect(
            item.selected_outcome,
          ).toBeNull()
          expect(
            item.manual_review_completed,
          ).toBe(false)

          item.candidates.forEach(
            (
              candidate,
              index,
            ) => {
              expect(
                candidate
                  .candidate_index,
              ).toBe(index)
              expect(
                candidate
                  .candidate_number,
              ).toBe(index + 1)
              expect(
                candidate
                  .current_precedes_successor,
              ).toBe(true)
            },
          )
        }
      },
    )

    it(
      'covers every item in exactly one review batch',
      () => {
        const ids =
          packet.review_batches
            .flatMap(
              (batch) =>
                batch
                  .review_packet_item_ids,
            )

        expect(ids).toHaveLength(25)
        expect(
          new Set(ids).size,
        ).toBe(25)
        expect(
          new Set(ids),
        ).toEqual(
          new Set(
            packet.items.map(
              (item) =>
                item
                  .review_packet_item_id,
            ),
          ),
        )
      },
    )

    it(
      'preserves cumulative progress and the non-application boundary',
      () => {
        expect(
          progress.totals,
        ).toMatchObject({
          reviewed_count: 54,
          unresolved_count: 2,
          pending_count: 88,
          public_decision_count: 56,
          completed_packet_count: 8,
          pending_packet_count: 8,
          database_change_count: 0,
        })

        expect(
          packet.preparation_boundary,
        ).toMatchObject({
          private_discovery_evidence_read:
            true,
          ambiguous_items_isolated:
            true,
          private_review_packet_generated:
            true,
          public_review_packet_generated:
            true,
          prepared_items_modified:
            false,
          manual_review_completed:
            false,
          review_decisions_recorded:
            false,
          cumulative_progress_modified:
            false,
          historical_artifacts_modified:
            false,
          source_text_committed:
            false,
          source_excerpt_committed:
            false,
          boundary_approved:
            false,
          sql_generated:
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
