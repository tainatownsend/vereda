import theme from '../../tailwind.config.js'

const palette = theme.theme.extend.colors
export const colors = {
  canvas: palette.canvas,
  surface: palette.surface,
  surfaceSoft: palette['surface-soft'],
  ink: palette.ink,
  muted: palette.muted,
  line: palette.line,
  focus: palette.focus,
  sage: palette.sage,
  gold: palette.gold,
  night: { ...palette.night, canvas: palette.night.DEFAULT },
}

export const typography = {
  display: '"Literata", Georgia, serif',
  body: '"Inter", system-ui, sans-serif',
}

export const spacing = {
  1: '0.25rem',
  2: '0.5rem',
  3: '1rem',
  4: '1.5rem',
  5: '2rem',
  6: '2.5rem',
  7: '3rem',
  8: '4rem',
  9: '5rem',
  10: '6rem',
}

export const radius = {
  small: '0.75rem',
  medium: '1.25rem',
  large: '1.75rem',
  pill: '999px',
}

export const motion = {
  fast: '100ms',
  standard: '150ms',
  slow: '200ms',
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
}
