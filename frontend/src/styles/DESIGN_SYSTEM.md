# Wkly Design System

## Overview
Wkly uses a **centralized design token system** with runtime palette switching, dark mode support, and a comprehensive design scale.

---

## 🎨 Color System

### Source of Truth
**All colors are defined in [`appColors.ts`](./appColors.ts)** and applied as CSS variables at runtime.

### Available Palettes
- **Purple** (default) - Primary brand
- **Blue** - Ocean/professional
- **Indigo** - Deep/modern
- **Green** - Natural/success
- **Teal** - Fresh/energetic
- **Orange** - Warm/creative
- **Red** - Alert/passionate
- **Gray** - Neutral system

### Usage

#### Direct Scale Colors
```jsx
// Tailwind utilities
<div className="bg-brand-60 text-brand-10">
<p className="text-gray-70 dark:text-gray-30">
```

#### Semantic Tokens (Recommended)
```jsx
// Use semantic names for better maintainability
<p className="text-primary-text">        // Auto: gray-100 (light) / gray-10 (dark)
<p className="text-secondary">           // Helper class: gray-70 / gray-30
<button className="bg-primary-button">   // Auto: brand-70 (light) / brand-30 (dark)
```

### Switching Palettes
```typescript
import appColors from '@styles/appColors';

// Change the entire brand color scale
appColors.applyPaletteToRoot('blue');
appColors.applyPaletteToRoot('green');
```

---

## ✍️ Typography

### Font Family
**Inter** is the standard typeface across all components.

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale

| Size | Token | Value | Usage |
|------|-------|-------|-------|
| `xs` | `--font-size-xs` | 12px | Captions, small labels |
| `sm` | `--font-size-sm` | 14px | Body small, secondary text |
| `base` | `--font-size-base` | 16px | Body text (default) |
| `lg` | `--font-size-lg` | 18px | Emphasized body text |
| `xl` | `--font-size-xl` | 24px | H4, section headings |
| `2xl` | `--font-size-2xl` | 32px | H3, card titles |
| `3xl` | `--font-size-3xl` | 40px | H2, page headings |
| `4xl` | `--font-size-4xl` | 48px | H1, hero text |

### Usage
```jsx
// Tailwind
<h1 className="text-3xl font-semibold">Page Title</h1>
<p className="text-base">Body text</p>
<span className="text-xs text-muted">Caption</span>

// CSS Variables
h1 { font-size: var(--font-size-3xl); }
```

### Line Heights
- **Tight** (`--line-height-tight`): 1.25 - Headings
- **Base** (`--line-height-base`): 1.5 - Body text
- **Relaxed** (`--line-height-relaxed`): 1.75 - Long-form content

### Font Weights
- `font-normal` (400) - Body text
- `font-medium` (500) - Emphasized text
- `font-semibold` (600) - Subheadings
- `font-bold` (700) - Headings

---

## 📏 Spacing System

Based on an **8px grid system** for consistent visual rhythm.

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `spacing-0` | 0 | `p-0`, `m-0` | Reset |
| `spacing-1` | 4px | `p-1`, `gap-1` | Tight spacing |
| `spacing-2` | 8px | `p-2`, `gap-2` | Compact spacing |
| `spacing-3` | 12px | `p-3`, `gap-3` | Close spacing |
| `spacing-4` | 16px | `p-4`, `gap-4` | Standard spacing |
| `spacing-5` | 20px | `p-5`, `gap-5` | Comfortable spacing |
| `spacing-6` | 24px | `p-6`, `gap-6` | Spacious |
| `spacing-8` | 32px | `p-8`, `gap-8` | Section spacing |
| `spacing-10` | 40px | `p-10` | Large spacing |
| `spacing-12` | 48px | `p-12` | XL spacing |
| `spacing-16` | 64px | `p-16` | 2XL spacing |
| `spacing-20` | 80px | `p-20` | 3XL spacing |
| `spacing-24` | 96px | `p-24` | Hero spacing |

### Usage
```jsx
// Standard card padding
<div className="p-4">

// Section spacing
<div className="px-6 py-8">

// Flex gaps
<div className="flex gap-4">
```

---

## 🧩 Common Utility Classes

### Text Colors (Auto Dark Mode)
```jsx
<p className="text-secondary">     // gray-70 / gray-30
<span className="text-muted">      // gray-60 / gray-40
<small className="text-subtle">    // gray-50 / gray-50
<span className="text-on-brand">   // gray-10 / gray-100 (for brand backgrounds)
```

### Layout Patterns
```jsx
<div className="flex-center">      // flex items-center justify-center
<div className="flex-between">     // flex items-center justify-between
<div className="flex-start">       // flex items-center justify-start
<section className="section-spacing"> // px-4 sm:px-6 md:px-8
<div className="content-spacing">  // space-y-4
```

### Buttons
```jsx
<button className="btn-primary">Primary Action</button>
<button className="btn-secondary">Secondary Action</button>
<button className="btn-ghost">Subtle Action</button>
<button className="btn-summary">Text Button</button>
```

---

## 🌗 Dark Mode

### Implementation
Dark mode uses **class-based strategy**:
```html
<html class="dark">
```

### Theme Switching
```typescript
// Add/remove 'dark' class from documentElement
document.documentElement.classList.add('dark');
document.documentElement.classList.remove('dark');

// Persist in localStorage
localStorage.setItem('theme', 'theme-dark');
localStorage.setItem('theme', 'theme-light');
```

### Best Practices
1. **Always use dark mode variants** with Tailwind:
   ```jsx
   <div className="bg-gray-10 dark:bg-gray-90">
   ```

2. **Prefer semantic tokens** (auto dark mode):
   ```jsx
   <p className="text-secondary">  // Auto: gray-70 / gray-30
   ```

3. **Test both modes** when building new components

---

## 📦 Where Things Live

| Concept | File | Purpose |
|---------|------|---------|
| **Color Palettes** | [`appColors.ts`](./appColors.ts) | 7 complete color palettes, runtime switching |
| **Design Tokens** | [`variables.scss`](./variables.scss) | Typography, spacing, semantic color maps |
| **Tailwind Config** | [`tailwind.config.js`](../../tailwind.config.js) | Maps CSS vars to Tailwind utilities |
| **Utility Classes** | [`index.css`](../index.css) | Common patterns, button styles |
| **Shared Classes** | [`classes.tsx`](./classes.tsx) | Reusable Tailwind class strings |
| **MUI Theme** | [`mui/muiTheme.tsx`](../mui/muiTheme.tsx) | Material-UI theme matching design tokens |

---

## 🎯 Quick Reference

### Most Common Patterns

#### Card Component
```jsx
<div className="p-4 rounded-lg bg-gray-10 dark:bg-gray-90 shadow-sm">
  <h3 className="text-xl font-semibold mb-2">Title</h3>
  <p className="text-secondary">Description</p>
</div>
```

#### Form Field
```jsx
<div className="space-y-2">
  <label className="text-sm font-medium text-secondary">Label</label>
  <input className="w-full px-4 py-2 border border-gray-30 dark:border-gray-70 rounded-lg" />
</div>
```

#### Button Group
```jsx
<div className="flex gap-2">
  <button className="btn-primary">Confirm</button>
  <button className="btn-ghost">Cancel</button>
</div>
```

#### Section Header
```jsx
<div className="flex-between mb-6">
  <h2 className="text-2xl font-bold">Section Title</h2>
  <button className="btn-primary">Add New</button>
</div>
```

---

## 🔄 Migration Notes

### Recent Changes (March 2026)
1. ✅ **Font standardized to Inter** (was Open Sans)
2. ✅ **Font serif standardized to Neuton** (was nothing)
2. ✅ **Typography scale defined** (xs-4xl with semantic names)
3. ✅ **Spacing scale standardized** (8px grid system)
4. ✅ **Colors consolidated** to appColors.ts (removed SCSS duplicates)
5. ✅ **Utility classes added** for common patterns

### Breaking Changes
- `--font-size` → `--font-size-base`
- Hardcoded brand/gray SCSS variables removed (use CSS vars)
- Font family changed from Open Sans to Inter

---

## 💡 Best Practices

1. **Use semantic tokens** over direct colors when possible
2. **Test both light and dark modes** for every component
3. **Follow the 8px spacing grid** for visual consistency
4. **Use the typography scale** instead of arbitrary font sizes
5. **Prefer utility classes** over inline styles
6. **Reference CSS variables** in custom components

---

## 🐛 Troubleshooting

### Colors not updating?
- Check that `appColors.ts` is imported in your app entry point
- Verify CSS variables are applied: inspect `:root` in DevTools

### Font not loading?
- Verify Inter font link in `index.html`
- Check network tab for successful Google Fonts load

### Dark mode not working?
- Ensure `.dark` class is on `<html>` element
- Check that dark variants are defined in Tailwind classes

---

**Questions?** See the [Tailwind config](../../tailwind.config.js) or [variables.scss](./variables.scss) for implementation details.
