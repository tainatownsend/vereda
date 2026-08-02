/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#FAFBF8',
        surface: '#FFFFFF',
        'surface-soft': '#F3F7F1',
        ink: '#203028',
        muted: '#627069',
        line: '#DDE4DC',
        focus: '#718F74',
        night: {
          DEFAULT: '#111713',
          surface: '#18201B',
          ink: '#F2F5F0',
          muted: '#A8B4AA',
          line: '#2C3730',
        },
        sage: {
          50: '#F3F7F1',
          100: '#E7EFE4',
          200: '#D1DFCE',
          300: '#B3C9B1',
          400: '#91AD92',
          500: '#718F74',
          600: '#58745D',
          700: '#465D4B',
          800: '#374A3C',
          900: '#2D3D32',
          950: '#17221B',
        },

        /*
         * Legacy aliases.
         * Existing screens keep working while future PRs migrate them to VES.
         */
        primary: {
          50: '#F3F7F1',
          100: '#E7EFE4',
          200: '#D1DFCE',
          300: '#B3C9B1',
          400: '#91AD92',
          500: '#718F74',
          600: '#58745D',
          700: '#465D4B',
          800: '#374A3C',
          900: '#2D3D32',
        },
        forest: {
          900: '#203028',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          400: '#FBC02D',
          500: '#F59E0B',
          600: '#D97706',
        },
        gold: {
          100: '#FBF3E6',
          400: '#D4A76A',
          600: '#B08040',
        },
      },
      fontFamily: {
        display: ['"Newsreader"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        vesSm: '0.75rem',
        vesMd: '1.25rem',
        vesLg: '1.75rem',
      },
      boxShadow: {
        editorial: '0 16px 50px rgba(41, 61, 47, 0.08)',
      },
      transitionDuration: {
        100: '100ms',
        150: '150ms',
        200: '200ms',
      },
    },
  },
  plugins: [],
}
