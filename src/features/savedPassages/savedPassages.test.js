import { describe, expect, it } from 'vitest'

import {
  addSavedPassageId,
  getSavedPassageIds,
  isPassageSaved,
  normalizeSavedPassageIds,
  removeSavedPassageId,
} from './savedPassages'

describe('saved passages', () => {
  it('normalizes metadata to unique positive integer IDs', () => {
    expect(normalizeSavedPassageIds([4, '4', 0, -2, '8', null, 9.5])).toEqual([4, 8])
  })

  it('puts the most recently saved passage first without duplicates', () => {
    expect(addSavedPassageId([10, 20, 30], 20)).toEqual([20, 10, 30])
    expect(addSavedPassageId([10, 20], 40)).toEqual([40, 10, 20])
  })

  it('removes only the requested passage', () => {
    expect(removeSavedPassageId([10, 20, 30], 20)).toEqual([10, 30])
  })

  it('reads saved state from Supabase user metadata', () => {
    const user = { user_metadata: { saved_passage_ids: [7, 9] } }
    expect(getSavedPassageIds(user)).toEqual([7, 9])
    expect(isPassageSaved(user, 9)).toBe(true)
    expect(isPassageSaved(user, 12)).toBe(false)
  })
})
