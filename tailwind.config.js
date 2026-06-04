/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hex-bg': '#0a1a0f',
        'hex-surface': '#0d2818',
        'hex-border': '#1b4332',
        'hex-accent': '#52b788',
        'hex-bright': '#74c69d',
        'hex-text': '#d8f3dc',
        'hex-muted': '#95d5b2',
        'hex-danger': '#e63946',
        'hex-warning': '#e9c46a',
      },
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
