const FORBIDDEN_KEYS = new Set([
  'content',
  'raw_text',
  'full_text',
  'excerpt',
  'user_id',
  'email',
])

export function validateComparisonSummary(summary) {
  const errors = []

  if (summary.schema_version !== 1) {
    errors.push('schema_version must be 1')
  }

  if (summary.book_count !== 5) {
    errors.push('book_count must be 5')
  }

  if (!Array.isArray(summary.books)) {
    errors.push('books must be an array')
    return errors
  }

  const ids = new Set()

  for (const entry of summary.books) {
    const bookId = entry.book?.book_id

    if (!bookId) {
      errors.push('book_id is required')
    }

    if (ids.has(bookId)) {
      errors.push(`duplicate book_id: ${bookId}`)
    }

    ids.add(bookId)

    if (
      !Number.isInteger(
        entry.summary?.current_record_count,
      )
    ) {
      errors.push(
        `invalid current_record_count for book ${bookId}`,
      )
    }
  }

  const serialized = JSON.stringify(summary)

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
