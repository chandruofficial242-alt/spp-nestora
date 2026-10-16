/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#0f3a22',
          900: '#064e3b',
          950: '#032e22',
        },
        champagne: {
          50: '#faf6ee',
          100: '#f5ecd6',
          200: '#ebd9ad',
          300: '#e0c27e',
          400: '#d4af37',
          500: '#c5a059',
          600: '#b08b43',
          700: '#8e6c32',
          800: '#73572c',
          900: '#604828',
        },
        ivory: {
          50: '#fdfbf7',
          100: '#faf6ee',
          200: '#f4ede0',
          300: '#ede1cf',
          400: '#dec7a9',
        },
        navy: {
          800: '#0f172a',
          900: '#020617',
          950: '#010409',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'Plus Jakarta Sans', 'sans-serif']
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
        'elevated': '0 10px 30px -5px rgba(0,0,0,0.08), 0 4px 12px -2px rgba(0,0,0,0.04)',
        'premium': '0 20px 40px -15px rgba(6, 78, 59, 0.12), 0 8px 20px -6px rgba(0,0,0,0.05)',
        'gold': '0 4px 20px -2px rgba(197, 160, 89, 0.25)',
      }
    },
  },
  plugins: [],
};
