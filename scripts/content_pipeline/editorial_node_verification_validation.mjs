export function validateEditorialNodeVerification({
  rows,
  manifest,
}) {
  const errors = []
  const requiredChecks =
    manifest.verification?.required_check_keys || []
  const expectedActual =
    manifest.verification?.expected_actual_values || {}
  const seen = new Set()

  for (const row of rows) {
    if (!row.check_key) {
      errors.push(
        'Every verification row requires check_key.',
      )
      continue
    }

    if (seen.has(row.check_key)) {
      errors.push(
        `Duplicate verification check: ${row.check_key}`,
      )
    }

    seen.add(row.check_key)

    if (row.severity !== 'blocking') {
      errors.push(
        `Verification check must be blocking: ${row.check_key}`,
      )
    }

    if (!row.passed) {
      errors.push(
        `Blocking check failed: ${row.check_key} (${row.actual_value})`,
      )
    }

    if (
      Object.hasOwn(
        expectedActual,
        row.check_key,
      ) &&
      String(row.actual_value) !==
        String(expectedActual[row.check_key])
    ) {
      errors.push(
        `Unexpected actual value for ${row.check_key}: expected ${expectedActual[row.check_key]}, received ${row.actual_value}.`,
      )
    }
  }

  for (const key of requiredChecks) {
    if (!seen.has(key)) {
      errors.push(
        `Missing required verification check: ${key}`,
      )
    }
  }

  const unexpected = [...seen].filter(
    (key) => !requiredChecks.includes(key),
  )

  if (unexpected.length) {
    errors.push(
      `Unexpected verification checks: ${unexpected.join(', ')}`,
    )
  }

  return errors
}
