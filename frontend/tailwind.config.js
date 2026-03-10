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
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        xs: 'var(--font-size-xs)',      // 12px
        sm: 'var(--font-size-sm)',      // 14px
        base: 'var(--font-size-base)',  // 16px
        lg: 'var(--font-size-lg)',      // 18px
        xl: 'var(--font-size-xl)',      // 20px
        '2xl': 'var(--font-size-2xl)',  // 24px
        '3xl': 'var(--font-size-3xl)',  // 32px
        '4xl': 'var(--font-size-4xl)',  // 40px
      },
      lineHeight: {
        tight: 'var(--line-height-tight)',     // 1.25
        base: 'var(--line-height-base)',       // 1.5
        relaxed: 'var(--line-height-relaxed)', // 1.75
      },
      spacing: {
        0: 'var(--spacing-0)',   // 0
        1: 'var(--spacing-1)',   // 4px
        2: 'var(--spacing-2)',   // 8px
        3: 'var(--spacing-3)',   // 12px
        4: 'var(--spacing-4)',   // 16px
        5: 'var(--spacing-5)',   // 20px
        6: 'var(--spacing-6)',   // 24px
        8: 'var(--spacing-8)',   // 32px
        10: 'var(--spacing-10)', // 40px
        12: 'var(--spacing-12)', // 48px
        16: 'var(--spacing-16)', // 64px
        20: 'var(--spacing-20)', // 80px
        24: 'var(--spacing-24)', // 96px
      },
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
        background: 'var(--background)',
        'background-color': 'var(--background-color)',
        'background-inverse': 'var(--background-inverse)',
        // text
        'primary-text': 'var(--primary-text)',
        'secondary-text': 'var(--secondary-text)',
        'tertiary-text': 'var(--tertiary-text)',
        'inverse-text': 'var(--inverse-text)',
        'button-text': 'var(--button-text)',
        // icons
        'primary-icon': 'var(--primary-icon)',
        'secondary-icon': 'var(--secondary-icon)',
        'tertiary-icon': 'var(--tertiary-icon)',
        'inverse-icon': 'var(--inverse-icon)',
        'interactive-icon': 'var(--interactive-icon)',
        // borders
        'primary-border': 'var(--primary-border)',
        'secondary-border': 'var(--secondary-border)',
        'tertiary-border': 'var(--tertiary-border)',
        // buttons
        'primary': 'var(--primary-button)',
        'primary-button': 'var(--primary-button)',
        'secondary-button': 'var(--secondary-button)',
        'tertiary-button': 'var(--tertiary-button)',
        'primary-button-hover': 'var(--primary-button-hover)',
        'secondary-button-hover': 'var(--secondary-button-hover)',
        'tertiary-button-hover': 'var(--tertiary-button-hover)',
        // links
        'primary-link': 'var(--primary-link)',
        'secondary-link': 'var(--secondary-link)',
        'tertiary-link': 'var(--tertiary-link)',
      },
    },
  },
  plugins: [],
};