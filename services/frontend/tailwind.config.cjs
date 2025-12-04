/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // include all source files
  ],
  theme: {
    extend: {
      colors: {
        osyleBg: '#EDEBE9', // define light colors manually
      },
    },
  },
  plugins: [],
}
