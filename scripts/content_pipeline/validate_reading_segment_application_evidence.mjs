import { readFile } from 'node:fs/promises'

import {
  validateReadingSegmentApplication,
} from './reading_segment_application_validation.mjs'

const manifest = JSON.parse(
  await readFile(
    'content/migration/reading-segment-design-manifest.json',
    'utf8',
  ),
)
const evidence = JSON.parse(
  await readFile(
    'content/migration/reading-segment-application-evidence.json',
    'utf8',
  ),
)

const errors = []

if (evidence.schema_version !== 1) {
  errors.push('schema_version must be 1')
}

if (
  evidence.status !==
  'reading-segments-staged-and-verified'
) {
  errors.push(
    'status must be reading-segments-staged-and-verified',
  )
}

if (evidence.run_id !== manifest.run_id) {
  errors.push('run ID differs from design manifest')
}

if (
  evidence.design_version !==
  manifest.design_version
) {
  errors.push(
    'design version differs from manifest',
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
  evidence.summary?.reading_segment_count !==
  manifest.totals.segment_proposal_count
) {
  errors.push(
    'verified segment count differs from design manifest',
  )
}

if (
  evidence.summary?.boundary_review_count !==
  manifest.totals.segment_proposal_count
) {
  errors.push(
    'all staged segments must remain in boundary review',
  )
}

if (evidence.summary?.content_row_count !== 0) {
  errors.push('content row count must remain zero')
}

if (
  evidence.summary?.successor_mapping_count !== 0
) {
  errors.push(
    'successor mappings must remain empty',
  )
}

if (
  evidence.summary?.dependency_snapshot_count !== 0
) {
  errors.push(
    'dependency snapshots must remain empty',
  )
}

if (
  evidence.summary?.production_section_count !==
  908
) {
  errors.push(
    'production section count must remain 908',
  )
}

if (
  evidence.summary?.rights_status !== 'blocked'
) {
  errors.push('rights status must remain blocked')
}

if (evidence.summary?.cutover_enabled !== false) {
  errors.push('cutover must remain disabled')
}

errors.push(
  ...validateReadingSegmentApplication({
    rows: evidence.checks || [],
    manifest,
  }),
)

if (errors.length) {
  console.error(
    'Reading-segment application evidence validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Verified ${evidence.summary.reading_segment_count} content-free reading segments.`,
)
console.log(
  'All rows remain in boundary review; mappings, snapshots, content, and cutover remain blocked.',
)
