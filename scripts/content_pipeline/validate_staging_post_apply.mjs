import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  validatePostApply,
} from './staging_post_apply_validation.mjs'

const evidencePath = path.resolve(
  'content/migration/staging-post-apply-evidence.json',
)
const evidence = JSON.parse(
  await readFile(evidencePath, 'utf8'),
)

const errors = []

if (evidence.schema_version !== 1) {
  errors.push('schema_version must be 1')
}

if (
  evidence.status !==
  'staging-foundation-verified'
) {
  errors.push(
    'status must be staging-foundation-verified',
  )
}

if (
  !/^[a-f0-9]{64}$/.test(
    evidence.source_csv?.sha256 || '',
  )
) {
  errors.push(
    'post-application CSV SHA-256 is invalid',
  )
}

const validation = validatePostApply({
  rows: evidence.checks || [],
  expectedSectionCount: 908,
})

errors.push(...validation.errors)

if (errors.length) {
  console.error(
    'Post-application evidence validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Validated ${evidence.summary.check_count} post-application checks.`,
)
console.log(
  'Private staging contains zero rows.',
)
console.log(
  'Application roles remain denied.',
)
console.log(
  'Production still contains 908 sections.',
)
console.log(
  'Cutover remains disabled.',
)
