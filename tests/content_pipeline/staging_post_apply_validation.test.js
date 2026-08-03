import { describe, expect, it } from 'vitest'

import {
  validatePostApply,
} from '../../scripts/content_pipeline/staging_post_apply_validation.mjs'

const rows = [
  {
    check_key: 'staging-schema-exists',
    severity: 'blocking',
    passed: true,
    actual_value: 'present',
    details: {},
  },
  {
    check_key: 'staging-table-count',
    severity: 'blocking',
    passed: true,
    actual_value: '7',
    details: { expected: 7 },
  },
  {
    check_key: 'staging-function-count',
    severity: 'blocking',
    passed: true,
    actual_value: '2',
    details: { expected: 2 },
  },
  {
    check_key: 'staging-view-count',
    severity: 'blocking',
    passed: true,
    actual_value: '1',
    details: { expected: 1 },
  },
  {
    check_key: 'application-roles-denied',
    severity: 'blocking',
    passed: true,
    actual_value: 'false',
    details: {
      expected_any_access: false,
    },
  },
  {
    check_key: 'service-role-has-usage',
    severity: 'blocking',
    passed: true,
    actual_value: 'true',
    details: { expected: true },
  },
  {
    check_key: 'staging-is-empty',
    severity: 'blocking',
    passed: true,
    actual_value: '0',
    details: {},
  },
  {
    check_key: 'production-section-count',
    severity: 'blocking',
    passed: true,
    actual_value: '908',
    details: { expected: 908 },
  },
]

describe('staging post-application validation', () => {
  it('accepts an empty and isolated staging foundation', () => {
    expect(
      validatePostApply({
        rows,
        expectedSectionCount: 908,
      }).errors,
    ).toEqual([])
  })

  it('blocks production section drift', () => {
    const changed = structuredClone(rows)
    changed.at(-1).actual_value = '909'

    expect(
      validatePostApply({
        rows: changed,
        expectedSectionCount: 908,
      }).errors,
    ).toContain(
      'Production section count drifted: expected 908, received 909.',
    )
  })

  it('blocks application-role access', () => {
    const changed = structuredClone(rows)
    changed[4].actual_value = 'true'
    changed[4].passed = false

    const errors = validatePostApply({
      rows: changed,
      expectedSectionCount: 908,
    }).errors

    expect(errors).toContain(
      'Application roles must not have staging schema access.',
    )
  })

  it('requires empty staging after foundation application', () => {
    const changed = structuredClone(rows)
    changed[6].actual_value = '1'
    changed[6].passed = false

    expect(
      validatePostApply({
        rows: changed,
        expectedSectionCount: 908,
      }).errors,
    ).toContain(
      'Staging must be empty immediately after foundation application; received 1 rows.',
    )
  })
})
