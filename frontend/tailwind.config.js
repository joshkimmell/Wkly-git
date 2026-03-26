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
        serif: ['Buenard', 'Georgia', 'serif'],
        // serif: ['Gentium Plus', 'Georgia', 'serif'],
        // serif: ['Neuton', 'Georgia', 'serif'],
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
          0:  'rgb(244 244 244 / <alpha-value>)',
          5:  'rgb(240 240 240 / <alpha-value>)', // Adding gray-5 for consistency
          10: 'rgb(237 237 237 / <alpha-value>)',
          20: 'rgb(215 215 215 / <alpha-value>)',
          30: 'rgb(180 180 180 / <alpha-value>)',
          40: 'rgb(164 164 164 / <alpha-value>)',
          50: 'rgb(128 128 128 / <alpha-value>)',
          60: 'rgb(102 102 102 / <alpha-value>)',
          70: 'rgb(77 77 77 / <alpha-value>)',
          80: 'rgb(51 51 51 / <alpha-value>)',
          90: 'rgb(26 26 26 / <alpha-value>)',
          100:'rgb(7 7 7 / <alpha-value>)',
        },
        background: 'var(--background)',
        'background-color': 'var(--background-color)',
        'background-color-alpha': 'var(--background-color-alpha)',
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
        // borders
        'border-subtle': 'var(--border-subtle)',
      },
    },
    // components: {
    //   MuiMultiInputDateRangeField: {
    //     styleOverrides: {
    //       root: {
    //         '& MuiPickersSectionList-section .MuiPickersInputBase-sectionsContent': {
    //           fontSize: '0.75em',
    //         },
    //       },
    //     },
    //   },
    // },
  },
  plugins: [],
};