import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-inspection-manifest.json',
    'utf8',
  ),
)
const packets = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-inspection-packets.json',
    'utf8',
  ),
)
const pageIndex = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-inspection-page-index.json',
    'utf8',
  ),
)

describe('source-inspection review packets', () => {
  it('represents all 144 source-inspection cases', () => {
    expect(
      manifest.totals.source_inspection_count,
    ).toBe(144)
    expect(manifest.items).toHaveLength(144)
    expect(packets.item_count).toBe(144)
    expect(pageIndex.item_count).toBe(144)
  })

  it('preserves completed and remaining staging workloads', () => {
    expect(manifest.totals).toMatchObject({
      completed_mechanical_count: 166,
      remaining_boundary_review_count: 646,
      structural_review_count: 85,
      size_review_count: 10,
      source_text_reviewed_count: 0,
      boundary_decision_count: 0,
      database_change_count: 0,
    })
  })

  it('keeps every item content-free and unreviewed', () => {
    for (const item of manifest.items) {
      expect(item.source_text_reviewed).toBe(false)
      expect(
        item.boundary_decision_recorded,
      ).toBe(false)
      expect(item.boundary_approved).toBe(false)
      expect(
        item.database_change_applied,
      ).toBe(false)
      expect(item.content_loaded).toBe(false)
      expect(item.cutover_enabled).toBe(false)
      expect(
        item.context_invariants
          .source_text_included,
      ).toBe(false)
    }
  })

  it('includes adjacent canonical context', () => {
    for (const item of manifest.items) {
      expect(
        item.context.current.segment_key,
      ).toBe(item.segment_key)

      if (item.context.previous) {
        expect(
          item.context.previous.segment_order,
        ).toBe(item.segment_order - 1)
      }

      if (item.context.successor) {
        expect(
          item.context.successor.segment_order,
        ).toBe(item.segment_order + 1)
      }
    }
  })

  it('creates packets capped at 20 items', () => {
    for (const packet of packets.packets) {
      expect(packet.item_count).toBeGreaterThan(0)
      expect(packet.item_count).toBeLessThanOrEqual(
        20,
      )
      expect(packet.items).toHaveLength(
        packet.item_count,
      )
    }
  })

  it('keeps every review boundary disabled', () => {
    const boundary =
      manifest.review_boundary

    expect(boundary.packets_generated).toBe(true)

    for (const [field, value] of Object.entries(
      boundary,
    )) {
      if (field !== 'packets_generated') {
        expect(value).toBe(false)
      }
    }
  })
})
