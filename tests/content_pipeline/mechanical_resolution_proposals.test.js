import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proposals = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-resolution-proposals.json',
    'utf8',
  ),
)
const batches = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-resolution-review-batches.json',
    'utf8',
  ),
)

describe('mechanical resolution proposals', () => {
  it('packages all 166 candidates', () => {
    expect(
      proposals.totals.proposal_count,
    ).toBe(166)
    expect(proposals.proposals).toHaveLength(
      166,
    )
  })

  it('keeps every proposal unapproved', () => {
    for (const proposal of proposals.proposals) {
      expect(
        proposal.proposal_status,
      ).toBe('proposed-not-approved')
      expect(
        proposal.boundary_approved,
      ).toBe(false)
      expect(
        proposal.database_change_applied,
      ).toBe(false)
    }
  })

  it('records complete continuity evidence', () => {
    for (const proposal of proposals.proposals) {
      expect(
        Object.values(
          proposal.continuity_evidence,
        ).every(Boolean),
      ).toBe(true)
      expect(
        proposal.shared_page_evidence.available,
      ).toBe(true)
    }
  })

  it('creates batches capped at 25 items', () => {
    expect(batches.proposal_count).toBe(166)

    for (const batch of batches.batches) {
      expect(batch.item_count).toBeGreaterThan(0)
      expect(batch.item_count).toBeLessThanOrEqual(
        25,
      )
    }
  })

  it('keeps application boundaries disabled', () => {
    for (const value of Object.values(
      proposals.application_boundary,
    )) {
      expect(value).toBe(false)
    }
  })
})
