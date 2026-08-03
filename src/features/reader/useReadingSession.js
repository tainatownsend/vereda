import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  findSectionIndex,
  READER_PHASE,
  resolveCompletionPhase,
  shouldReachDailyGoal,
} from '@/features/reader/readerMachine'
import {
  completeSection,
  getBookIndexSections,
  getBookLastPosition,
  getChapterSections,
  getLocalDate,
  getNextSection,
  getPreviousSection,
  getReaderState,
  getSectionsFromPosition,
} from '@/features/reader/readerService'

export function useReadingSession({
  userId,
  bookId,
  revisitMode = false,
}) {
  const [phase, setPhase] = useState(READER_PHASE.LOADING)
  const [sections, setSections] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [readerState, setReaderState] = useState(null)
  const [lastPosition, setLastPosition] = useState(0)
  const [chapterSections, setChapterSections] = useState([])
  const [bookIndexSections, setBookIndexSections] = useState([])
  const [indexLoading, setIndexLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [goalNoticeVisible, setGoalNoticeVisible] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const readDateRef = useRef(getLocalDate())
  const sectionStartedAtRef = useRef(Date.now())
  const goalAcknowledgedRef = useRef(false)
  const goalReachedRef = useRef(false)
  const nextPositionRef = useRef(null)

  const positionStorageKey = useMemo(() => {
    if (!userId || !bookId) return null
    return `vereda-reader-position:${userId}:${bookId}`
  }, [bookId, userId])

  const currentSection = sections[currentIndex] || null

  const restartSectionTimer = useCallback(() => {
    sectionStartedAtRef.current = Date.now()
    setElapsedSeconds(0)
  }, [])

  const load = useCallback(async () => {
    if (!userId || !bookId) return

    setPhase(READER_PHASE.LOADING)
    setError(null)
    readDateRef.current = getLocalDate()
    goalAcknowledgedRef.current = false
    goalReachedRef.current = false
    nextPositionRef.current = null

    try {
      const [state, bookLastPosition] = await Promise.all([
        getReaderState({
          userId,
          bookId,
          readDate: readDateRef.current,
        }),
        getBookLastPosition(bookId),
      ])

      setReaderState(state)
      setLastPosition(bookLastPosition)

      if (state.book_completed && !revisitMode) {
        setSections([])
        setPhase(READER_PHASE.BOOK_COMPLETE)
        return
      }

      const storedPosition = positionStorageKey
        ? Number(window.sessionStorage.getItem(positionStorageKey) || 0)
        : 0

      const storedPositionIsValid =
        storedPosition >= 1 &&
        storedPosition <= bookLastPosition

      const preferredPosition = storedPositionIsValid
        ? storedPosition
        : state.book_completed && revisitMode
          ? 1
          : state.current_section

      const loadedSections = await getSectionsFromPosition({
        bookId,
        position: preferredPosition,
      })

      setSections(loadedSections)
      setCurrentIndex(0)

      // A meta já cumprida antes de abrir esta sessão não deve bloquear
      // novamente a pessoa.
      goalAcknowledgedRef.current = Boolean(state.daily_goal_reached)
      goalReachedRef.current = Boolean(state.daily_goal_reached)

      setPhase(READER_PHASE.READING)
      restartSectionTimer()
    } catch (loadError) {
      setError(loadError)
      setPhase(READER_PHASE.ERROR)
    }
  }, [
    bookId,
    positionStorageKey,
    restartSectionTimer,
    revisitMode,
    userId,
  ])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!positionStorageKey || !currentSection?.sec_position) return

    window.sessionStorage.setItem(
      positionStorageKey,
      String(currentSection.sec_position),
    )
  }, [currentSection?.sec_position, positionStorageKey])

  useEffect(() => {
    if (phase !== READER_PHASE.READING) return undefined

    const interval = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - sectionStartedAtRef.current) / 1000),
        ),
      )
    }, 1000)

    return () => window.clearInterval(interval)
  }, [phase, currentSection?.section_id])

  useEffect(() => {
    if (
      phase !== READER_PHASE.READING ||
      !readerState ||
      goalReachedRef.current
    ) {
      return
    }

    const reached = shouldReachDailyGoal({
      paceMode: readerState.pace_mode,
      paceMinutes: readerState.pace_minutes,
      minutesReadToday: readerState.minutes_read_on_date,
      sessionSeconds: elapsedSeconds,
      acknowledged: goalAcknowledgedRef.current,
    })

    if (reached) {
      goalReachedRef.current = true
      setGoalNoticeVisible(true)
    }
  }, [elapsedSeconds, phase, readerState])

  useEffect(() => {
    if (!goalNoticeVisible) return undefined

    const timeout = window.setTimeout(() => {
      setGoalNoticeVisible(false)
    }, 7000)

    return () => window.clearTimeout(timeout)
  }, [goalNoticeVisible])

  useEffect(() => {
    if (!currentSection?.chapter_label || !bookId) {
      setChapterSections([])
      return undefined
    }

    let active = true

    getChapterSections({
      bookId,
      chapterLabel: currentSection.chapter_label,
      partTitle: currentSection.part_title,
    })
      .then((data) => {
        if (active) setChapterSections(data)
      })
      .catch(() => {
        if (active) setChapterSections([])
      })

    return () => {
      active = false
    }
  }, [
    bookId,
    currentSection?.chapter_label,
    currentSection?.part_title,
  ])

  const loadBookIndex = useCallback(async () => {
    if (!bookId || bookIndexSections.length || indexLoading) return

    setIndexLoading(true)

    try {
      const data = await getBookIndexSections(bookId)
      setBookIndexSections(data)
    } catch (indexError) {
      setError(indexError)
      setPhase(READER_PHASE.ERROR)
    } finally {
      setIndexLoading(false)
    }
  }, [bookId, bookIndexSections.length, indexLoading])

  const jumpToSection = useCallback(
    async (section) => {
      if (!bookId || !section?.sec_position) return

      try {
        let targetIndex = findSectionIndex(
          sections,
          section.sec_position,
        )

        if (targetIndex === -1) {
          const targetSections = await getSectionsFromPosition({
            bookId,
            position: section.sec_position,
          })

          if (!targetSections.length) {
            throw new Error('A seção escolhida não pôde ser carregada.')
          }

          setSections(targetSections)
          targetIndex = 0
        }

        setCurrentIndex(targetIndex)
        setPhase(READER_PHASE.READING)
        window.scrollTo({ top: 0, behavior: 'auto' })
        restartSectionTimer()
      } catch (jumpError) {
        setError(jumpError)
        setPhase(READER_PHASE.ERROR)
      }
    },
    [bookId, restartSectionTimer, sections],
  )

  const completeCurrentSection = useCallback(async () => {
    if (
      !userId ||
      !bookId ||
      !currentSection ||
      saving ||
      phase !== READER_PHASE.READING
    ) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const durationSeconds = Math.max(
        elapsedSeconds,
        Math.floor((Date.now() - sectionStartedAtRef.current) / 1000),
      )

      const result = await completeSection({
        userId,
        bookId,
        sectionId: currentSection.section_id,
        durationSeconds,
        readDate: readDateRef.current,
      })

      const minutesReadOnDate = Number(result.minutes_read_on_date || 0)
      const dailyGoalReached =
        goalReachedRef.current ||
        shouldReachDailyGoal({
          paceMode: readerState?.pace_mode,
          paceMinutes: readerState?.pace_minutes,
          minutesReadToday: minutesReadOnDate,
          sessionSeconds: 0,
          acknowledged: goalAcknowledgedRef.current,
        })

      goalReachedRef.current = dailyGoalReached
      nextPositionRef.current = result.next_position

      setReaderState((previous) => ({
        ...previous,
        current_section: result.next_position,
        minutes_read_on_date: minutesReadOnDate,
        daily_goal_reached: dailyGoalReached,
        book_completed: result.book_completed,
      }))

      const nextPhase = resolveCompletionPhase({
        bookCompleted: result.book_completed,
        dailyGoalReached,
        goalAcknowledged: goalAcknowledgedRef.current,
      })

      if (nextPhase !== READER_PHASE.READING) {
        if (
          nextPhase === READER_PHASE.BOOK_COMPLETE &&
          positionStorageKey
        ) {
          window.sessionStorage.removeItem(positionStorageKey)
        }

        setGoalNoticeVisible(false)
        setPhase(nextPhase)
        return
      }

      const immediateNextSection = await getNextSection({
        bookId,
        position: currentSection.sec_position,
      })

      if (!immediateNextSection) {
        setPhase(READER_PHASE.BOOK_COMPLETE)
        return
      }

      let nextIndex = findSectionIndex(
        sections,
        immediateNextSection.sec_position,
      )

      if (nextIndex === -1) {
        const nextSections = await getSectionsFromPosition({
          bookId,
          position: immediateNextSection.sec_position,
        })

        if (!nextSections.length) {
          throw new Error('A próxima seção não pôde ser carregada.')
        }

        setSections(nextSections)
        nextIndex = 0
      }

      setCurrentIndex(nextIndex)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      restartSectionTimer()
    } catch (saveError) {
      setError(saveError)
      setPhase(READER_PHASE.ERROR)
    } finally {
      setSaving(false)
    }
  }, [
    bookId,
    currentSection,
    elapsedSeconds,
    phase,
    positionStorageKey,
    readerState,
    restartSectionTimer,
    saving,
    sections,
    userId,
  ])

  const continueAfterGoal = useCallback(async () => {
    if (!bookId) return

    goalAcknowledgedRef.current = true
    goalReachedRef.current = true
    setGoalNoticeVisible(false)
    setError(null)

    const nextPosition =
      nextPositionRef.current || readerState?.current_section

    try {
      let nextIndex = findSectionIndex(sections, nextPosition)

      if (nextIndex === -1) {
        const nextSections = await getSectionsFromPosition({
          bookId,
          position: nextPosition,
        })

        if (!nextSections.length) {
          setPhase(READER_PHASE.BOOK_COMPLETE)
          return
        }

        setSections(nextSections)
        nextIndex = 0
      }

      setCurrentIndex(nextIndex)
      setPhase(READER_PHASE.READING)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      restartSectionTimer()
    } catch (continueError) {
      setError(continueError)
      setPhase(READER_PHASE.ERROR)
    }
  }, [bookId, readerState?.current_section, restartSectionTimer, sections])

  const goToPrevious = useCallback(async () => {
    if (!bookId || !currentSection) return

    try {
      if (currentIndex > 0) {
        setCurrentIndex((index) => index - 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        restartSectionTimer()
        return
      }

      const previous = await getPreviousSection({
        bookId,
        position: currentSection.sec_position,
      })

      if (previous) {
        setSections((existing) => [previous, ...existing])
        setCurrentIndex(0)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        restartSectionTimer()
      }
    } catch (previousError) {
      setError(previousError)
      setPhase(READER_PHASE.ERROR)
    }
  }, [bookId, currentIndex, currentSection, restartSectionTimer])

  const dismissError = useCallback(() => {
    setError(null)
    setPhase(READER_PHASE.READING)
    restartSectionTimer()
  }, [restartSectionTimer])

  const sectionsReadInWindow = useMemo(
    () =>
      sections.filter((section) => section.kind === 'content').length,
    [sections],
  )

  return {
    phase,
    sections,
    currentIndex,
    currentSection,
    chapterSections,
    bookIndexSections,
    indexLoading,
    readerState,
    lastPosition,
    saving,
    error,
    goalNoticeVisible,
    elapsedSeconds,
    sectionsReadInWindow,
    reload: load,
    loadBookIndex,
    jumpToSection,
    dismissError,
    completeCurrentSection,
    continueAfterGoal,
    goToPrevious,
  }
}
