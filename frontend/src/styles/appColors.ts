// Centralized color palettes and runtime application helper
// Seven websafe palettes: gray, red, orange, teal, green, blue, indigo, purple (default)

export type PaletteKey = 'gray' | 'red' | 'orange' | 'teal' | 'green' | 'blue' | 'indigo' | 'purple';

export const PALETTES: Record<PaletteKey, Record<number, string>> = {
  purple: {
    0: "#FEF4FF",
    10: "#FCE8FF",
    20: "#F8C1FF",
    30: "#E760F8",
    40: "#B900D2",
    50: "#8B009E",
    60: "#680076",
    70: "#4C0056",
    80: "#2F0035",
    90: "#1D0020",
    100: "#0F0012",
    // 100: '#17001b',90:'#230028',80:'#3b0043',70:'#4d0057',60:'#570082',50:'#6a0078',40:'#760086',30:'#c300dc',20:'#E737FE',10:'#F07DFF',0:'#F8C1FF'
  },
  blue: {
    0: "#F3FBFF",
    10: "#CFEFFF",
    20: "#8FD9FF",
    30: "#3FB1FF",
    40: "#0B78FF",
    50: "#0B61C7",
    60: "#0E4AA0",
    70: "#143A6A",
    80: "#123152",
    90: "#0F1A39",
    100: "#0B1226",
    // 100: '#0b1226',90:'#0f1a39',80:'#123152',70:'#143a6a',60:'#0e4aa0',50:'#0b61c7',40:'#0b78ff',30:'#3fb1ff',20:'#8fd9ff',10:'#cfefff',0:'#f3fbff'
  },
  indigo: {
    0: "#F5F3FF",
    10: "#DDD6FF",
    20: "#C4BAFF",
    30: "#7B6CF0",
    40: "#5A42D0",
    50: "#4430B5",
    60: "#37298F",
    70: "#2C1E59",
    80: "#241645",
    90: "#170A2B",
    100: "#0F0820",
    // 100: '#0f0820',90:'#170a2b',80:'#241645',70:'#2c1e59',60:'#37298f',50:'#4430b5',40:'#5a42d0',30:'#7b6cf0',20:'#a99bfb',10:'#d9d1ff',0:'#f5f3ff'
  },
  green: {
    0: "#F7FFF7",
    10: "#E6FBEC",
    20: "#B6F2D1",
    30: "#6EE59F",
    40: "#35C77D",
    50: "#18A25A",
    60: "#127A3F",
    70: "#0F4D2F",
    80: "#0E3B26",
    90: "#0B261B",
    100: "#081912",
    // 100: '#081912',90:'#0b261b',80:'#0e3b26',70:'#0f4d2f',60:'#127a3f',50:'#18a25a',40:'#35c77d',30:'#6ee59f',20:'#b6f2d1',10:'#e6fbec',0:'#f7fff7'
  },
  teal: {
    0: "#F7FFFB",
    10: "#CFFFF6",
    20: "#90F0E6",
    30: "#2FE0C9",
    40: "#00B6A8",
    50: "#008F86",
    60: "#006B66",
    70: "#074B4F",
    80: "#07393B",
    90: "#082421",
    100: "#071718",
    // 100: '#071718',90:'#082421',80:'#07393b',70:'#074b4f',60:'#006b66',50:'#008f86',40:'#00b6a8',30:'#2fe0c9',20:'#90f0e6',10:'#cffff6',0:'#f7fffb'
  },
  orange: {
    0: "#FFF7EF",
    10: "#FFF0DC",
    20: "#FFD9B3",
    30: "#FFB470",
    40: "#FF8A37",
    50: "#D35F1A",
    60: "#A5440E",
    70: "#7B2C09",
    80: "#5A2007",
    90: "#3A1605",
    100: "#2B1203",
    // 100: '#2b1203',90:'#3a1605',80:'#5a2007',70:'#7b2c09',60:'#a5440e',50:'#d35f1a',40:'#ff8a37',30:'#ffb470',20:'#ffd9b3',10:'#fff0dc',0:'#fff7ef'
  },
  red: {
    0: "#FFF7F7",
    10: "#FFECEC",
    20: "#FFCFCF",
    30: "#FF8B8B",
    40: "#FF4B4B",
    50: "#D22525",
    60: "#A51B1B",
    70: "#7B1414",
    80: "#5A0F0F",
    90: "#3A0A0A",
    100: "#2B0606",
    // 100: '#2b0606',90:'#3a0a0a',80:'#5a0f0f',70:'#7b1414',60:'#a51b1b',50:'#d22525',40:'#ff4b4b',30:'#ff8b8b',20:'#ffcfcf',10:'#ffecec',0:'#fff7f7'
  },
  gray: {
    0: "#F4F4F4",
    10: "#EDEDED",
    20: "#D7D7D7",
    30: "#B4B4B4",
    40: "#A4A4A4",
    50: "#808080",
    60: "#666666",
    70: "#4D4D4D",
    80: "#333333",
    90: "#1A1A1A",
    100: "#181818"
    // 100: '#181818',90: '#1A1A1A',80: '#333333',70: '#4D4D4D',60: '#666666',50: '#808080',40: '#a4a4a4',30: '#b4b4b4',20: '#D7D7D7',10: '#EDEDED',0: '#F4F4F4',
  },
};



const BRAND_STEPS = [100,90,80,70,60,50,40,30,20,10,0];

// Apply a palette to :root CSS variables for brand-N and also mirror existing --primary-brand variables
export const PALETTE_UPDATED_EVENT = 'wkly:palette-updated';

export function applyPaletteToRoot(key: PaletteKey) {
  const palette = PALETTES[key];
  const root = document.documentElement;
  BRAND_STEPS.forEach(step => {
    root.style.setProperty(`--brand-${step}`, palette[step]);
    // also set `--primary-brand-` tokens used by variables.scss
    root.style.setProperty(`--primary-brand-${step}`, palette[step]);
  });
  // persist chosen palette key in localStorage for non-auth flows
  try { localStorage.setItem('wkly:primary_palette', key); } catch (e) { /* ignore */ }
  // dispatch a simple CustomEvent so other parts of the app (MUI provider)
  // can reactively rebuild their theme.
  try {
    window.dispatchEvent(new CustomEvent(PALETTE_UPDATED_EVENT, { detail: { palette: key } }));
  } catch (e) {
    // ignore
  }
}

export function resetPaletteToDefault() {
  applyPaletteToRoot('purple');
  try { localStorage.removeItem('wkly:primary_palette'); } catch (e) {}
}

export function getStoredPalette(): PaletteKey | null {
  try { const k = localStorage.getItem('wkly:primary_palette'); return (k as PaletteKey) || null; } catch (e) { return null; }
}

export default { PALETTES, applyPaletteToRoot, resetPaletteToDefault, getStoredPalette };
