import { readFile } from 'node:fs/promises'

import {
  validateEditorialNodeVerification,
} from './editorial_node_verification_validation.mjs'

const manifest = JSON.parse(
  await readFile(
    'content/migration/editorial-node-load-manifest.json',
    'utf8',
  ),
)
const evidence = JSON.parse(
  await readFile(
    'content/migration/editorial-node-load-evidence.json',
    'utf8',
  ),
)

const errors = []

if (evidence.schema_version !== 1) {
  errors.push('schema_version must be 1')
}

if (
  evidence.status !==
  'editorial-nodes-verified'
) {
  errors.push(
    'status must be editorial-nodes-verified',
  )
}

if (evidence.run_id !== manifest.run_id) {
  errors.push('run ID differs from manifest')
}

if (
  evidence.migration_version !==
  manifest.migration_version
) {
  errors.push(
    'migration version differs from manifest',
  )
}

errors.push(
  ...validateEditorialNodeVerification({
    rows: evidence.checks || [],
    manifest,
  }),
)

if (errors.length) {
  console.error(
    'Editorial-node evidence validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Verified ${evidence.summary.editorial_node_count} canonical editorial nodes.`,
)
console.log(
  'Reading segments, mappings, dependency snapshots, and cutover remain empty or disabled.',
)
