/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          50: '#FAF8FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
        navy: {
          DEFAULT: '#1F1735',
          800: '#2D234A',
          900: '#1F1735',
          950: '#140E24',
        },
        accent: {
          DEFAULT: '#16A34A',
          50: '#F0FDF4',
          500: '#16A34A',
          600: '#15803D',
        },
        surface: {
          light: '#F8F7FF',
          card: '#FFFFFF',
        },
        theme: {
          purple: '#7C3AED',
          deep: '#5B21B6',
          light: '#EDE9FE',
          bg: '#F8F7FF',
          card: '#FFFFFF',
          text: '#1F1735',
          muted: '#6B647A',
          border: '#E9E4F2',
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'lavender': '0 4px 20px -2px rgba(124, 58, 237, 0.08)',
        'lavender-lg': '0 10px 25px -3px rgba(124, 58, 237, 0.12)',
        'xs': '0 1px 2px 0 rgba(31, 23, 53, 0.05)',
      }
    },
  },
  plugins: [],
}
