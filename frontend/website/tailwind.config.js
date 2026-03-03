/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#122056',
        primaryLight: '#1E3A8A',
        primaryDark: '#0F1B42',
        accent: '#818CF8',
        accentLight: '#A5B4FC',
        accentDark: '#5B65DC',
      },
    },
  },
  plugins: [],
}
