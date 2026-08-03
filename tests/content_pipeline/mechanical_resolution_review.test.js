import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const decisions = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-review-decisions.json',
    'utf8',
  ),
)
const accepted = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-review-accepted.json',
    'utf8',
  ),
)
const exceptions = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-review-exceptions.json',
    'utf8',
  ),
)
const batches = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-review-batches.json',
    'utf8',
  ),
)

describe('mechanical resolution independent review', () => {
  it('reviews all 166 proposals', () => {
    expect(
      decisions.totals.reviewed_count,
    ).toBe(166)
    expect(decisions.decisions).toHaveLength(
      166,
    )
  })

  it('accepts every deterministic proposal without applying it', () => {
    expect(
      decisions.totals.accepted_count,
    ).toBe(166)
    expect(accepted.item_count).toBe(166)
    expect(exceptions.item_count).toBe(0)

    for (const decision of accepted.items) {
      expect(decision.decision).toBe(
        'accepted-for-future-application',
      )
      expect(
        decision.database_application_authorized,
      ).toBe(false)
      expect(
        decision.database_change_applied,
      ).toBe(false)
      expect(
        decision.content_approved,
      ).toBe(false)
      expect(
        decision.cutover_enabled,
      ).toBe(false)
    }
  })

  it('requires every independent check to pass', () => {
    for (const decision of decisions.decisions) {
      expect(
        Object.values(
          decision.checks,
        ).every(
          (value) => value === true,
        ),
      ).toBe(true)
    }
  })

  it('creates decision batches capped at 25', () => {
    expect(batches.decision_count).toBe(166)

    for (const batch of batches.batches) {
      expect(batch.item_count).toBeGreaterThan(0)
      expect(batch.item_count).toBeLessThanOrEqual(
        25,
      )
      expect(batch.decision_ids).toHaveLength(
        batch.item_count,
      )
    }
  })

  it('keeps database and publication boundaries disabled', () => {
    const boundary =
      decisions.application_boundary

    expect(
      boundary.decision_package_generated,
    ).toBe(true)

    for (const [field, value] of Object.entries(
      boundary,
    )) {
      if (
        field !==
        'decision_package_generated'
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
