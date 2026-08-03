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
    'content/migration/reading-segment-non-contents-recovery-decision.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('non-contents occurrence recovery', () => {
  it('processes exactly one queued case', () => {
    expect(
      recovery.totals.target_item_count,
    ).toBe(1)
    expect(
      recovery.totals.resolved_count +
        recovery.totals
          .still_unresolved_count,
    ).toBe(1)
    expect(
      recovery.recovery.segment_key,
    ).toBe(
      'd709f621f896bf4419b76509',
    )
  })

  it('never resolves from the original contents page', () => {
    const item = recovery.recovery
    const evidence = item.evidence

    expect(
      evidence.original_contents_page,
    ).toBe(8)

    if (
      item.recovery_status ===
      'resolved'
    ) {
      expect(
        evidence.source_pdf_page_reviewed,
      ).toBeGreaterThanOrEqual(20)
      expect(
        evidence.source_pdf_page_reviewed,
      ).not.toBe(8)
      expect(
        evidence.toc_like,
      ).toBe(false)
      expect(
        evidence.successor_title_found,
      ).toBe(true)
      expect(
        evidence
          .successor_source_pdf_page_reviewed,
      ).toBeGreaterThanOrEqual(
        evidence.source_pdf_page_reviewed,
      )
      expect([
        'exclude-structural-heading',
        'retain-intro-segment',
      ]).toContain(
        item.selected_decision,
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
  })

  it('keeps public evidence content-free', () => {
    expect(
      recovery.contains_full_text,
    ).toBe(false)
    expect(
      recovery.contains_source_excerpt,
    ).toBe(false)
    expect(
      recovery.recovery
        .source_text_included,
    ).toBe(false)
    expect(
      recovery.recovery
        .source_excerpt_included,
    ).toBe(false)
    expect(
      recovery.recovery
        .database_change_applied,
    ).toBe(false)
    expect(
      recovery.recovery
        .cutover_enabled,
    ).toBe(false)
  })

  it('updates cumulative progress without adding decision identities', () => {
    const resolved =
      recovery.totals.resolved_count

    expect(progress.totals).toMatchObject({
      item_count: 144,
      packet_count: 16,
      pending_count: 126,
      public_decision_count: 18,
      completed_packet_count: 4,
      pending_packet_count: 12,
      title_window_recovered_count: 0,
      title_window_still_unresolved_count: 3,
      non_contents_recovered_count:
        resolved,
      non_contents_still_unresolved_count:
        1 - resolved,
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

  it('preserves the complete non-application boundary', () => {
    const boundary =
      recovery.recovery_boundary

    expect(
      boundary.local_source_read,
    ).toBe(true)
    expect(
      boundary
        .structured_recovery_attempt_recorded,
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
          'structured_recovery_attempt_recorded',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
