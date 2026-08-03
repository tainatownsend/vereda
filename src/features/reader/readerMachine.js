export const READER_PHASE = Object.freeze({
  LOADING: 'loading',
  READING: 'reading',
  DAILY_GOAL_COMPLETE: 'daily-goal-complete',
  BOOK_COMPLETE: 'book-complete',
  ERROR: 'error',
})

export function shouldReachDailyGoal({
  paceMode,
  paceMinutes,
  minutesReadToday,
  sessionSeconds,
  acknowledged,
}) {
  if (acknowledged || paceMode !== 'minutes') return false

  const goalMinutes = Number(paceMinutes) || 0
  if (goalMinutes <= 0) return false

  const totalSeconds =
    Number(minutesReadToday || 0) * 60 + Number(sessionSeconds || 0)

  return totalSeconds >= goalMinutes * 60
}

export function resolveCompletionPhase({
  bookCompleted,
  dailyGoalReached,
  goalAcknowledged,
}) {
  if (bookCompleted) return READER_PHASE.BOOK_COMPLETE

  if (dailyGoalReached && !goalAcknowledged) {
    return READER_PHASE.DAILY_GOAL_COMPLETE
  }

  return READER_PHASE.READING
}

export function findSectionIndex(sections, position) {
  return sections.findIndex(
    (section) => Number(section.sec_position) === Number(position),
  )
}
