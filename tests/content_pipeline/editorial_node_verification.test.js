import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  validateEditorialNodeVerification,
} from '../../scripts/content_pipeline/editorial_node_verification_validation.mjs'

const manifest = JSON.parse(
  readFileSync(
    'content/migration/editorial-node-load-manifest.json',
    'utf8',
  ),
)

const validRows =
  manifest.verification.required_check_keys.map(
    (checkKey) => ({
      check_key: checkKey,
      severity: 'blocking',
      passed: true,
      actual_value:
        manifest.verification
          .expected_actual_values[checkKey] ??
        'verified',
      details: {},
    }),
  )

describe('editorial-node verification', () => {
  it('accepts all required passing checks', () => {
    expect(
      validateEditorialNodeVerification({
        rows: validRows,
        manifest,
      }),
    ).toEqual([])
  })

  it('blocks a failed check', () => {
    const rows = structuredClone(validRows)
    rows[0].passed = false

    expect(
      validateEditorialNodeVerification({
        rows,
        manifest,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Blocking check failed',
        ),
      ]),
    )
  })

  it('blocks a missing check', () => {
    expect(
      validateEditorialNodeVerification({
        rows: validRows.slice(1),
        manifest,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Missing required verification check',
        ),
      ]),
    )
  })

  it('blocks count drift', () => {
    const rows = structuredClone(validRows)
    const total = rows.find(
      (row) =>
        row.check_key ===
        'editorial-node-total',
    )
    total.actual_value = '1'

    expect(
      validateEditorialNodeVerification({
        rows,
        manifest,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Unexpected actual value for editorial-node-total',
        ),
      ]),
    )
  })
})
