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
  const ghost = readCssVar(['--ghost-button', '--color-ghost-primary'], isDark ? '#c300dc' /* brand-30 */ : '#4d0057' /* brand-70 */);
  // explicit sensible hex fallbacks so MUI always has correct colors
  const background = readCssVar(['--background-color', '--color-background-color', '--background-color'], isDark ? '#0b0b0b' /* very dark */ : '#ffffff' /* white */);
  const paper = readCssVar(['--background-color', '--color-background-color'], isDark ? '#282828' : '#f4f4f4');
  const textPrimary = readCssVar(['--primary-text', '--color-text-primary', '--primary-text-color'], isDark ? '#E6E6E6' /* light text in dark mode */ : '#111827' /* dark text in light mode */);
  const textSecondary = readCssVar(['--secondary-text', '--color-text-secondary'], isDark ? '#B3B3B3' : '#4D4D4D');
  const textPlaceholder = readCssVar(['--placeholder-text', '--color-text-placeholder'], isDark ? '#7A7A7A' : '#A0A0A0');
  const divider = readCssVar(['--primary-border', '--color-border-primary'], isDark ? '#3f3f46' : '#e5e7eb');
  const link = readCssVar(['--primary-link', '--color-link-primary'], primary);
  const fontFamily = readCssVar(['--font-family'], "'Open Sans', 'Helvetica Neue', Helvetica, sans-serif");
  const fontSize = readCssVar(['--font-size'], '16px');
  const borderRadius = readCssVar(['--border-radius'], '8px');
  const boxShadow = readCssVar(['--box-shadow'], '0px 2px 4.9px rgba(0,0,0,0.6)');
  const theme = createTheme({
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
            '--wkly-btn-ghost': ghost,
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
            borderRadius: borderRadius,
            textTransform: 'none',
            // by default buttons shouldn't override the global background color
            backgroundColor: 'transparent',
            boxShadow: 'none',
            color: textPrimary,
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
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            color: textPrimary,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: paper,
            color: textPrimary,
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

  // Now augment the theme to add a contrast-aware contained button variant.
  try {
    const contrastText = theme.palette.getContrastText(primary || '#000');
    theme.components = theme.components || {};
    theme.components.MuiButton = theme.components.MuiButton || {};
    theme.components.MuiButton.styleOverrides = {
      ...(theme.components.MuiButton.styleOverrides || {}),
      contained: {
        backgroundColor: primary,
        color: contrastText,
        '&:hover': {
          // slightly reduce brightness on hover for feedback
          filter: 'brightness(0.95)',
        },
      },
    } as any;
  } catch (e) {
    // If palette.getContrastText fails (e.g. primary is a CSS var), fall back safely
    theme.components = theme.components || {};
    theme.components.MuiButton = theme.components.MuiButton || {};
    theme.components.MuiButton.styleOverrides = {
      ...(theme.components.MuiButton.styleOverrides || {}),
      contained: {
        backgroundColor: primary,
        color: isDark ? '#000000' : '#ffffff',
        '&:hover': {
          filter: 'brightness(0.95)',
        },
      },
    } as any;
  }

  return theme;
}

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
