import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const recovery = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-book-3-successor-anchor-recovery-decisions.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('Book 3 successor-anchor recovery', () => {
  it('processes exactly three queued cases', () => {
    expect(
      recovery.recoveries,
    ).toHaveLength(3)
    expect(
      recovery.totals.resolved_count +
        recovery.totals
          .still_unresolved_count,
    ).toBe(3)
  })

  it('records only defensible recovery outcomes', () => {
    for (
      const item of
      recovery.recoveries
    ) {
      const evidence =
        item.evidence

      expect(
        evidence.original_source_pdf_page,
      ).toBeGreaterThan(0)

      if (
        item.recovery_status ===
        'resolved'
      ) {
        expect([
          'exclude-structural-heading',
          'retain-intro-segment',
        ]).toContain(
          item.selected_decision,
        )
        expect(
          evidence.successor_title_found,
        ).toBe(true)
        expect(
          evidence.pair_ambiguous,
        ).toBe(false)
        expect(
          evidence.toc_like,
        ).toBe(false)
        expect(
          evidence
            .successor_source_pdf_page_reviewed,
        ).toBeGreaterThanOrEqual(
          evidence
            .source_pdf_page_reviewed,
        )
        expect(
          item.supersedes_original_unresolved,
        ).toBe(true)
      } else {
        expect(
          item.recovery_status,
        ).toBe('still-unresolved')
        expect(
          item.selected_decision,
        ).toBe('unresolved')
        expect(
          item.reviewer_confidence,
        ).toBe('low')
        expect(
          typeof item.unresolved_reason,
        ).toBe('string')
      }
    }
  })

  it('keeps public evidence content-free', () => {
    expect(
      recovery.contains_full_text,
    ).toBe(false)
    expect(
      recovery.contains_source_excerpt,
    ).toBe(false)

    for (
      const item of
      recovery.recoveries
    ) {
      expect(
        item.source_text_included,
      ).toBe(false)
      expect(
        item.source_excerpt_included,
      ).toBe(false)
      expect(
        item.database_change_applied,
      ).toBe(false)
      expect(
        item.cutover_enabled,
      ).toBe(false)
    }
  })

  it('updates cumulative progress without adding decision identities', () => {
    const resolved =
      recovery.totals.resolved_count

    expect(
      progress.totals,
    ).toMatchObject({
      item_count: 144,
      packet_count: 16,

      title_window_recovered_count: 0,
      title_window_still_unresolved_count: 3,
      non_contents_recovered_count: 0,
      non_contents_still_unresolved_count: 1,
      book_3_successor_anchor_recovered_count:
        resolved,
      book_3_successor_anchor_still_unresolved_count:
        3 - resolved,
      database_change_count: 0,
    })
    expect(
      progress.totals.pending_count,
    ).toBeLessThanOrEqual(126)
    expect(
      progress.totals.public_decision_count,
    ).toBeGreaterThanOrEqual(18)
    expect(
      progress.totals.completed_packet_count,
    ).toBeGreaterThanOrEqual(4)
    expect(
      progress.totals.pending_packet_count,
    ).toBeLessThanOrEqual(12)
    expect(
      progress.totals.reviewed_count,
    ).toBeGreaterThanOrEqual(
      4 + resolved,
    )
    expect(
      progress.totals.unresolved_count,
    ).toBeLessThanOrEqual(
      14 - resolved,
    )
    expect(
      progress.totals.reviewed_count +
        progress.totals.unresolved_count,
    ).toBeGreaterThanOrEqual(18)
  })

  it('preserves the complete non-application boundary', () => {
    const boundary =
      recovery.recovery_boundary

    expect(
      boundary.local_source_read,
    ).toBe(true)
    expect(
      boundary
        .structured_recovery_attempts_recorded,
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
          'structured_recovery_attempts_recorded',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
