const ALLOWED_ACTIONS = new Set([
  'keep',
  'relabel-review',
  'reclassify',
  'split',
  'review',
])

const ALLOWED_STRATEGIES = new Set([
  'metadata-alignment',
  'targeted-staging-reconstruction',
  'full-staging-reconstruction',
])

const FORBIDDEN_KEYS = new Set([
  'content',
  'raw_text',
  'full_text',
  'excerpt',
  'user_id',
  'email',
])

export function validateReconstructionPlan(plan) {
  const errors = []

  if (plan.schema_version !== 1) {
    errors.push('schema_version must be 1')
  }

  if (plan.status !== 'diagnostic-plan') {
    errors.push('status must be diagnostic-plan')
  }

  if (!ALLOWED_STRATEGIES.has(plan.strategy)) {
    errors.push(`invalid strategy: ${plan.strategy}`)
  }

  const decisions =
    plan.current_section_decisions || []
  const decisionIds = new Set()
  const currentSectionIds = new Set()

  for (const decision of decisions) {
    if (decisionIds.has(decision.decision_id)) {
      errors.push(
        `duplicate decision_id: ${decision.decision_id}`,
      )
    }

    if (
      currentSectionIds.has(
        decision.current_section_id,
      )
    ) {
      errors.push(
        `duplicate current_section_id: ${decision.current_section_id}`,
      )
    }

    decisionIds.add(decision.decision_id)
    currentSectionIds.add(
      decision.current_section_id,
    )

    if (!ALLOWED_ACTIONS.has(decision.action)) {
      errors.push(
        `invalid action: ${decision.action}`,
      )
    }

    if (
      decision.action === 'review' &&
      decision.progress_strategy !==
        'block-migration'
    ) {
      errors.push(
        `review decision must block migration: ${decision.decision_id}`,
      )
    }

    if (
      decision.action === 'split' &&
      decision.provisional_segment_key
    ) {
      errors.push(
        `split decision cannot have a provisional segment key: ${decision.decision_id}`,
      )
    }
  }

  const serialized = JSON.stringify(plan)

  for (const key of FORBIDDEN_KEYS) {
    if (
      new RegExp(`"${key}"\\s*:`).test(
        serialized,
      )
    ) {
      errors.push(`forbidden key: ${key}`)
    }
  }

  return errors
}

export function validateReconstructionSummary(
  summary,
) {
  const errors = []

  if (summary.schema_version !== 1) {
    errors.push('schema_version must be 1')
  }

  if (summary.status !== 'diagnostic-plan') {
    errors.push('status must be diagnostic-plan')
  }

  if (summary.book_count !== 5) {
    errors.push('book_count must be 5')
  }

  if (
    !Array.isArray(summary.books) ||
    summary.books.length !== 5
  ) {
    errors.push('books must contain five entries')
  }

  return errors
}
