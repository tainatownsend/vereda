// Positions are reading units, not necessarily chapters or questions.
export function getBookProgress(progress, totalSections) {
  const total = Math.max(0, Math.floor(Number(totalSections) || 0))
  const completed = Boolean(progress?.completed_at || progress?.book_completed)
  const read = completed ? total : Math.min(total, Math.max(0, Math.floor(Number(progress?.current_section) || 1) - 1))
  const percent = completed ? 100 : total ? Math.min(99, Math.round(read / total * 100)) : 0
  return { total, read, percent, completed, started: Boolean(progress) }
}
