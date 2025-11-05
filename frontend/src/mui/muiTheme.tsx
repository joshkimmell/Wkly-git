import React, { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import '../styles/variables.scss';

type Props = {
  mode: 'theme-dark' | 'theme-light';
  children: React.ReactNode;
};

// Try several possible CSS variable names and fall back to a default
const readCssVar = (names: string[], fallback: string, preferBody = true) => {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return fallback;
  // Build a list of sources. By default prefer <body> then <html>, but the
  // caller can request the opposite (useful when the body class hasn't been
  // toggled yet but `mode` is known).
  const sources: Array<HTMLElement | Element> = [];
  if (typeof document !== 'undefined') {
    if (preferBody) {
      if (document.body) sources.push(document.body);
      sources.push(document.documentElement);
    } else {
      sources.push(document.documentElement);
      if (document.body) sources.push(document.body);
    }
  }
  for (const name of names) {
    for (const src of sources) {
      try {
        const v = getComputedStyle(src as Element).getPropertyValue(name);
        if (v && v.trim()) return v.trim();
      } catch {
        // ignore and try next
      }
    }
  }
  return fallback;
};

const buildTheme = (mode: 'theme-dark' | 'theme-light') => {
  // Instead of trusting the incoming `mode`, derive dark/light from the
  // computed background color so the MUI theme always matches the runtime
  // CSS variables (this avoids the case where the app thinks it's light but
  // the CSS vars are for dark, resulting in inverted colors).

  // Helper: determine whether a CSS color string is dark by computing
  // relative luminance. Support hex (#rgb/#rrggbb) and rgb(a).
  const parseColorToRgb = (c: string): [number, number, number] | null => {
    if (!c) return null;
    const s = c.trim();
    // rgb/rgba
    const rgbMatch = s.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map(p => parseFloat(p));
      if (parts.length >= 3 && parts.every(p => !Number.isNaN(p))) {
        return [parts[0], parts[1], parts[2]];
      }
    }
    // hex (#rrggbb or #rgb)
    const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return [r, g, b];
      }
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return [r, g, b];
    }
    return null;
  };

  const isColorDark = (color: string) => {
    const rgb = parseColorToRgb(color);
    if (!rgb) return false; // default to light
    // relative luminance (approx) — convert sRGB to linear then compute
    const toLinear = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const [r, g, b] = rgb;
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L < 0.5;
  };

  // Convert an [r,g,b] tuple to #rrggbb
  const rgbToHex = (rgb: [number, number, number]) => {
    const toHex = (v: number) => {
      const i = Math.round(v);
      const s = i.toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  };

  // Normalize a CSS color string (rgb(...) or #hex) into a #rrggbb string.
  // Returns null if the color couldn't be parsed.
  const normalizeColorToHex = (c: string | undefined | null) => {
    if (!c) return null;
    const rgb = parseColorToRgb(c);
    if (!rgb) return null;
    return rgbToHex(rgb);
  };

  // Prefer reading CSS vars from `document.body` only when the intended
  // mode is dark (the app applies `.dark` to the body). For light mode
  // prefer the documentElement (:root) so we don't accidentally read
  // stale dark variables that are still present on the body during
  // class-toggle timing windows.
  const preferBody = mode === 'theme-dark';
  const primary = readCssVar(['--primary-button', '--color-button-primary'], '#4d0057', preferBody);
  const ghost = readCssVar(['--ghost-button', '--color-ghost-primary'], '#4d0057', preferBody);
  const backgroundRaw = readCssVar(['--background-color', '--color-background-color', '--background-color'], '#ededed', preferBody);
  const textPrimaryRaw = readCssVar(['--primary-text', '--color-text-primary', '--primary-text-color'], '', preferBody);

  // Use the explicit `mode` prop as the authoritative signal. The app's
  // components set `mode` based on user intent (and also add/remove the
  // `.dark` class) — prefer that to avoid transient inversion when CSS
  // variables haven't been applied yet.
  const isDark = mode === 'theme-dark';

  // (logging moved below after fallbacks are computed)

  // keep a background-derived hint available (and ensure the helper is used)
  const isDarkFromBg = isColorDark(backgroundRaw);

  // explicit sensible hex fallbacks so MUI always has correct colors
  const background = backgroundRaw;
  const paper = readCssVar(['--background-color', '--color-background-color'], isDark ? '#282828' : '#ededed', preferBody);
  const textPrimary = textPrimaryRaw || (isDark ? '#E6E6E6' : '#111827');
  const textSecondary = readCssVar(['--secondary-text', '--color-text-secondary'], isDark ? '#B3B3B3' : '#4D4D4D', preferBody);
  const textPlaceholder = readCssVar(['--placeholder-text', '--color-text-placeholder'], isDark ? '#7A7A7A' : '#A0A0A0', preferBody);
  const divider = readCssVar(['--primary-border', '--color-border-primary'], isDark ? '#3f3f46' : '#e5e7eb', preferBody);
  const link = readCssVar(['--primary-link', '--color-link-primary'], primary, preferBody);
  const fontFamily = readCssVar(['--font-family'], "'Open Sans', 'Helvetica Neue', Helvetica, sans-serif", preferBody);
  const fontSize = readCssVar(['--font-size'], '16px', preferBody);
  const borderRadius = readCssVar(['--border-radius'], '8px', preferBody);
  const boxShadow = readCssVar(['--box-shadow'], '0px 2px 4.9px rgba(0,0,0,0.6)', preferBody);

  const modeTokens = {
    light: {
      primary: '#570082', // $brand-60
      background: '#ededed', // $gray-10
      paper: '#F4F4F4', // $gray-0
      textPrimary: '#111827', // near $gray-100
      textSecondary: '#4D4D4D',
      divider: '#e5e7eb',
    },
    dark: {
      primary: '#c300dc', // $brand-30
      background: '#181818', // $gray-100
      paper: '#282828',
      textPrimary: '#E6E6E6',
      textSecondary: '#B3B3B3',
      divider: '#3f3f46',
    },
  } as const;

  const chosenMode = isDark ? 'dark' : 'light';

  const primaryHex = modeTokens[chosenMode].primary || normalizeColorToHex(primary) || primary;
  const backgroundHex = modeTokens[chosenMode].background || normalizeColorToHex(background) || background;
  const paperHex = modeTokens[chosenMode].paper || normalizeColorToHex(paper) || paper;
  const textPrimaryHex = modeTokens[chosenMode].textPrimary || normalizeColorToHex(textPrimary) || textPrimary;
  const textSecondaryHex = modeTokens[chosenMode].textSecondary || normalizeColorToHex(textSecondary) || textSecondary;
  const dividerHex = modeTokens[chosenMode].divider || normalizeColorToHex(divider) || divider;
  

  // Debug: log computed values so we can trace theme rebuilds when toggling
  // Computed theme tokens available here for debugging when needed

  const theme = createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: primaryHex,
      },
      background: {
        default: backgroundHex,
        paper: paperHex,
      },
      text: {
        primary: textPrimaryHex,
        secondary: textSecondaryHex,
      },
  divider: dividerHex,
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
            '--wkly-btn-primary-hex': primaryHex,
            '--wkly-btn-ghost': ghost,
            '--wkly-background': background,
            '--wkly-text-primary': textPrimary,
            '--wkly-text-secondary': textSecondary,
            '--wkly-text-placeholder': textPlaceholder,
            '--wkly-divider': divider,
            '--wkly-radius': borderRadius,
            '--wkly-shadow': boxShadow,
            // small runtime hint derived from computed background (used to keep helper referenced)
            '--wkly-is-dark-hint': isDarkFromBg ? '1' : '0',
            '--wkly-chip-label-font-size': '0.75em',
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
            color: textPrimaryHex,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '9999px',
            // match .card-category padding: .125rem .625rem
            padding: '0.125em 0.625em',
            height: 'auto',
            // keep chip compact like the tag
            minHeight: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
          },
          label: {
            // match .card-category font-size and line-height
            fontSize: '0.75rem',
            lineHeight: '0.85rem',
            fontWeight: 500,
            paddingLeft: 0,
            paddingRight: 0,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem', // 14px
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
            backgroundColor: paperHex,
            color: textPrimaryHex,
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
    const contrastText = theme.palette.getContrastText(primaryHex || '#000');
    theme.components = theme.components || {};
    theme.components.MuiButton = theme.components.MuiButton || {};
    theme.components.MuiButton.styleOverrides = {
      ...(theme.components.MuiButton.styleOverrides || {}),
      contained: {
        backgroundColor: primaryHex,
        color: contrastText,
        '&:hover': {
          // slightly reduce brightness on hover for feedback
          filter: 'brightness(0.95)',
        },
      },
    };
  } catch {
    // If palette.getContrastText fails (e.g. primary is a CSS var), fall back safely
    theme.components = theme.components || {};
    theme.components.MuiButton = theme.components.MuiButton || {};
    theme.components.MuiButton.styleOverrides = {
      ...(theme.components.MuiButton.styleOverrides || {}),
      contained: {
        backgroundColor: primaryHex,
        color: isDark ? '#000000' : '#ffffff',
        '&:hover': {
          filter: 'brightness(0.95)',
        },
      },
    };
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
