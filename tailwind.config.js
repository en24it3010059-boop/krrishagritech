/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f9f1',
          100: '#dcf1df',
          200: '#bbe3c4',
          300: '#8ecf9c',
          400: '#5cb574',
          500: '#3a9856',
          600: '#2b7a44',
          700: '#24623a',
          800: '#1f4f31',
          900: '#1a4029',
          950: '#0c2316',
        },
        earth: {
          50: '#faf7f2',
          100: '#f3ede2',
          200: '#e6d9c3',
          300: '#d4bf9c',
          400: '#bf9f72',
          500: '#a8844f',
          600: '#8c6a3f',
          700: '#71533a',
          800: '#5d4533',
          900: '#4d3a2d',
          950: '#2a1f18',
        },
      },
    },
  },
  plugins: [],
};
