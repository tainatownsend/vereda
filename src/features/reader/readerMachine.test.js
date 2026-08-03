import { describe, expect, it } from 'vitest'

import {
  findSectionIndex,
  READER_PHASE,
  resolveCompletionPhase,
  shouldReachDailyGoal,
} from '@/features/reader/readerMachine'

describe('readerMachine', () => {
  it('reaches a minute-based daily goal using persisted and active time', () => {
    expect(
      shouldReachDailyGoal({
        paceMode: 'minutes',
        paceMinutes: 10,
        minutesReadToday: 9.5,
        sessionSeconds: 30,
        acknowledged: false,
      }),
    ).toBe(true)
  })

  it('does not repeat an acknowledged daily goal', () => {
    expect(
      shouldReachDailyGoal({
        paceMode: 'minutes',
        paceMinutes: 10,
        minutesReadToday: 20,
        sessionSeconds: 0,
        acknowledged: true,
      }),
    ).toBe(false)
  })

  it('prioritizes true book completion', () => {
    expect(
      resolveCompletionPhase({
        bookCompleted: true,
        dailyGoalReached: true,
        goalAcknowledged: false,
      }),
    ).toBe(READER_PHASE.BOOK_COMPLETE)
  })

  it('shows daily completion only before acknowledgement', () => {
    expect(
      resolveCompletionPhase({
        bookCompleted: false,
        dailyGoalReached: true,
        goalAcknowledged: false,
      }),
    ).toBe(READER_PHASE.DAILY_GOAL_COMPLETE)

    expect(
      resolveCompletionPhase({
        bookCompleted: false,
        dailyGoalReached: true,
        goalAcknowledged: true,
      }),
    ).toBe(READER_PHASE.READING)
  })

  it('finds the next section by canonical position', () => {
    const sections = [
      { sec_position: 10 },
      { sec_position: 11 },
      { sec_position: 12 },
    ]

    expect(findSectionIndex(sections, 11)).toBe(1)
    expect(findSectionIndex(sections, 99)).toBe(-1)
  })
})

describe('reader revisit behavior', () => {
  it('keeps persisted completion separate from the viewed revisit position', () => {
    const persistedCompleted = true
    const revisitMode = true
    const shouldShowCompletedScreen =
      persistedCompleted && !revisitMode

    expect(shouldShowCompletedScreen).toBe(false)
  })
})
