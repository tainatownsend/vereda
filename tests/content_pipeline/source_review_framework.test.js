import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const worklist = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-worklist.json',
    'utf8',
  ),
)
const packetRegister = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-packet-register.json',
    'utf8',
  ),
)
const worklistCsv = readFileSync(
  'content/migration/reading-segment-source-review-worklist.csv',
  'utf8',
).replace(/\r\n?/g, '\n')

describe('source-review decision framework', () => {
  it('prepares all 144 records as pending', () => {
    expect(worklist.items).toHaveLength(144)
    expect(worklist.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      pending_count: 144,
      in_review_count: 0,
      reviewed_count: 0,
      unresolved_count: 0,
      public_decision_count: 0,
      source_text_reviewed_count: 0,
      database_change_count: 0,
    })
  })

  it('preserves prior workloads and database state', () => {
    expect(worklist.totals).toMatchObject({
      completed_mechanical_count: 166,
      remaining_boundary_review_count: 646,
      structural_review_count: 85,
      size_review_count: 10,
    })
  })

  it('keeps every public record undecided and content-free', () => {
    for (const item of worklist.items) {
      expect(item.review_status).toBe('pending')
      expect(item.selected_decision).toBeNull()
      expect(item.reviewer_confidence).toBeNull()
      expect(item.review_completed_at).toBeNull()
      expect(item.source_text_included).toBe(false)
      expect(item.source_excerpt_included).toBe(false)
      expect(
        item.boundary_decision_recorded,
      ).toBe(false)
      expect(item.boundary_approved).toBe(false)
      expect(
        item.database_change_applied,
      ).toBe(false)
      expect(item.cutover_enabled).toBe(false)
    }
  })

  it('provides a deterministic packet register', () => {
    expect(
      packetRegister.packets,
    ).toHaveLength(16)
    expect(packetRegister.item_count).toBe(144)

    const decisionIds =
      packetRegister.packets.flatMap(
        (packet) =>
          packet.decision_ids,
      )

    expect(decisionIds).toHaveLength(144)
    expect(
      new Set(decisionIds).size,
    ).toBe(144)

    for (
      const packet of
      packetRegister.packets
    ) {
      expect(packet.item_count).toBeGreaterThan(0)
      expect(packet.item_count).toBeLessThanOrEqual(
        20,
      )
      expect(packet.pending_count).toBe(
        packet.item_count,
      )
      expect(packet.reviewed_count).toBe(0)
    }
  })

  it('creates one CSV row per review item', () => {
    const lines = worklistCsv
      .trimEnd()
      .split('\n')

    expect(lines).toHaveLength(145)
  })

  it('keeps the private workspace ignored by Git', () => {
    const gitignore = readFileSync(
      '.gitignore',
      'utf8',
    ).split(/\r?\n/)

    expect(gitignore).toContain(
      '.vereda-private/',
    )
  })
})
