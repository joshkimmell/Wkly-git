const { tokenToString } = require("typescript");

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css,scss,sass,html}', "./index.css" // Include all frontend files
  ],
  darkMode: 'class', // Enable dark mode support
  theme: {
    extend: {
      // Use runtime CSS variables as the single source of truth. The
      // variables are populated by `src/styles/appColors.ts` at runtime and
      // are also defined in `variables.scss` as fallbacks for builds.
      colors: {
        brand: {
          0:  'var(--brand-0)',
          10: 'var(--brand-10)',
          20: 'var(--brand-20)',
          30: 'var(--brand-30)',
          40: 'var(--brand-40)',
          50: 'var(--brand-50)',
          60: 'var(--brand-60)',
          70: 'var(--brand-70)',
          80: 'var(--brand-80)',
          90: 'var(--brand-90)',
          100:'var(--brand-100)',
        },
        gray: {
          0:  'var(--gray-0)',
          10: 'var(--gray-10)',
          20: 'var(--gray-20)',
          30: 'var(--gray-30)',
          40: 'var(--gray-40)',
          50: 'var(--gray-50)',
          60: 'var(--gray-60)',
          70: 'var(--gray-70)',
          80: 'var(--gray-80)',
          90: 'var(--gray-90)',
          100:'var(--gray-100)',
        },
      },
    },
  },
  plugins: [],
};