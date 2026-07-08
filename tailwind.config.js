/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Primária: Lavanda / Violeta suave ──
        primary: {
          50:  '#F4F1FA',
          100: '#EEE9F8',
          200: '#DDD6F3',
          300: '#C4B5E8',
          400: '#A98FCC',
          500: '#8B6BBF',
          600: '#7B5EA7',
          700: '#5A3F88',
          800: '#3D2A5C',
          900: '#2A1D3F',
        },
        // ── Âmbar: streak / constância (mantém) ──
        amber: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          400: '#FBC02D',
          500: '#F59E0B',
          600: '#D97706',
        },
        // ── Slate: neutros ──
        slate: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        // ── Dourado: acento quente (estimativa, datas) ──
        gold: {
          100: '#FBF3E6',
          400: '#D4A76A',
          600: '#B08040',
        },
        forest: {
          900: '#2A2035',
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}