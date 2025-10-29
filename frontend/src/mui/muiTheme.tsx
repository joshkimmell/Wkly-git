import React, { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import '../styles/variables.scss';
import { text } from 'body-parser';

type Props = {
  mode: 'theme-dark' | 'theme-light';
  children: React.ReactNode;
};

// Try several possible CSS variable names and fall back to a default
const readCssVar = (names: string[], fallback: string) => {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return fallback;
  // Check body first so theme overrides applied via `.dark` on <body> are respected,
  // then fall back to :root (documentElement).
  const sources: Array<HTMLElement | Element> = [];
  if (typeof document !== 'undefined') {
    if (document.body) sources.push(document.body);
    sources.push(document.documentElement);
  }
  for (const name of names) {
    for (const src of sources) {
      try {
        const v = getComputedStyle(src as Element).getPropertyValue(name);
        if (v && v.trim()) return v.trim();
      } catch (e) {
        // ignore and try next
      }
    }
  }
  return fallback;
};

const buildTheme = (mode: 'theme-dark' | 'theme-light') => {
  const isDark = mode === 'theme-dark';

  // Read the CSS custom properties that your Sass mixin emits. The `.dark` class
  // on <body> swaps these vars, so we just read the same names for both modes.
  // Provide sensible hex fallbacks that match the $brand and $gray tokens.
  const primary = readCssVar(['--primary-button', '--color-button-primary'], isDark ? '#c300dc' /* brand-30 */ : '#4d0057' /* brand-70 */);
  const background = readCssVar(['--background-color', '--color-background-color', '--background-color'], isDark ? 'gray-90' : 'gray-10');
  const paper = readCssVar(['--background-color', '--color-background-color'], isDark ? '--background-color' : 'background-color');
  const textPrimary = readCssVar(['--primary-text', '--color-text-primary', '--primary-text-color'], isDark ? 'gray-10' : 'gray-90');
  const textSecondary = readCssVar(['--secondary-text', '--color-text-secondary'], isDark ? '#B3B3B3' : '#4D4D4D');
  const textPlaceholder = readCssVar(['--placeholder-text', '--color-text-placeholder'], isDark ? '#7A7A7A' : '#A0A0A0');
  const divider = readCssVar(['--primary-border', '--color-border-primary'], '$brand-50');
  const link = readCssVar(['--primary-link', '--color-link-primary'], primary);
  const fontFamily = readCssVar(['--font-family'], "'Open Sans', 'Helvetica Neue', Helvetica, sans-serif");
  const fontSize = readCssVar(['--font-size'], '16px');
  const borderRadius = readCssVar(['--border-radius'], '8px');
  const boxShadow = readCssVar(['--box-shadow'], '0px 2px 4.9px rgba(0,0,0,0.6)');
  

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: primary,
      },
      background: {
        default: background,
        paper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider,
      info: { main: link },
    },
    typography: {
      fontFamily,
      fontSize: parseInt(fontSize, 10) || 16,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            // mirror a few helpful tokens so MUI internals and components can read them
            '--wkly-btn-primary': primary,
            '--wkly-background': background,
            '--wkly-text-primary': textPrimary,
            '--wkly-text-secondary': textSecondary,
            '--wkly-text-placeholder': textPlaceholder,
            '--wkly-divider': divider,
            '--wkly-radius': borderRadius,
            '--wkly-shadow': boxShadow,
          } as React.CSSProperties,
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: false,
        },
        styleOverrides: {
          root: {
            class: primary,
            borderRadius: borderRadius,
            textTransform: 'none',
            backgroundColor: 'var(--wkly-background, ' + background + ')',
            boxShadow: 'none',
            // use the wkly primary for contained variants via palette mapping
        },
    },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            borderRadius: borderRadius,
            // emulate border-b only style from Tailwind theme
          },
          input: {
            padding: `8px 12px`,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'standard',
          fullWidth: true,
        },
        styleOverrides: {
          root: {
            // remove default MUI underline emphasis and align with Tailwind styles
            '& .MuiInputBase-root': {
              backgroundColor: 'transparent',
            },
            // '& .MuiFormLabel-root': {
            //   color: textPrimary,
            // },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius,
            backgroundColor: 'transparent',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: divider,
            },
          },
          input: {
            padding: '10px 12px',
            '&::placeholder': {
              color: textSecondary,
            //   opacity: 0.4,
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            color: textSecondary,
            marginTop: '6px',
            fontSize: '0.875rem',
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: textSecondary,
            fontSize: '0.875rem',
            backgroundColor: 'transparent',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            padding: 6,
            color: textPrimary,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.04)',
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            // padding: 6,
            color: textPrimary,
          },
          switchBase: {
            // padding: 4,
            color: textSecondary,
          },
        },
      },
    },
  });
};

const AppMuiThemeProvider: React.FC<Props> = ({ mode, children }) => {
  const theme = useMemo(() => buildTheme(mode), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default AppMuiThemeProvider;
