const { tokenToString } = require("typescript");

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css,scss,sass}', // Include all frontend files
  ],
  darkMode: 'class', // Enable dark mode support
  theme: {
    extend: {
      colors: {
        brand: {
          0:  '#F8C1FF',
          10: '#F07DFF',
          20: '#E737FE',
          30: '#c300dc',
          40: '#760086',
          50: '#6a0078',
          60: '#570082',
          70: '#4d0057',
          80: '#3b0043',
          90: '#230028',
          100: '#17001b',
        },
        gray: {
          0:  '#F8F8F8',
          10: '#F4F4F4',
          20: '#C8C8C8',
          30: '#B0B0B0',
          40: '#989898',
          50: '#808080',
          60: '#686868',
          70: '#505050',
          80: '#383838',
          90: '#202020',
          100: '#080808',
        },
      },
    },
  },
  plugins: [],
};