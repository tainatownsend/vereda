import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  getReaderPrimaryAction,
  READER_COPY,
} from '../../src/features/reader/readerCopy'

const readText = (relativePath) =>
  readFileSync(
    new URL(relativePath, import.meta.url),
    'utf8',
  )

const contract = JSON.parse(
  readText(
    '../../content/migration/reader-language-contract.json',
  ),
)

const readerSources = [
  '../../src/pages/ReaderPage.jsx',
  '../../src/features/reader/BookIndexPanel.jsx',
  '../../src/features/reader/bookIndex.js',
  '../../src/features/reader/readerCopy.js',
  '../../src/features/reader/readerService.js',
  '../../src/features/reader/useReadingSession.js',
].map(readText)

describe('Reader language contract implementation', () => {
  it('marks the contract as implemented', () => {
    expect(contract.status).toBe('implemented')
  })

  it('keeps the approved visible actions aligned with code', () => {
    expect(READER_COPY.actions.previous.label).toBe(
      contract.user_facing_language
        .previous_navigation_action,
    )
    expect(READER_COPY.actions.continue.label).toBe(
      contract.user_facing_language
        .primary_navigation_action,
    )
    expect(READER_COPY.actions.chapterIntro.label).toBe(
      contract.user_facing_language
        .chapter_intro_action,
    )
    expect(READER_COPY.actions.final.label).toBe(
      contract.user_facing_language.book_final_action,
    )
  })

  it('keeps the approved accessibility labels aligned', () => {
    expect(
      READER_COPY.actions.previous.ariaLabel,
    ).toBe(
      contract.accessibility.previous_button_label,
    )
    expect(
      READER_COPY.actions.continue.ariaLabel,
    ).toBe(
      contract.accessibility.continue_button_label,
    )
    expect(READER_COPY.actions.final.ariaLabel).toBe(
      contract.accessibility.final_button_label,
    )
  })

  it('uses the approved daily-goal and continuation messages', () => {
    expect(READER_COPY.dailyGoalNotice).toBe(
      contract.user_facing_language.daily_goal_message,
    )
    expect(READER_COPY.missingContinuation).toBe(
      contract.user_facing_language.missing_next_message,
    )
  })

  it('removes Portuguese section terminology from Reader-facing source', () => {
    for (const source of readerSources) {
      expect(source).not.toMatch(/\bseç(?:ão|ões)\b/i)
    }
  })

  it('uses the final action for the last reading unit', () => {
    expect(
      getReaderPrimaryAction({
        isChapterIntro: false,
        isFinalReadingUnit: true,
      }).label,
    ).toBe('Concluir obra')
  })
})
