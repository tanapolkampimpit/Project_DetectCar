/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#1e40af',
        'light-blue': '#cce3ff',
        'app-bg': '#f8fbff',
        'rec-red': '#ef4444',
      },
      animation: {
        'blink': 'blink 1s step-start infinite',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
      },
      keyframes: {
        blink: {
          '50%': { opacity: '0' },
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(5px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
