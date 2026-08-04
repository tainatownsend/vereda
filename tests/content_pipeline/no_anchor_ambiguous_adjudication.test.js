import {
  readFileSync,
} from 'node:fs'
import {
  describe,
  expect,
  test,
} from 'vitest'

const readJson = (path) =>
  JSON.parse(
    readFileSync(
      path,
      'utf8',
    ),
  )

describe(
  'no-anchor ambiguous adjudication',
  () => {
    const decisions = readJson(
      'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
    )
    const plan = readJson(
      'content/migration/reading-segment-no-anchor-ambiguous-integration-plan.json',
    )
    const progress = readJson(
      'content/migration/reading-segment-source-review-progress.json',
    )

    test(
      'records all 25 structured decisions',
      () => {
        expect(
          decisions.totals,
        ).toMatchObject({
          item_count: 25,
          resolved_count: 16,
          unresolved_count: 9,
          confirm_successor_start_count:
            10,
          adjust_successor_start_count:
            6,
          merge_with_successor_count:
            0,
          candidate_override_count: 8,
          high_confidence_count: 10,
          medium_confidence_count: 6,
          low_confidence_count: 9,
          manual_review_completed_count:
            25,
          review_decision_count: 25,
          prepared_lane_preserved_count:
            63,
          cumulative_progress_change_count:
            0,
          boundary_approved_count: 0,
          database_change_count: 0,
        })

        expect(
          decisions.decisions,
        ).toHaveLength(25)
      },
    )

    test(
      'keeps unresolved decisions candidate-free',
      () => {
        const unresolved =
          decisions.decisions.filter(
            (decision) =>
              decision.selected_outcome ===
              'unresolved',
          )

        expect(
          unresolved,
        ).toHaveLength(9)

        for (
          const decision of
          unresolved
        ) {
          expect(
            decision.selected_candidate_index,
          ).toBeNull()
          expect(
            decision.selected_pair,
          ).toBeNull()
          expect(
            decision.reviewer_confidence,
          ).toBe('low')
        }
      },
    )

    test(
      'preserves cumulative progress and defers integration',
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
        })

        expect(
          plan.projected_state,
        ).toEqual({
          reviewed_count: 70,
          unresolved_count: 11,
          pending_count: 63,
          public_decision_count: 81,
          completed_packet_count: 8,
          pending_packet_count: 8,
        })

        expect(
          plan.integration_boundary
            .progress_update_applied,
        ).toBe(false)
      },
    )

    test(
      'keeps every application boundary closed',
      () => {
        for (const [
          field,
          value,
        ] of Object.entries(
          decisions.adjudication_boundary,
        )) {
          if (
            [
              'private_review_packet_read',
              'manual_review_completed',
              'structured_decisions_recorded',
            ].includes(field)
          ) {
            expect(value).toBe(true)
          } else {
            expect(value).toBe(false)
          }
        }
      },
    )
  },
)
