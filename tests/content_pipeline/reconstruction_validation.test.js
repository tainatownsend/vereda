import { describe, expect, it } from 'vitest'

import {
  validateReconstructionPlan,
  validateReconstructionSummary,
} from '../../scripts/content_pipeline/reconstruction_validation.mjs'

const validPlan = {
  schema_version: 1,
  status: 'diagnostic-plan',
  strategy: 'targeted-staging-reconstruction',
  current_section_decisions: [
    {
      decision_id: 'book:current:1',
      current_section_id: 1,
      action: 'keep',
      progress_strategy:
        'retain-current-section-until-cutover',
      provisional_segment_key: '12345678901234567890',
    },
  ],
}

describe('reconstruction plan validation', () => {
  it('accepts a diagnostic plan', () => {
    expect(
      validateReconstructionPlan(validPlan),
    ).toEqual([])
  })

  it('requires review actions to block migration', () => {
    const plan = structuredClone(validPlan)
    plan.current_section_decisions[0].action =
      'review'

    expect(
      validateReconstructionPlan(plan),
    ).toContain(
      'review decision must block migration: book:current:1',
    )
  })

  it('rejects provisional keys for split decisions', () => {
    const plan = structuredClone(validPlan)
    plan.current_section_decisions[0].action =
      'split'

    expect(
      validateReconstructionPlan(plan),
    ).toContain(
      'split decision cannot have a provisional segment key: book:current:1',
    )
  })

  it('rejects full-text fields', () => {
    const plan = structuredClone(validPlan)
    plan.content = 'Forbidden'

    expect(
      validateReconstructionPlan(plan),
    ).toContain('forbidden key: content')
  })
})

describe('reconstruction summary validation', () => {
  it('requires five books', () => {
    expect(
      validateReconstructionSummary({
        schema_version: 1,
        status: 'diagnostic-plan',
        book_count: 5,
        books: Array.from(
          { length: 5 },
          (_, index) => ({ book_id: index + 1 }),
        ),
      }),
    ).toEqual([])
  })
})
