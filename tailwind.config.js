/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A1A1A', // Deep obsidian black
        secondary: '#D4AF37', // Refined gold accent
        background: '#FAFAFA', // Off-white luxury paper
        surface: '#FFFFFF',
        muted: '#8E8E8E'
      },
      fontFamily: {
        serif: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      letterSpacing: {
        widest: '.25em',
      }
    },
  },
  plugins: [],
}
