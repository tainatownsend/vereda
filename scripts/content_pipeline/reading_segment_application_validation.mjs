export function expectedReadingSegmentChecks(
  manifest,
) {
  return [
    'application-roles-denied',
    'audit-event-count',
    ...manifest.books.map(
      (book) =>
        `book-${book.book_id}-segment-count`,
    ),
    'boundary-review-only',
    'boundary-version-one',
    'content-remains-null',
    'dependency-snapshot-count',
    'dry-run-result-count',
    'editorial-node-references-valid',
    'end-locators-present',
    'migration-run-status',
    'production-section-count',
    'reading-segment-total',
    'rights-status',
    'segment-index-count-one',
    'segment-key-uniqueness',
    'segment-order-contiguous',
    'start-locators-present',
    'successor-mapping-count',
  ].sort()
}

export function expectedReadingSegmentValues(
  manifest,
) {
  return Object.fromEntries([
    ['application-roles-denied', 'false'],
    ['audit-event-count', '1'],
    ...manifest.books.map(
      (book) => [
        `book-${book.book_id}-segment-count`,
        String(book.proposal_count),
      ],
    ),
    ['boundary-review-only', '0'],
    ['boundary-version-one', '0'],
    ['content-remains-null', '0'],
    ['dependency-snapshot-count', '0'],
    ['dry-run-result-count', '0'],
    ['editorial-node-references-valid', '0'],
    ['end-locators-present', '0'],
    ['migration-run-status', 'reviewing'],
    ['production-section-count', '908'],
    [
      'reading-segment-total',
      String(
        manifest.totals.segment_proposal_count,
      ),
    ],
    ['rights-status', 'blocked'],
    ['segment-index-count-one', '0'],
    ['segment-key-uniqueness', '0'],
    ['segment-order-contiguous', '0'],
    ['start-locators-present', '0'],
    ['successor-mapping-count', '0'],
  ])
}

export function validateReadingSegmentApplication({
  rows,
  manifest,
}) {
  const errors = []
  const required =
    expectedReadingSegmentChecks(manifest)
  const expected =
    expectedReadingSegmentValues(manifest)
  const seen = new Set()

  for (const row of rows) {
    if (!row.check_key) {
      errors.push(
        'Every application check requires check_key.',
      )
      continue
    }

    if (seen.has(row.check_key)) {
      errors.push(
        `Duplicate application check: ${row.check_key}`,
      )
    }

    seen.add(row.check_key)

    if (row.severity !== 'blocking') {
      errors.push(
        `Application check must be blocking: ${row.check_key}`,
      )
    }

    if (!row.passed) {
      errors.push(
        `Blocking check failed: ${row.check_key} (${row.actual_value})`,
      )
    }

    if (
      Object.hasOwn(expected, row.check_key) &&
      String(row.actual_value) !==
        expected[row.check_key]
    ) {
      errors.push(
        `Unexpected actual value for ${row.check_key}: expected ${expected[row.check_key]}, received ${row.actual_value}.`,
      )
    }
  }

  for (const checkKey of required) {
    if (!seen.has(checkKey)) {
      errors.push(
        `Missing required application check: ${checkKey}`,
      )
    }
  }

  const unexpected = [...seen].filter(
    (checkKey) =>
      !required.includes(checkKey),
  )

  if (unexpected.length) {
    errors.push(
      `Unexpected application checks: ${unexpected.join(', ')}`,
    )
  }

  return errors
}
