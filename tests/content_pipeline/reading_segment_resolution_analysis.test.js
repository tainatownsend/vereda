import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const analysis = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-resolution-analysis.json',
    'utf8',
  ),
)
const mechanical = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-candidates.json',
    'utf8',
  ),
)
const sourceInspection = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-inspection-queue.json',
    'utf8',
  ),
)
const structural = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-structural-review-queue.json',
    'utf8',
  ),
)
const size = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-size-review-queue.json',
    'utf8',
  ),
)
const batches = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-resolution-batches.json',
    'utf8',
  ),
)

describe('reading-segment resolution analysis', () => {
  it('partitions all 405 active items', () => {
    expect(
      mechanical.item_count +
        sourceInspection.item_count +
        structural.item_count +
        size.item_count,
    ).toBe(405)

    expect(
      analysis.totals.active_item_count,
    ).toBe(405)
  })

  it('keeps mechanical candidates unapproved', () => {
    for (const item of mechanical.items) {
      expect(item.boundary_approved).toBe(false)
      expect(item.content_approved).toBe(false)
      expect(
        item.database_change_applied,
      ).toBe(false)
      expect(
        item.current_anchor_evidence.available,
      ).toBe(true)
      expect(
        item.successor_anchor_evidence.available,
      ).toBe(true)
      expect(
        item.current_anchor_evidence.signature,
      ).not.toBe(
        item.successor_anchor_evidence.signature,
      )
    }
  })

  it('keeps structural decisions separate', () => {
    for (const item of structural.items) {
      expect(
        item.review_reasons.some((reason) =>
          [
            'split-required-by-reconstruction-plan',
            'manual-reconstruction-review',
          ].includes(reason),
        ),
      ).toBe(true)
    }
  })

  it('keeps size-only cases in size review', () => {
    for (const item of size.items) {
      expect(item.review_reasons).toContain(
        'legacy-word-count-oversized',
      )
      expect(item.resolution_path).toBe(
        'delivery-size-review-required',
      )
    }
  })

  it('creates batches capped at 25 items', () => {
    expect(batches.item_count).toBe(405)

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

  it('keeps all application boundaries disabled', () => {
    for (const value of Object.values(
      analysis.application_boundary,
    )) {
      expect(value).toBe(false)
    }
  })
})
