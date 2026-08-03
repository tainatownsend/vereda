import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  validateReconstructionPlan,
  validateReconstructionSummary,
} from './reconstruction_validation.mjs'

const slugs = [
  'o-livro-dos-espiritos',
  'o-livro-dos-mediuns',
  'o-evangelho-segundo-o-espiritismo',
  'o-ceu-e-o-inferno',
  'a-genese',
]

const errors = []

for (const slug of slugs) {
  const planPath = path.resolve(
    'content/reconstruction/plans',
    `${slug}.json`,
  )
  const plan = JSON.parse(
    await readFile(planPath, 'utf8'),
  )
  const planErrors =
    validateReconstructionPlan(plan)

  if (planErrors.length) {
    errors.push(
      ...planErrors.map(
        (error) => `${slug}: ${error}`,
      ),
    )
  } else {
    console.log(
      `Validated ${slug}: ` +
        `${plan.current_section_decisions.length} decisions, ` +
        `${plan.strategy}.`,
    )
  }
}

const summaryPath = path.resolve(
  'content/reconstruction/reports/reconstruction-plan-summary.json',
)
const summary = JSON.parse(
  await readFile(summaryPath, 'utf8'),
)
errors.push(
  ...validateReconstructionSummary(
    summary,
  ).map(
    (error) => `summary: ${error}`,
  ),
)

if (errors.length) {
  console.error(
    'Reconstruction-plan validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  'All five reconstruction plans are valid.',
)
