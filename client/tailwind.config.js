/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emergency: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          900: '#7f1d1d',
        },
        slateDark: {
          850: '#151c2c',
          900: '#0f172a',
          950: '#090d16',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'siren': 'sirenFlash 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        sirenFlash: {
          '0%': { boxShadow: '0 0 15px 4px rgba(239, 68, 68, 0.9)' },
          '100%': { boxShadow: '0 0 25px 8px rgba(59, 130, 246, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
