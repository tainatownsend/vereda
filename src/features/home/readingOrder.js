function getLastReadTimestamp(progressEntry) {
  const timestamp = Date.parse(progressEntry?.last_read_at || '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function getActiveBooksByLastRead(books, progress) {
  return books
    .map((book, originalIndex) => ({
      book,
      originalIndex,
      progressEntry: progress[book.id],
    }))
    .filter(
      ({ progressEntry }) =>
        progressEntry && !progressEntry.completed_at,
    )
    .sort((left, right) => {
      const recencyDifference =
        getLastReadTimestamp(right.progressEntry) -
        getLastReadTimestamp(left.progressEntry)

      return recencyDifference || left.originalIndex - right.originalIndex
    })
    .map(({ book }) => book)
}
