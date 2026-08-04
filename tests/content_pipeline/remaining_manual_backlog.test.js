import {
  readFileSync,
} from 'node:fs'

import {
  describe,
  expect,
  it,
} from 'vitest'

const decisions = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-remaining-manual-adjudication-decisions.json',
    'utf8',
  ),
)
const closure = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-manual-adjudication-closure.json',
    'utf8',
  ),
)
const audit = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-pending-source-review-audit.json',
    'utf8',
  ),
)
const progress = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-source-review-progress.json',
    'utf8',
  ),
)

describe('remaining manual backlog closure', () => {
  it('reviews exactly five remaining items', () => {
    expect(
      decisions.decisions,
    ).toHaveLength(5)
    expect(
      decisions.totals.item_count,
    ).toBe(5)
    expect(
      decisions.totals
        .manual_review_completed_count,
    ).toBe(5)

    const segmentKeys = new Set(
      decisions.decisions.map(
        (item) =>
          item.segment_key,
      ),
    )

    expect(
      segmentKeys.size,
    ).toBe(5)
  })

  it('records only defensible outcomes or explicit unresolved results', () => {
    for (
      const decision of
      decisions.decisions
    ) {
      expect(
        decision.manual_review_completed,
      ).toBe(true)
      expect(
        decision.source_text_included,
      ).toBe(false)
      expect(
        decision.source_excerpt_included,
      ).toBe(false)
      expect(
        decision.database_change_applied,
      ).toBe(false)

      if (
        decision.review_status ===
        'reviewed'
      ) {
        expect([
          'exclude-structural-heading',
          'retain-intro-segment',
        ]).toContain(
          decision.selected_decision,
        )
        expect([
          'high',
          'medium',
        ]).toContain(
          decision.reviewer_confidence,
        )
        expect(
          decision.evidence
            .source_boundary_is_defensible,
        ).toBe(true)
      } else {
        expect(
          decision.review_status,
        ).toBe('unresolved')
        expect(
          decision.selected_decision,
        ).toBe('unresolved')
        expect(
          decision.reviewer_confidence,
        ).toBe('low')
        expect(
          typeof decision
            .unresolved_reason,
        ).toBe('string')
      }
    }
  })

  it('accounts for the complete manual backlog', () => {
    const resolved =
      decisions.totals
        .reviewed_count
    const unresolved =
      decisions.totals
        .unresolved_count

    expect(
      resolved + unresolved,
    ).toBe(5)
    expect(
      closure.totals,
    ).toMatchObject({
      original_item_count: 7,
      reviewed_item_count: 7,
      resolved_item_count:
        2 + resolved,
      unresolved_item_count:
        unresolved,
      completed_batch_count: 4,
      pending_batch_count: 0,
      database_change_count: 0,
    })
  })

  it('audits all pending source-review work', () => {
    expect(
      audit.totals,
    ).toMatchObject({
      pending_packet_count: 12,
      pending_item_count: 126,
      container_intro_same_page_count:
        38,
      same_page_no_semantic_anchor_count:
        88,
      database_change_count: 0,
    })
    expect(
      audit.counts_by_book,
    ).toEqual({
      1: 29,
      2: 70,
      3: 1,
      4: 6,
      5: 20,
    })
    expect(
      audit.packets,
    ).toHaveLength(12)
  })

  it('updates cumulative state without applying boundaries', () => {
    const resolved =
      decisions.totals
        .reviewed_count

    expect(
      progress.totals.reviewed_count,
    ).toBeGreaterThanOrEqual(
      13 + resolved,
    )
    expect(
      progress.totals.unresolved_count,
    ).toBeLessThanOrEqual(
      5 - resolved,
    )
    expect(
      progress.totals.pending_count,
    ).toBeLessThanOrEqual(126)
    expect(
      progress.totals
        .public_decision_count,
    ).toBeGreaterThanOrEqual(18)
    expect(
      progress.totals
        .manual_adjudication_reviewed_count,
    ).toBe(7)
    expect(
      progress.totals
        .manual_adjudication_completed_batch_count,
    ).toBe(4)
    expect(
      progress.totals
        .manual_adjudication_pending_batch_count,
    ).toBe(0)
    expect(
      progress.totals.reviewed_count +
        progress.totals.unresolved_count,
    ).toBeGreaterThanOrEqual(18)

    for (const [
      field,
      value,
    ] of Object.entries(
      decisions
        .adjudication_boundary,
    )) {
      if (
        ![
          'local_sources_read',
          'private_evidence_generated',
          'structured_diagnostics_recorded',
          'manual_review_completed',
          'structured_decisions_recorded',
          'pending_backlog_audited',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
