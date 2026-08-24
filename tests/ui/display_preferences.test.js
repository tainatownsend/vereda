import { describe, expect, it } from 'vitest'

import {
  APP_FONT_SCALE_MAP,
  THEME_COLORS,
  getAppFontSize,
  getThemeColor,
} from '@/features/ui/displayPreferences'

describe('display preference contract', () => {
  it('keeps the largest app scale within a mobile-safe range', () => {
    const largest = Math.max(
      ...Object.values(APP_FONT_SCALE_MAP).map((value) => Number.parseInt(value, 10)),
    )

    expect(largest).toBeLessThanOrEqual(18)
  })

  it('falls back to the medium scale for an unknown preference', () => {
    expect(getAppFontSize('unknown')).toBe(APP_FONT_SCALE_MAP.md)
  })

  it('uses the approved Caminho de Luz browser colors', () => {
    expect(getThemeColor(false)).toBe(THEME_COLORS.light)
    expect(getThemeColor(true)).toBe(THEME_COLORS.dark)
    expect(THEME_COLORS).toEqual({ light: '#4F6757', dark: '#182019' })
  })
})
