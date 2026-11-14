/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--background)",
          surface: "var(--surface)",
          elevated: "var(--surface-elevated)",
          subtle: "var(--surface-subtle)",
        },
        foreground: {
          DEFAULT: "var(--foreground)",
          muted: "var(--foreground-muted)",
          subtle: "var(--foreground-subtle)",
        },
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
          DEFAULT: '#ea580c',
        },
        terracotta: {
          50: '#fdf4f2',
          100: '#fbe7e3',
          200: '#f8d2cb',
          300: '#f1b3a6',
          400: '#e58571',
          500: '#d75d44',
          600: '#bf442d',
          700: '#9e3522',
          800: '#832e1f',
          900: '#6d2a1d',
          DEFAULT: '#bf442d',
        },
        sand: {
          50: '#fdfaf5',
          100: '#fbf5e8',
          200: '#f6ebd2',
          300: '#eedab4',
          400: '#e2c08c',
          500: '#d6a666',
          DEFAULT: '#eedab4',
        },
        jade: {
          50: '#f2f7f6',
          100: '#dfedeb',
          200: '#c1deda',
          300: '#97c7c0',
          400: '#6ea9a1',
          500: '#528d85',
          600: '#3e7069',
          DEFAULT: '#3e7069',
        },
        border: "var(--border)",
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(234, 88, 12, 0.25)',
        'glow-md': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'glow-lg': '0 0 40px -10px rgba(234, 88, 12, 0.45)',
        'glow-amber': '0 0 30px -5px rgba(245, 158, 11, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        }
      }
    },
  },
  plugins: [],
}
