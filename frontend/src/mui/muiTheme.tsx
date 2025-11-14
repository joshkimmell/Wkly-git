import React, { useMemo, useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import appColors, { PALETTES, PALETTE_UPDATED_EVENT } from '@styles/appColors';
import '../styles/variables.scss';
import { text } from 'body-parser';
import { link } from 'fs';

declare module '@mui/material/styles' {
  interface Palette {
    // allow a custom `link` palette similar to primary/secondary
    link?: Palette['primary'];
  }
  interface PaletteOptions {
    // allow setting `link` in createTheme(...) palette options
    link?: PaletteOptions['primary'];
  }
}

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
  // Determine the selected palette key (persisted by appColors) and derive
  // brand tokens directly from the canonical PALETTES object. This avoids
  // relying on computed CSS variables and makes theme derivation deterministic.
  const storedPaletteKey = (appColors.getStoredPalette && appColors.getStoredPalette()) || 'purple';
  const runtimePalette = PALETTES[storedPaletteKey as keyof typeof PALETTES] || PALETTES.purple;
  // brand token mapping (numbers match the SCSS steps)
  const brand100 = runtimePalette[100];
  const brand90 = runtimePalette[90];
  const brand80 = runtimePalette[80];
  const brand70 = runtimePalette[70];
  const brand60 = runtimePalette[60];
  const brand50 = runtimePalette[50];
  const brand40 = runtimePalette[40];
  const brand30 = runtimePalette[30];
  const brand20 = runtimePalette[20];
  // Primary/ghost derived from palette
  let primary = brand60;
  const ghost = brand60;
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

  // If the primary color couldn't be read (empty), try to enforce a palette
  // choice: prefer a stored palette (user's choice) and fall back to purple.
  try {
    // don't perform side-effects here; theme creation must be pure. Palette
    // application to :root (for CSS consumers) is handled by the provider on
    // mount so we avoid dispatching events during render.
  } catch (e) {
    // ignore any errors applying palette
  }

  // explicit sensible hex fallbacks so MUI always has correct colors
  const background = backgroundRaw;
  const paper = readCssVar(['--background-color', '--color-background-color'], isDark ? '#282828' : '#ededed', preferBody);
  const textPrimary = textPrimaryRaw || (isDark ? '#E6E6E6' : '#111827');
  const textSecondary = readCssVar(['--secondary-text', '--color-text-secondary'], isDark ? '#B3B3B3' : '#4D4D4D', preferBody);
  const textPlaceholder = readCssVar(['--placeholder-text', '--color-text-placeholder'], isDark ? '#7A7A7A' : '#A0A0A0', preferBody);
  const linkPrimary = readCssVar(['--link-text', '--color-link-text'], isDark ? brand30 : brand60, preferBody);
  const textOnColor = readCssVar(['--on-color-text', '--color-on-color-text'],  '#FFFFFF', preferBody);
  const divider = readCssVar(['--primary-border', '--color-border-primary'], isDark ? '#e5e7eb' : '#3f3f46' , preferBody);
  // const input = readCssVar(['--brand-60', '--color-brand-60'], isDark ? '#FFFFFF' : '#383838', preferBody);
  // link token not used; reading from palette instead
  const fontFamily = readCssVar(['--font-family'], "'Open Sans', 'Helvetica Neue', Helvetica, sans-serif", preferBody);
  const fontSize = readCssVar(['--font-size'], '16px', preferBody);
  const borderRadius = readCssVar(['--border-radius'], '8px', preferBody);
  const boxShadow = readCssVar(['--box-shadow'], '0px 2px 4.9px rgba(0,0,0,0.6)', preferBody);

  // Prefer central CSS variable defaults (defined in SCSS `variables.scss`) but
  // keep sensible fallbacks for environments where the variables are not yet applied.
  const modeTokens = {
    light: {
      primary: readCssVar(['--brand-60', '--primary-brand-60'], PALETTES.purple[60], preferBody),
      background: readCssVar(['--gray-10', '--background-color', '--color-background-color'], '#ededed', preferBody),
      paper: readCssVar(['--gray-0', '--background-paper'], '#F4F4F4', preferBody),
      textPrimary: readCssVar(['--primary-text', '--color-text-primary'], '#111827', preferBody),
      textSecondary: readCssVar(['--secondary-text', '--color-text-secondary'], '#4D4D4D', preferBody),
      divider: readCssVar(['--primary-border', '--color-border-primary'], brand30, preferBody),
      // inputHex: readCssVar(['--brand-60', '--primary-brand-60'], PALETTES.purple[60], preferBody),  
    },
    dark: {
      primary: readCssVar(['--brand-30', '--primary-brand-30'], PALETTES.purple[30], preferBody),
      background: readCssVar(['--gray-100', '--background-color'], '#181818', preferBody),
      paper: readCssVar(['--gray-90', '--background-paper'], '#282828', preferBody),
      textPrimary: readCssVar(['--primary-text', '--color-text-primary'], '#E6E6E6', preferBody),
      textSecondary: readCssVar(['--secondary-text', '--color-text-secondary'], '#B3B3B3', preferBody),
      divider: readCssVar(['--primary-border', '--color-border-primary'], '#e5e7eb', preferBody),
      // inputHex: readCssVar(['--brand-20', '--primary-brand-20'], PALETTES.purple[20], preferBody),    
    },
  } as const;

  const chosenMode = isDark ? 'dark' : 'light';

  // Prefer the runtime CSS var (profile-selected palette) when available,
  // fall back to a hard-coded mode token if not.
  // primaryHex now comes directly from the selected palette (already a hex)
  const primaryHex = normalizeColorToHex(primary) || primary;
  const backgroundHex = modeTokens[chosenMode].background || normalizeColorToHex(background) || background;
  const paperHex = modeTokens[chosenMode].paper || normalizeColorToHex(paper) || paper;
  const textPrimaryHex = modeTokens[chosenMode].textPrimary || normalizeColorToHex(textPrimary) || textPrimary;
  const textSecondaryHex = modeTokens[chosenMode].textSecondary || normalizeColorToHex(textSecondary) || textSecondary;
  const textOnColorHex = normalizeColorToHex(textOnColor) || textOnColor;
  const linkPrimaryHex = normalizeColorToHex(linkPrimary) || linkPrimary;
  const dividerHex = modeTokens[chosenMode].divider || normalizeColorToHex(divider) || divider;
  // Additional palette tokens derived from CSS variables when available
  // Derive additional tokens from the same palette for consistency
  const secondaryHex = textSecondaryHex;
  const infoHex = primaryHex;
  const actionHoverHex = textSecondaryHex;
  // Use brand accents and green palette for success semantics
  const successHex = PALETTES.green ? PALETTES.green[60] : '#22c55e';
  const primaryBorderHex = brand20 || divider;
  const tertiaryButtonHex = brand30;
  const primaryIconHex = brand70;
  const inverseIconHex = brand100;
  const appbarHex = brand90;
  const badgeHex = primaryHex;
  const tooltipHex = brand50;
  const primaryFabHex = brand60;
  const secondaryFabHex = PALETTES.gray ? PALETTES.gray[60] : '#a1a1aa';

  // toolbar background: choose translucent surface that contrasts with theme
  const toolbarBg = isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.9)';
  

  // Debug: log computed values so we can trace theme rebuilds when toggling
  // Computed theme tokens available here for debugging when needed

  const theme = createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: primaryHex,
      },
      secondary: {
        main: secondaryHex,
      },
      info: {
        main: infoHex,
      },
      success: {
        main: successHex,
      },
      background: {
        default: backgroundHex,
        paper: paperHex,
      },
      text: {
        primary: textPrimaryHex,
        secondary: textSecondaryHex,
        disabled: textPlaceholder,
      },
      link: {
        main: linkPrimaryHex,
      },
  divider: dividerHex,
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
            '--wkly-link-primary': linkPrimary,
            '--wkly-text-primary': textPrimary,
            '--wkly-text-secondary': textSecondary,
            '--wkly-text-on-color': textOnColor,
            '--wkly-text-placeholder': textPlaceholder,
            '--wkly-divider': divider,
            '--wkly-radius': borderRadius,
            '--wkly-shadow': boxShadow,
            // small runtime hint derived from computed background (used to keep helper referenced)
            '--wkly-is-dark-hint': isDarkFromBg ? '1' : '0',
            '--wkly-chip-label-font-size': '0.75em',
            // expose some derived tokens so components can use them
            '--wkly-btn-secondary': secondaryHex,
            '--wkly-info': infoHex,
            '--wkly-success': successHex,
            '--wkly-action-hover': actionHoverHex || '',
            '--wkly-appbar': appbarHex || '',
            '--wkly-badge': badgeHex || '',
            '--wkly-tooltip': tooltipHex || '',
            '--wkly-fab': primaryFabHex || '',
            '--wkly-inverse-icon': inverseIconHex || '',
            // toolbar background for richtext overlay and similar components
            '--wkly-toolbar-bg': toolbarBg || '',
          } as React.CSSProperties,
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorPrimary: {
            backgroundColor: appbarHex || primaryHex,
            color: textPrimaryHex,
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            backgroundColor: badgeHex || successHex,
            color: textPrimaryHex,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: tooltipHex || '#333',
            color: textOnColorHex,
            fontSize: '0.85rem',
          },
          arrow: {
            color: tooltipHex || '#333',
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          primary: {
            backgroundColor: primaryFabHex,
            color: textOnColorHex,
            '&:hover': {
              filter: 'brightness(0.5)'
            },
          } as any,
          secondary: {
            backgroundColor: secondaryFabHex,
            color: textOnColorHex,
            '&:hover': {
              filter: 'brightness(0.95)'
            },
          } as any,
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
          outlined: {
            borderColor: primaryBorderHex,
            '&:hover': {
              backgroundColor: actionHoverHex || undefined,
            },
          },
          contained: {
            backgroundColor: primaryHex,
            // contrast-aware color will be set after theme creation
            '&:hover': {
              filter: 'brightness(0.95)',
            },
          },
          text: {
            color: tertiaryButtonHex || primaryHex,
            '&:hover': {
              filter: 'brightness(0.5)',
            },
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
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--brand-30)',
            border: `2px solid ${primaryIconHex || 'transparent'}`,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            padding: 6,
            color: primaryIconHex || inverseIconHex,
            '&:hover': {
              backgroundColor: actionHoverHex || 'rgba(0,0,0,0.04)',
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            color: primaryIconHex || textPrimary,
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
            '&.Mui-focused': {
              color: primaryHex,
            },
          },
          input: {
            padding: `8px 12px`,
            '&::placeholder': { color: textSecondary },
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: linkPrimaryHex,
            textDecorationColor: linkPrimaryHex,
            '&:hover': {
              textDecorationColor: linkPrimaryHex,
              filter: 'brightness(0.8)',
            },
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
              borderColor: primaryBorderHex || divider,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: primaryHex,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: primaryHex,
              boxShadow: actionHoverHex ? `0 0 0 4px ${actionHoverHex}33` : undefined,
            },
          },
          input: {
            padding: '10px 12px',
            '&::placeholder': {
              color: textPlaceholder,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: textSecondary,
            '&.Mui-focused': {
              color: linkPrimaryHex,
              textDecorationColor: linkPrimaryHex,
              filter: 'brightness(0.8)',
            },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            color: textPlaceholder,
            marginTop: '6px',
            fontSize: '0.875rem',
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: textSecondary,
            '&.Mui-focused': {
              color: linkPrimaryHex,
              textDecorationColor: linkPrimaryHex,
              filter: 'brightness(0.8)',
            },
            fontSize: '0.875rem',
            backgroundColor: 'transparent',
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
            // backgroundColor: primaryFabHex || primaryHex,
          },
          switchBase: {
            // padding: 4,
            color: textSecondary,
          },
          track: {
            backgroundColor: primaryHex,
          },
          thumb: {
            '&.Mui-checked': {
              backgroundColor: linkPrimaryHex,
              filter: 'brightness(30%)',
            },
            // backgroundColor: primaryHex,

            // width: 16,
            // height: 16,
            // boxShadow: 'none',
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

  // Contrast-aware Fab augmentation (after theme exists)
  try {
    const fabContrast = theme.palette.getContrastText(primaryFabHex || primaryHex || '#000');
    theme.components = theme.components || {};
    theme.components.MuiFab = theme.components.MuiFab || {};
    theme.components.MuiFab.styleOverrides = {
      ...(theme.components.MuiFab.styleOverrides || {}),
      primary: {
        backgroundColor: primaryFabHex || primaryHex,
        color: fabContrast,
        '&:hover': {
          filter: 'brightness(0.95)',
        },
      },
    };
  } catch {
    theme.components = theme.components || {};
    theme.components.MuiFab = theme.components.MuiFab || {};
    theme.components.MuiFab.styleOverrides = {
      ...(theme.components.MuiFab.styleOverrides || {}),
      primary: {
        backgroundColor: primaryFabHex || primaryHex,
        color: isDark ? '#000000' : '#ffffff',
        '&:hover': { filter: 'brightness(0.95)' },
      },
    };
  }

  return theme;
}

const AppMuiThemeProvider: React.FC<Props> = ({ mode, children }) => {
  // Keep a small state counter so we can trigger a rebuild when the
  // palette is updated at runtime (event dispatched by appColors).
  const [paletteVersion, setPaletteVersion] = useState(0);

  useEffect(() => {
    const onPalette = () => setPaletteVersion(v => v + 1);
    window.addEventListener(PALETTE_UPDATED_EVENT, onPalette as EventListener);
    return () => window.removeEventListener(PALETTE_UPDATED_EVENT, onPalette as EventListener);
  }, []);

  // Rebuild theme when either the mode or the paletteVersion changes.
  const theme = useMemo(() => buildTheme(mode), [mode, paletteVersion]);

  // Also ensure that if a stored palette exists on mount we request a
  // Apply stored palette to :root for non-MUI consumers (Tailwind CSS, raw CSS)
  useEffect(() => {
    try {
      const stored = appColors.getStoredPalette();
      if (stored) appColors.applyPaletteToRoot(stored);
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default AppMuiThemeProvider;
