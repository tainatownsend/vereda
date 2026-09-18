export const APP_FONT_SCALE_MAP = {
  sm: '15px',
  md: '16px',
  lg: '17px',
  xl: '18px',
}

export const THEME_COLORS = {
  light: '#53664E',
  dark: '#2C352F',
}

export function getAppFontSize(scale) {
  return APP_FONT_SCALE_MAP[scale] || APP_FONT_SCALE_MAP.md
}

export function getThemeColor(darkMode) {
  return darkMode ? THEME_COLORS.dark : THEME_COLORS.light
}
