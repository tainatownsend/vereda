import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const normalizeNewlines = (value) =>
  value.replace(/\r\n?/g, '\n')

const manifest = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-design-manifest.json',
    'utf8',
  ),
)
const queue = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-review-queue.json',
    'utf8',
  ),
)
const loadSql = normalizeNewlines(
  readFileSync(
    manifest.artifacts.draft_load_sql,
    'utf8',
  ),
)
const verificationSql = normalizeNewlines(
  readFileSync(
    manifest.artifacts.future_verification_sql,
    'utf8',
  ),
)

describe('reading-segment design manifest', () => {
  it('keeps the design unapplied and blocked', () => {
    expect(manifest.status).toBe(
      'designed-not-applied',
    )
    expect(manifest.rights_status).toBe(
      'blocked',
    )
    expect(manifest.sql_applied).toBe(false)
    expect(manifest.cutover_allowed).toBe(
      false,
    )
  })

  it('covers every canonical leaf with deterministic proposals', () => {
    expect(
      manifest.totals.leaf_node_proposal_count,
    ).toBeGreaterThan(0)
    expect(
      manifest.totals.segment_proposal_count,
    ).toBe(manifest.proposals.length)

    const keys = new Set(
      manifest.proposals.map(
        (proposal) => proposal.segment_key,
      ),
    )

    expect(keys.size).toBe(
      manifest.proposals.length,
    )
  })

  it('contains no source text fields', () => {
    for (const proposal of manifest.proposals) {
      expect(proposal.content_included).toBe(
        false,
      )
      expect(proposal).not.toHaveProperty(
        'content',
      )
      expect(proposal).not.toHaveProperty(
        'raw_text',
      )
      expect(proposal).not.toHaveProperty(
        'full_text',
      )
      expect(proposal).not.toHaveProperty(
        'excerpt',
      )
    }
  })

  it('keeps the review queue synchronized', () => {
    expect(queue.proposal_count).toBe(
      manifest.totals.manual_review_count,
    )
    expect(queue.proposals).toHaveLength(
      queue.proposal_count,
    )
  })
})

describe('reading-segment design SQL', () => {
  it('is generated but content-free', () => {
    expect(loadSql).toContain(
      'insert into content_staging.reading_segments',
    )
    expect(loadSql).toContain(
      "'boundary-review'",
    )
    expect(loadSql).not.toMatch(
      /insert\s+into\s+content_staging\.current_successor_mappings/i,
    )
    expect(loadSql).not.toMatch(
      /insert\s+into\s+content_staging\.dependency_snapshots/i,
    )
  })

  it('does not mutate production tables', () => {
    expect(loadSql).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\s+public\./i,
    )
  })

  it('uses an outer query for future verification ordering', () => {
    expect(verificationSql).toContain(
      'from (\n',
    )
    expect(verificationSql).toContain(
      ') checks\norder by checks.check_key;',
    )
  })
})
