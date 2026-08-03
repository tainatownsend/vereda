import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const triage = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-review-triage.json',
    'utf8',
  ),
)
const active = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-active-review-queue.json',
    'utf8',
  ),
)
const deferred = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-deferred-metadata.json',
    'utf8',
  ),
)
const batches = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-review-batches.json',
    'utf8',
  ),
)

describe('reading-segment review triage', () => {
  it('accounts for all 455 review items', () => {
    expect(
      active.item_count + deferred.item_count,
    ).toBe(455)
    expect(
      triage.totals.original_review_count,
    ).toBe(455)
  })

  it('defers only metadata-only diagnostics', () => {
    for (const item of deferred.items) {
      expect(item.review_reasons).toEqual([
        'no-legacy-word-count-estimate',
      ])
      expect(item.disposition).toBe(
        'defer-metadata-only',
      )
      expect(item.boundary_approved).toBe(false)
      expect(item.database_change_applied).toBe(
        false,
      )
    }
  })

  it('keeps structural and boundary concerns active', () => {
    const criticalReasons = new Set([
      'missing-start-locator',
      'split-required-by-reconstruction-plan',
      'manual-reconstruction-review',
      'same-page-successor-boundary',
      'container-intro-boundary',
      'legacy-word-count-oversized',
    ])

    for (const item of active.items) {
      expect(
        item.review_reasons.some((reason) =>
          criticalReasons.has(reason),
        ),
      ).toBe(true)
      expect(item.active_boundary_review).toBe(
        true,
      )
    }
  })

  it('creates capped review batches', () => {
    expect(batches.active_item_count).toBe(
      active.item_count,
    )

    for (const batch of batches.batches) {
      expect(batch.item_count).toBeGreaterThan(0)
      expect(batch.item_count).toBeLessThanOrEqual(
        25,
      )
      expect(batch.segment_keys).toHaveLength(
        batch.item_count,
      )
    }
  })

  it('keeps every application boundary disabled', () => {
    for (const value of Object.values(
      triage.application_boundary,
    )) {
      expect(value).toBe(false)
    }
  })
})
