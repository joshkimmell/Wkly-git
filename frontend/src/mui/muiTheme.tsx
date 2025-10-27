import React, { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import '../styles/variables.scss';

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
  const background = readCssVar(['--background', '--color-background', '--background-color'], isDark ? '#181818' : '#F4F4F4');
  const paper = readCssVar(['--background', '--color-background'], isDark ? 'gray-100' : 'gray-10');
  const textPrimary = readCssVar(['--primary-text', '--color-text-primary', '--primary-text-color'], isDark ? '#F8C1FF' : '#181818');
  const textSecondary = readCssVar(['--secondary-text', '--color-text-secondary'], isDark ? '#B3B3B3' : '#4D4D4D');
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
            '--wkly-primary': primary,
            '--wkly-background': background,
            '--wkly-text-primary': textPrimary,
            '--wkly-divider': divider,
            '--wkly-radius': borderRadius,
            '--wkly-shadow': boxShadow,
          } as React.CSSProperties,
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            class: 'btn-primary',
            borderRadius: borderRadius,
            textTransform: 'none',
            backgroundColor: 'var(--wkly-primary, ' + primary + ')',
            // boxShadow: 'none',
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
            '& .MuiFormLabel-root': {
              color: textSecondary,
            },
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
            fontSize: '0.9rem',
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
