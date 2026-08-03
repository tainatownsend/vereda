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
    'content/migration/reading-segment-title-window-recovery-decisions.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('current-title window recovery', () => {
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

  it('records only defensible replacement outcomes', () => {
    for (
      const item of
      recovery.recoveries
    ) {
      expect(
        item.evidence
          .source_pdf_page_reviewed,
      ).toBeGreaterThan(0)

      if (
        item.recovery_status ===
        'resolved'
      ) {
        expect(
          typeof item.evidence
            .current_title_match_method,
        ).toBe('string')
        expect(
          item.evidence
            .current_title_match_score,
        ).toBeGreaterThan(0)
        expect(
          item.evidence
            .current_title_window_line_count,
        ).toBeGreaterThan(0)
        expect(
          item.evidence.toc_signal_count,
        ).toBe(0)
        expect([
          'exclude-structural-heading',
          'retain-intro-segment',
        ]).toContain(
          item.selected_decision,
        )
        expect(
          item.evidence
            .successor_title_found,
        ).toBe(true)
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

        if (
          item.evidence
            .current_title_match_method ===
          null
        ) {
          expect(
            item.evidence
              .current_title_match_score,
          ).toBeNull()
          expect(
            item.evidence
              .current_title_window_line_count,
          ).toBe(0)
          expect(
            item.evidence
              .successor_title_found,
          ).toBe(false)
          expect(
            item.evidence
              .successor_source_pdf_page_reviewed,
          ).toBeNull()
        } else {
          expect(
            item.evidence
              .current_title_match_score,
          ).toBeGreaterThan(0)
          expect(
            item.evidence
              .current_title_window_line_count,
          ).toBeGreaterThan(0)
          expect(
            item.evidence
              .toc_signal_count,
          ).toBe(0)
        }
      }
    }
  })

  it('keeps public recovery evidence content-free', () => {
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

  it('updates cumulative status without adding public decisions', () => {
    const resolved =
      recovery.totals.resolved_count

    expect(progress.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      pending_count: 126,
      public_decision_count: 18,
      completed_packet_count: 4,
      pending_packet_count: 12,
      title_window_recovered_count:
        resolved,
      title_window_still_unresolved_count:
        3 - resolved,
      database_change_count: 0,
    })

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
    ).toBe(18)
  })

  it('preserves the non-application boundary', () => {
    expect(
      recovery.recovery_boundary
        .local_sources_read,
    ).toBe(true)
    expect(
      recovery.recovery_boundary
        .structured_recovery_attempts_recorded,
    ).toBe(true)

    for (const [
      field,
      value,
    ] of Object.entries(
      recovery.recovery_boundary,
    )) {
      if (
        ![
          'local_sources_read',
          'structured_recovery_attempts_recorded',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
