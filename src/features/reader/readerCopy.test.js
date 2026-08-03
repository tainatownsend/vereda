import { describe, expect, it } from 'vitest'

import {
  getReaderIndexFallbackLabel,
  getReaderPrimaryAction,
  READER_COPY,
} from '@/features/reader/readerCopy'

describe('Reader copy', () => {
  it('uses action-oriented language for normal reading', () => {
    expect(
      getReaderPrimaryAction({
        isChapterIntro: false,
        isFinalReadingUnit: false,
      }),
    ).toEqual(READER_COPY.actions.continue)
  })

  it('uses the chapter action for chapter introductions', () => {
    expect(
      getReaderPrimaryAction({
        isChapterIntro: true,
        isFinalReadingUnit: false,
      }),
    ).toEqual(READER_COPY.actions.chapterIntro)
  })

  it('prioritizes the final-book action on the final unit', () => {
    expect(
      getReaderPrimaryAction({
        isChapterIntro: true,
        isFinalReadingUnit: true,
      }),
    ).toEqual(READER_COPY.actions.final)
  })

  it('uses trecho as the fallback Reader noun', () => {
    expect(getReaderIndexFallbackLabel(12)).toBe('Trecho 12')
  })
})
