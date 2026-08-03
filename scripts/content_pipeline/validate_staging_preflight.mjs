import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  validatePreflight,
} from './staging_preflight_validation.mjs'

const evidencePath = path.resolve(
  'content/migration/staging-preflight-evidence.json',
)
const evidence = JSON.parse(
  await readFile(evidencePath, 'utf8'),
)

const errors = []

if (evidence.schema_version !== 1) {
  errors.push('schema_version must be 1')
}

if (evidence.status !== 'preflight-passed') {
  errors.push('status must be preflight-passed')
}

if (
  evidence.summary?.contains_user_identifiers !== false
) {
  errors.push(
    'contains_user_identifiers must be false',
  )
}

if (
  !/^[a-f0-9]{64}$/.test(
    evidence.source_csv?.sha256 || '',
  )
) {
  errors.push('source CSV SHA-256 is invalid')
}

if (
  !/^[a-f0-9]{64}$/.test(
    evidence.expected_snapshot?.sha256 || '',
  )
) {
  errors.push('snapshot SHA-256 is invalid')
}

const validation = validatePreflight({
  rows: evidence.checks || [],
  expectedSectionCount:
    evidence.expected_snapshot?.row_count,
})

errors.push(...validation.errors)

if (errors.length) {
  console.error(
    'Staging preflight evidence validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Validated ${evidence.summary.check_count} preflight checks.`,
)
console.log(
  `Production section count remains ${evidence.summary.production_section_count}.`,
)
console.log(
  'All blocking production checks passed.',
)
console.log(
  'No migration was applied by this validation.',
)
