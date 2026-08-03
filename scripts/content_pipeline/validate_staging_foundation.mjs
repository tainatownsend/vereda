import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  validateReaderLanguageContract,
  validateStagingMigration,
} from './staging_sql_validation.mjs'

const migrationPath = path.resolve(
  'supabase/migrations/20260803033000_content_staging_foundation.sql',
)
const contractPath = path.resolve(
  'content/migration/reader-language-contract.json',
)
const manifestPath = path.resolve(
  'content/migration/staging-foundation-manifest.json',
)

const migrationSql = await readFile(
  migrationPath,
  'utf8',
)
const contract = JSON.parse(
  await readFile(contractPath, 'utf8'),
)
const manifest = JSON.parse(
  await readFile(manifestPath, 'utf8'),
)

const errors = [
  ...validateStagingMigration(migrationSql),
  ...validateReaderLanguageContract(contract),
]

if (manifest.schema_version !== 1) {
  errors.push('staging manifest schema_version must be 1')
}

if (manifest.status !== 'blocked-not-applied') {
  errors.push(
    'staging manifest must remain blocked-not-applied',
  )
}

if (manifest.production_mutation_allowed !== false) {
  errors.push(
    'production mutation must remain disabled',
  )
}

if (manifest.cutover_allowed !== false) {
  errors.push('cutover must remain disabled')
}

if (manifest.totals?.book_count !== 5) {
  errors.push('staging manifest must contain five books')
}

if (
  manifest.source_snapshot?.contains_full_text !==
  false
) {
  errors.push('snapshot cannot contain full text')
}

if (
  manifest.source_snapshot?.contains_user_data !==
  false
) {
  errors.push('snapshot cannot contain user data')
}

if (errors.length) {
  console.error(
    'Staging-foundation validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'Content-staging SQL is isolated from production mutations.',
)
console.log(
  'Reader terminology separates editorial nodes, reading segments, and user-facing language.',
)
console.log(
  `Validated ${manifest.totals.current_section_decision_count} legacy section decisions across five works.`,
)
console.log(
  'Cutover remains blocked and no migration was applied.',
)
