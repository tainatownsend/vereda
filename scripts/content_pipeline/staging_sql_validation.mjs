const REQUIRED_TABLES = [
  'migration_runs',
  'editorial_nodes',
  'reading_segments',
  'current_successor_mappings',
  'dependency_snapshots',
  'dry_run_results',
  'migration_audit_events',
]

const REQUIRED_FUNCTIONS = [
  'capture_dependency_snapshot',
  'evaluate_dry_run',
]

const FORBIDDEN_PRODUCTION_MUTATIONS = [
  /\balter\s+table\s+public\.(?:sections|books|user_progress|reading_sessions)\b/i,
  /\bdrop\s+table\s+(?:if\s+exists\s+)?public\.(?:sections|books|user_progress|reading_sessions)\b/i,
  /\btruncate\s+(?:table\s+)?public\.(?:sections|books|user_progress|reading_sessions)\b/i,
  /\binsert\s+into\s+public\.(?:sections|books|user_progress|reading_sessions)\b/i,
  /\bupdate\s+public\.(?:sections|books|user_progress|reading_sessions)\b/i,
  /\bdelete\s+from\s+public\.(?:sections|books|user_progress|reading_sessions)\b/i,
]

export function validateStagingMigration(sql) {
  const errors = []

  if (!/create\s+schema\s+if\s+not\s+exists\s+content_staging/i.test(sql)) {
    errors.push('content_staging schema is required')
  }

  for (const table of REQUIRED_TABLES) {
    const pattern = new RegExp(
      `create\\s+table\\s+if\\s+not\\s+exists\\s+content_staging\\.${table}\\b`,
      'i',
    )

    if (!pattern.test(sql)) {
      errors.push(`missing staging table: ${table}`)
    }
  }

  for (const functionName of REQUIRED_FUNCTIONS) {
    const pattern = new RegExp(
      `create\\s+or\\s+replace\\s+function\\s+content_staging\\.${functionName}\\b`,
      'i',
    )

    if (!pattern.test(sql)) {
      errors.push(`missing staging function: ${functionName}`)
    }
  }

  for (const pattern of FORBIDDEN_PRODUCTION_MUTATIONS) {
    if (pattern.test(sql)) {
      errors.push(
        `forbidden production mutation: ${pattern.source}`,
      )
    }
  }

  if (
    /\bgrant\b[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(
      sql,
    )
  ) {
    errors.push('staging access cannot be granted to app roles')
  }

  if (
    !/revoke\s+all\s+on\s+schema\s+content_staging\s+from\s+authenticated/i.test(
      sql,
    )
  ) {
    errors.push(
      'authenticated access must be revoked from staging schema',
    )
  }

  if (
    !/current_section_id\s+integer\s+not\s+null[\s\S]{0,180}references\s+public\.sections/i.test(
      sql,
    )
  ) {
    errors.push(
      'legacy section rollback reference is required',
    )
  }

  if (
    !/reading_segments[\s\S]*segment_key/i.test(sql)
  ) {
    errors.push(
      'reading_segments must use segment identity',
    )
  }

  return errors
}

export function validateReaderLanguageContract(contract) {
  const errors = []

  if (contract.schema_version !== 1) {
    errors.push('reader language schema_version must be 1')
  }

  if (
    contract.internal_terms?.reading_segment?.meaning ===
    undefined
  ) {
    errors.push('reading_segment definition is required')
  }

  if (
    contract.internal_terms?.editorial_node?.meaning ===
    undefined
  ) {
    errors.push('editorial_node definition is required')
  }

  const language = contract.user_facing_language || {}

  if (language.primary_navigation_action !== 'Continuar') {
    errors.push('primary action must be Continuar')
  }

  if (language.previous_navigation_action !== 'Voltar') {
    errors.push('previous action must be Voltar')
  }

  if (language.unit_noun_when_required !== 'trecho') {
    errors.push('user-facing unit noun must be trecho')
  }

  return errors
}
