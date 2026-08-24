/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#F8F4EE',
        surface: '#FFFCF7',
        'surface-soft': '#EFE6DA',
        ink: '#2F372F',
        muted: '#697169',
        line: '#DDD1C3',
        focus: '#6D8B74',
        clay: {
          50: '#FBF1EC',
          100: '#F6E0D5',
          200: '#EDC3AE',
          300: '#E0A183',
          400: '#D38E6C',
          500: '#C98C6B',
          600: '#AB6D50',
          700: '#895642',
          800: '#6E4739',
          900: '#593B32',
          950: '#2C211D',
        },
        night: {
          DEFAULT: '#182019',
          surface: '#202A22',
          ink: '#F7F1E8',
          muted: '#B5BBAF',
          line: '#38453B',
        },
        sage: {
          50: '#F2F5F0',
          100: '#E4EBE1',
          200: '#CAD7C7',
          300: '#AFC2AD',
          400: '#8FA68F',
          500: '#748D78',
          600: '#5E7664',
          700: '#4F6757',
          800: '#405348',
          900: '#34443B',
          950: '#1D2821',
        },

        /*
         * Legacy aliases.
         * Existing screens keep working while future PRs migrate them to VES.
         */
        primary: {
          50: '#F2F5F0',
          100: '#E4EBE1',
          200: '#CAD7C7',
          300: '#AFC2AD',
          400: '#8FA68F',
          500: '#748D78',
          600: '#5E7664',
          700: '#4F6757',
          800: '#405348',
          900: '#34443B',
        },
        forest: {
          900: '#2F372F',
        },
        amber: {
          50: '#FFF8EE',
          100: '#FBEBCF',
          200: '#F2D8A8',
          400: '#E7B977',
          500: '#DCA65E',
          600: '#BE8341',
        },
        gold: {
          100: '#F5ECD9',
          400: '#B9A46E',
          600: '#7C7445',
          700: '#6E6537',
        },
      },
      fontFamily: {
        display: ['"Lora"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        vesSm: '0.85rem',
        vesMd: '1.35rem',
        vesLg: '1.9rem',
      },
      boxShadow: {
        editorial: '0 18px 55px rgba(67, 76, 61, 0.11)',
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
