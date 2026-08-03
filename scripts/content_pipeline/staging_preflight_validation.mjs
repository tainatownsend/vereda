export const REQUIRED_PREFLIGHT_CHECKS = Object.freeze([
  'section-total',
  'duplicate-section-positions',
  'orphan-reading-sessions',
  'reading-session-book-mismatches',
  'progress-position-out-of-range',
  'aggregate-dependencies',
])

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  const source = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (quoted) {
      if (
        character === '"' &&
        source[index + 1] === '"'
      ) {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }

      continue
    }

    if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (character !== '\r') {
      field += character
    }
  }

  if (quoted) {
    throw new Error('CSV contains an unterminated quoted field.')
  }

  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  const nonEmptyRows = rows.filter(
    (values) =>
      values.some((value) => value.trim() !== ''),
  )

  if (nonEmptyRows.length < 2) {
    throw new Error(
      'CSV must contain a header and at least one data row.',
    )
  }

  const headers = nonEmptyRows[0].map(
    (header) => header.trim(),
  )

  if (new Set(headers).size !== headers.length) {
    throw new Error('CSV contains duplicate headers.')
  }

  return nonEmptyRows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}.`,
      )
    }

    return Object.fromEntries(
      headers.map((header, columnIndex) => [
        header,
        values[columnIndex],
      ]),
    )
  })
}

export function parseBoolean(value) {
  const normalized = String(value).trim().toLowerCase()

  if (normalized === 'true' || normalized === 't') {
    return true
  }

  if (normalized === 'false' || normalized === 'f') {
    return false
  }

  throw new Error(`Invalid boolean value: ${value}`)
}

export function parseDetails(value) {
  if (!value || !value.trim()) return {}

  const parsed = JSON.parse(value)

  if (
    parsed === null ||
    Array.isArray(parsed) ||
    typeof parsed !== 'object'
  ) {
    throw new Error('details must be a JSON object.')
  }

  return parsed
}

export function normalizePreflightRows(rows) {
  const requiredHeaders = [
    'check_key',
    'severity',
    'passed',
    'actual_value',
    'details',
  ]

  if (!rows.length) {
    throw new Error('Preflight CSV has no rows.')
  }

  for (const header of requiredHeaders) {
    if (!(header in rows[0])) {
      throw new Error(
        `Preflight CSV is missing header: ${header}`,
      )
    }
  }

  return rows.map((row) => ({
    check_key: row.check_key.trim(),
    severity: row.severity.trim(),
    passed: parseBoolean(row.passed),
    actual_value: row.actual_value.trim(),
    details: parseDetails(row.details),
  }))
}

export function validatePreflight({
  rows,
  expectedSectionCount,
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
        `Duplicate preflight check: ${row.check_key}`,
      )
    }

    seen.add(row.check_key)

    if (!['blocking', 'warning', 'info'].includes(row.severity)) {
      errors.push(
        `Invalid severity for ${row.check_key}: ${row.severity}`,
      )
    }
  }

  for (const requiredCheck of REQUIRED_PREFLIGHT_CHECKS) {
    if (!seen.has(requiredCheck)) {
      errors.push(
        `Missing required preflight check: ${requiredCheck}`,
      )
    }
  }

  const unexpectedChecks = [...seen].filter(
    (check) =>
      !REQUIRED_PREFLIGHT_CHECKS.includes(check),
  )

  if (unexpectedChecks.length) {
    errors.push(
      `Unexpected preflight checks: ${unexpectedChecks.join(', ')}`,
    )
  }

  const blockingFailures = rows.filter(
    (row) =>
      row.severity === 'blocking' &&
      !row.passed,
  )

  for (const row of blockingFailures) {
    errors.push(
      `Blocking check failed: ${row.check_key} (${row.actual_value})`,
    )
  }

  const sectionTotal = rows.find(
    (row) => row.check_key === 'section-total',
  )
  const productionSectionCount = Number(
    sectionTotal?.actual_value,
  )

  if (!Number.isInteger(productionSectionCount)) {
    errors.push(
      'section-total actual_value must be an integer.',
    )
  } else if (
    productionSectionCount !== expectedSectionCount
  ) {
    errors.push(
      `Production section count drifted: expected ${expectedSectionCount}, received ${productionSectionCount}.`,
    )
  }

  const aggregateDependencies = rows.find(
    (row) =>
      row.check_key === 'aggregate-dependencies',
  )

  if (
    aggregateDependencies?.details
      ?.contains_user_identifiers !== false
  ) {
    errors.push(
      'Aggregate dependency evidence must confirm that user identifiers are absent.',
    )
  }

  for (const key of [
    'progress_rows',
    'reading_sessions',
    'users_with_sessions',
  ]) {
    const value =
      aggregateDependencies?.details?.[key]

    if (
      !Number.isInteger(value) ||
      value < 0
    ) {
      errors.push(
        `aggregate-dependencies details.${key} must be a nonnegative integer.`,
      )
    }
  }

  return {
    errors,
    blockingFailures,
    productionSectionCount,
    snapshotRowCountMatches:
      productionSectionCount === expectedSectionCount,
  }
}
