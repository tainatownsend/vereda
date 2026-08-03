import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const plan = JSON.parse(
  readFileSync(
    'content/migration/reading-segment-mechanical-application-plan.json',
    'utf8',
  ),
)

const preflight = readFileSync(
  'supabase/audits/mechanical_boundary_application_preflight.sql',
  'utf8',
).replace(/\r\n?/g, '\n')

const application = readFileSync(
  'supabase/staging/20260803110000_apply_mechanical_boundary_decisions_v1.sql',
  'utf8',
).replace(/\r\n?/g, '\n')

const verification = readFileSync(
  'supabase/audits/mechanical_boundary_application_verification.sql',
  'utf8',
).replace(/\r\n?/g, '\n')

describe('mechanical boundary application plan', () => {
  it('plans exactly 166 targets', () => {
    expect(
      plan.totals.target_segment_count,
    ).toBe(166)
    expect(
      plan.totals.unaffected_segment_count,
    ).toBe(646)
    expect(plan.targets).toHaveLength(166)
  })

  it('uses the content-review gate without content approval', () => {
    expect(
      plan.planned_status_transition,
    ).toEqual({
      from: 'boundary-review',
      to: 'content-review',
      target_count: 166,
      content_approval: false,
    })
  })

  it('creates read-only preflight and verification SQL', () => {
    const mutation =
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\b/i

    expect(preflight).not.toMatch(mutation)
    expect(verification).not.toMatch(
      mutation,
    )
    expect(
      preflight.match(
        /'blocking'::text as severity/g,
      ),
    ).toHaveLength(19)
    expect(
      verification.match(
        /'blocking'::text as severity/g,
      ),
    ).toHaveLength(20)
  })

  it('creates a transactional staging-only application', () => {
    expect(application).toContain('begin;')
    expect(application).toContain(
      'update content_staging.reading_segments',
    )
    expect(application).toContain(
      "approval_status = 'content-review'",
    )
    expect(application).toContain('commit;')
    expect(application).not.toMatch(
      /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\s+public\./i,
    )
  })

  it('does not assign content fields', () => {
    expect(application).not.toContain(
      'set content =',
    )
    expect(application).not.toContain(
      'set word_count =',
    )
    expect(application).not.toContain(
      'set normalized_content_sha256 =',
    )
  })

  it('keeps application authorization disabled', () => {
    expect(
      plan.application_boundary.plan_generated,
    ).toBe(true)
    expect(
      plan.application_boundary.sql_generated,
    ).toBe(true)

    for (const [field, value] of Object.entries(
      plan.application_boundary,
    )) {
      if (
        ![
          'plan_generated',
          'sql_generated',
        ].includes(field)
      ) {
        expect(value).toBe(false)
      }
    }
  })
})
