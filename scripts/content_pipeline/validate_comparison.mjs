import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  validateComparisonSummary,
} from './comparison_validation.mjs'

const summaryPath = path.resolve(
  'content/structure/comparisons/comparison-summary.json',
)
const summary = JSON.parse(
  await readFile(summaryPath, 'utf8'),
)
const errors = validateComparisonSummary(
  summary,
)

if (errors.length) {
  console.error('Comparison validation failed:')

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

for (const entry of summary.books) {
  const book = entry.book
  const result = entry.summary

  console.log(
    `${book.title}: ` +
      `${result.current_record_count} rows, ` +
      `${result.matched_chapter_count}/` +
      `${result.canonical_chapter_count} chapters matched.`,
  )
}

console.log(
  'All five comparison reports are valid.',
)
