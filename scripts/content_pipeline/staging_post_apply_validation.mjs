export const REQUIRED_POST_APPLY_CHECKS = Object.freeze([
  'staging-schema-exists',
  'staging-table-count',
  'staging-function-count',
  'staging-view-count',
  'application-roles-denied',
  'service-role-has-usage',
  'staging-is-empty',
  'production-section-count',
])

export function validatePostApply({
  rows,
  expectedSectionCount = 908,
}) {
  const errors = []
  const seen = new Set()

  for (const row of rows) {
    if (!row.check_key) {
      errors.push('Every row must have check_key.')
      continue
    }

    if (seen.has(row.check_key)) {
      errors.push(
        `Duplicate post-application check: ${row.check_key}`,
      )
    }

    seen.add(row.check_key)

    if (row.severity !== 'blocking') {
      errors.push(
        `Post-application check must be blocking: ${row.check_key}`,
      )
    }

    if (!row.passed) {
      errors.push(
        `Blocking check failed: ${row.check_key} (${row.actual_value})`,
      )
    }
  }

  for (const requiredCheck of REQUIRED_POST_APPLY_CHECKS) {
    if (!seen.has(requiredCheck)) {
      errors.push(
        `Missing required post-application check: ${requiredCheck}`,
      )
    }
  }

  const unexpectedChecks = [...seen].filter(
    (check) =>
      !REQUIRED_POST_APPLY_CHECKS.includes(check),
  )

  if (unexpectedChecks.length) {
    errors.push(
      `Unexpected post-application checks: ${unexpectedChecks.join(', ')}`,
    )
  }

  const valueOf = (checkKey) =>
    rows.find((row) => row.check_key === checkKey)

  const sectionCount = Number(
    valueOf('production-section-count')?.actual_value,
  )
  const stagingRowCount = Number(
    valueOf('staging-is-empty')?.actual_value,
  )
  const applicationRolesActual =
    valueOf('application-roles-denied')?.actual_value
  const serviceRoleActual =
    valueOf('service-role-has-usage')?.actual_value

  if (sectionCount !== expectedSectionCount) {
    errors.push(
      `Production section count drifted: expected ${expectedSectionCount}, received ${sectionCount}.`,
    )
  }

  if (stagingRowCount !== 0) {
    errors.push(
      `Staging must be empty immediately after foundation application; received ${stagingRowCount} rows.`,
    )
  }

  if (applicationRolesActual !== 'false') {
    errors.push(
      'Application roles must not have staging schema access.',
    )
  }

  if (serviceRoleActual !== 'true') {
    errors.push(
      'service_role must have staging schema usage.',
    )
  }

  return {
    errors,
    sectionCount,
    stagingRowCount,
    applicationRolesDenied:
      applicationRolesActual === 'false',
    serviceRoleHasUsage:
      serviceRoleActual === 'true',
  }
}
