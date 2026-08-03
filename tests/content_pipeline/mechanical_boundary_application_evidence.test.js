import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const evidencePath =
  'content/migration/reading-segment-mechanical-application-evidence.json'

const evidence = existsSync(evidencePath)
  ? JSON.parse(
      readFileSync(evidencePath, 'utf8'),
    )
  : null

describe('mechanical boundary application evidence', () => {
  it('keeps the capture gate optional until database execution', () => {
    if (evidence === null) {
      expect(existsSync(evidencePath)).toBe(false)
      return
    }

    expect(evidence.status).toBe(
      'mechanical-boundaries-applied-and-verified',
    )
  })

  it('records the intended verified totals when evidence exists', () => {
    if (evidence === null) {
      return
    }

    expect(evidence.totals).toMatchObject({
      staged_segment_count: 812,
      target_segment_count: 166,
      target_content_review_count: 166,
      target_boundary_review_count: 0,
      unaffected_boundary_review_count: 646,
      preflight_check_count: 19,
      verification_check_count: 20,
      application_audit_event_count: 1,
      content_row_count: 0,
      successor_mapping_count: 0,
      dependency_snapshot_count: 0,
      dry_run_result_count: 0,
      production_section_count: 908,
    })
  })

  it('keeps publication and production boundaries disabled', () => {
    if (evidence === null) {
      return
    }

    expect(
      evidence.application_boundary
        .staging_status_updated,
    ).toBe(true)
    expect(
      evidence.application_boundary
        .boundary_decisions_applied,
    ).toBe(true)

    for (const field of [
      'content_approved',
      'content_loaded',
      'successor_mapping_created',
      'dependency_snapshot_captured',
      'production_modified',
      'progress_migrated',
      'reading_sessions_rewritten',
      'cutover_enabled',
    ]) {
      expect(
        evidence.application_boundary[field],
      ).toBe(false)
    }
  })
})
