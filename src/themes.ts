// Theme system. Each theme is a flat map of CSS custom properties applied to
// :root, plus a matching xterm.js terminal palette. Add a theme by appending
// to THEMES — everything else (gallery, persistence) picks it up automatically.

export interface TerminalPalette {
  background: string
  foreground: string
  cursor: string
  selectionBackground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
}

export interface Theme {
  id: string
  name: string
  group: 'Dark' | 'Light'
  /** Two swatches shown in the gallery preview. */
  swatch: [string, string, string]
  vars: Record<string, string>
  terminal: TerminalPalette
}

const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"
const SANS = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif"

const ansiDark: Omit<TerminalPalette, 'background' | 'foreground' | 'cursor' | 'selectionBackground'> = {
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
}

export const THEMES: Theme[] = [
  {
    id: 'codex',
    name: 'Codex',
    group: 'Dark',
    swatch: ['#0d0d0d', '#ededed', '#c9a37c'],
    vars: {
      '--bg': '#0d0d0d',
      '--bg-elev': '#121212',
      '--bg-2': '#171717',
      '--bg-3': '#1f1f1f',
      '--border': '#262626',
      '--border-soft': '#1a1a1a',
      '--text': '#ededed',
      '--text-dim': '#9a9a9a',
      '--text-faint': '#666666',
      '--accent': '#c9a37c',
      '--accent-press': '#b88f66',
      '--accent-ink': '#1a1308',
      '--blue': '#8ab4f8',
      '--purple': '#c3a6ff',
      '--yellow': '#e6c46a',
      '--danger': '#e0707a',
      '--add': '#7fb37f',
      '--del': '#e0707a',
      '--add-bg': 'rgba(127,179,127,0.10)',
      '--del-bg': 'rgba(224,112,122,0.10)',
      '--radius': '5px',
      '--radius-sm': '4px',
      '--shadow': '0 4px 16px rgba(0,0,0,0.4)',
      '--font-ui': SANS,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: {
      background: '#0d0d0d',
      foreground: '#ededed',
      cursor: '#c9a37c',
      selectionBackground: '#2a2a2a',
      black: '#3a3a3a',
      red: '#e0707a',
      green: '#7fb37f',
      yellow: '#e6c46a',
      blue: '#8ab4f8',
      magenta: '#c3a6ff',
      cyan: '#7fc3c3',
      white: '#c8c8c8',
      brightBlack: '#6e6e6e',
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    group: 'Dark',
    swatch: ['#0b0f14', '#45b884', '#4aa8ff'],
    vars: {
      '--bg': '#0b0f14',
      '--bg-elev': '#11161d',
      '--bg-2': '#161c24',
      '--bg-3': '#1d2631',
      '--border': '#232c38',
      '--border-soft': '#19212b',
      '--text': '#e6edf3',
      '--text-dim': '#8b98a9',
      '--text-faint': '#5c6773',
      '--accent': '#45b884',
      '--accent-press': '#3aa073',
      '--accent-ink': '#04130c',
      '--blue': '#4aa8ff',
      '--purple': '#b08cff',
      '--yellow': '#d9a441',
      '--danger': '#f0626b',
      '--add': '#3fb950',
      '--del': '#f0626b',
      '--add-bg': 'rgba(63,185,80,0.13)',
      '--del-bg': 'rgba(240,98,107,0.12)',
      '--radius': '9px',
      '--radius-sm': '6px',
      '--shadow': '0 12px 40px rgba(0,0,0,0.5)',
      '--font-ui': SANS,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: { background: '#0b0f14', foreground: '#e6edf3', cursor: '#45b884', selectionBackground: '#264f78', ...ansiDark },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    group: 'Dark',
    swatch: ['#05070d', '#5b8cff', '#9d7bff'],
    vars: {
      '--bg': '#05070d',
      '--bg-elev': '#0b0e17',
      '--bg-2': '#11151f',
      '--bg-3': '#171d2a',
      '--border': '#1c2435',
      '--border-soft': '#141a26',
      '--text': '#dfe6f5',
      '--text-dim': '#8089a3',
      '--text-faint': '#525b73',
      '--accent': '#5b8cff',
      '--accent-press': '#4a78e6',
      '--accent-ink': '#040813',
      '--blue': '#5b8cff',
      '--purple': '#9d7bff',
      '--yellow': '#e0b54a',
      '--danger': '#ff6b78',
      '--add': '#4ec46a',
      '--del': '#ff6b78',
      '--add-bg': 'rgba(78,196,106,0.12)',
      '--del-bg': 'rgba(255,107,120,0.12)',
      '--radius': '10px',
      '--radius-sm': '7px',
      '--shadow': '0 14px 44px rgba(0,0,0,0.6)',
      '--font-ui': SANS,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: { background: '#05070d', foreground: '#dfe6f5', cursor: '#5b8cff', selectionBackground: '#23335c', ...ansiDark, blue: '#5b8cff' },
  },
  {
    id: 'light',
    name: 'Daylight',
    group: 'Light',
    swatch: ['#ffffff', '#1f9d63', '#2f7bd6'],
    vars: {
      '--bg': '#ffffff',
      '--bg-elev': '#f6f8fa',
      '--bg-2': '#eef1f4',
      '--bg-3': '#e3e8ee',
      '--border': '#d6dce2',
      '--border-soft': '#e6eaee',
      '--text': '#1c2530',
      '--text-dim': '#5c6773',
      '--text-faint': '#8b98a9',
      '--accent': '#1f9d63',
      '--accent-press': '#188052',
      '--accent-ink': '#ffffff',
      '--blue': '#2f7bd6',
      '--purple': '#8257e6',
      '--yellow': '#b8860b',
      '--danger': '#d83a44',
      '--add': '#1f9d63',
      '--del': '#d83a44',
      '--add-bg': 'rgba(31,157,99,0.12)',
      '--del-bg': 'rgba(216,58,68,0.1)',
      '--radius': '9px',
      '--radius-sm': '6px',
      '--shadow': '0 12px 40px rgba(60,70,90,0.18)',
      '--font-ui': SANS,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: {
      background: '#ffffff',
      foreground: '#1c2530',
      cursor: '#1f9d63',
      selectionBackground: '#cfe6db',
      black: '#1c2530',
      red: '#cf222e',
      green: '#1a7f37',
      yellow: '#9a6700',
      blue: '#2f7bd6',
      magenta: '#8250df',
      cyan: '#1b7c83',
      white: '#6e7781',
      brightBlack: '#8b98a9',
    },
  },
  {
    id: 'boxy',
    name: 'Boxy',
    group: 'Dark',
    swatch: ['#141414', '#e8a13a', '#7aa2f7'],
    vars: {
      '--bg': '#141414',
      '--bg-elev': '#1a1a1a',
      '--bg-2': '#202020',
      '--bg-3': '#2a2a2a',
      '--border': '#3a3a3a',
      '--border-soft': '#2a2a2a',
      '--text': '#ececec',
      '--text-dim': '#9a9a9a',
      '--text-faint': '#6a6a6a',
      '--accent': '#e8a13a',
      '--accent-press': '#d18f2e',
      '--accent-ink': '#1a1206',
      '--blue': '#7aa2f7',
      '--purple': '#bb9af7',
      '--yellow': '#e8a13a',
      '--danger': '#f7768e',
      '--add': '#9ece6a',
      '--del': '#f7768e',
      '--add-bg': 'rgba(158,206,106,0.12)',
      '--del-bg': 'rgba(247,118,142,0.12)',
      '--radius': '0px',
      '--radius-sm': '0px',
      '--shadow': '0 0 0 1px #3a3a3a',
      '--font-ui': MONO,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: { background: '#141414', foreground: '#ececec', cursor: '#e8a13a', selectionBackground: '#3a3a3a', ...ansiDark, yellow: '#e8a13a', green: '#9ece6a' },
  },
  {
    id: 'claude',
    name: 'Claude',
    group: 'Dark',
    swatch: ['#262320', '#d97757', '#cc9b7a'],
    vars: {
      '--bg': '#1f1d1a',
      '--bg-elev': '#262320',
      '--bg-2': '#2e2a26',
      '--bg-3': '#38332e',
      '--border': '#403a33',
      '--border-soft': '#2e2a26',
      '--text': '#f0ebe4',
      '--text-dim': '#a89c8d',
      '--text-faint': '#6f655a',
      '--accent': '#d97757',
      '--accent-press': '#c5664a',
      '--accent-ink': '#241008',
      '--blue': '#7fa0c0',
      '--purple': '#b89cc4',
      '--yellow': '#d9a441',
      '--danger': '#d96a5e',
      '--add': '#94b87a',
      '--del': '#d96a5e',
      '--add-bg': 'rgba(148,184,122,0.12)',
      '--del-bg': 'rgba(217,106,94,0.12)',
      '--radius': '12px',
      '--radius-sm': '8px',
      '--shadow': '0 14px 44px rgba(0,0,0,0.45)',
      '--font-ui': SANS,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: {
      background: '#1f1d1a',
      foreground: '#f0ebe4',
      cursor: '#d97757',
      selectionBackground: '#4a423a',
      black: '#6f655a',
      red: '#d96a5e',
      green: '#94b87a',
      yellow: '#d9a441',
      blue: '#7fa0c0',
      magenta: '#b89cc4',
      cyan: '#7fb0a8',
      white: '#f0ebe4',
      brightBlack: '#a89c8d',
    },
  },
  {
    id: 'hacker',
    name: 'Hacker',
    group: 'Dark',
    swatch: ['#000000', '#00ff66', '#00cc52'],
    vars: {
      '--bg': '#000000',
      '--bg-elev': '#050a05',
      '--bg-2': '#0a140a',
      '--bg-3': '#0f1f0f',
      '--border': '#1a331a',
      '--border-soft': '#0f1f0f',
      '--text': '#00ff66',
      '--text-dim': '#19a64d',
      '--text-faint': '#0e6630',
      '--accent': '#00ff66',
      '--accent-press': '#00cc52',
      '--accent-ink': '#001a08',
      '--blue': '#00e0c0',
      '--purple': '#7fff7f',
      '--yellow': '#caff00',
      '--danger': '#ff3355',
      '--add': '#00ff66',
      '--del': '#ff3355',
      '--add-bg': 'rgba(0,255,102,0.1)',
      '--del-bg': 'rgba(255,51,85,0.1)',
      '--radius': '2px',
      '--radius-sm': '2px',
      '--shadow': '0 0 0 1px #1a331a',
      '--font-ui': MONO,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: {
      background: '#000000',
      foreground: '#00ff66',
      cursor: '#00ff66',
      selectionBackground: '#1a331a',
      black: '#0e6630',
      red: '#ff3355',
      green: '#00ff66',
      yellow: '#caff00',
      blue: '#00e0c0',
      magenta: '#7fff7f',
      cyan: '#00e0c0',
      white: '#9dffb0',
      brightBlack: '#19a64d',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    group: 'Dark',
    swatch: ['#1a1033', '#ff4fd8', '#36e3ff'],
    vars: {
      '--bg': '#160d2e',
      '--bg-elev': '#1d1240',
      '--bg-2': '#26194f',
      '--bg-3': '#2f2060',
      '--border': '#3a2a72',
      '--border-soft': '#271a52',
      '--text': '#f4e9ff',
      '--text-dim': '#b39cd6',
      '--text-faint': '#7a64a8',
      '--accent': '#ff4fd8',
      '--accent-press': '#e63ec0',
      '--accent-ink': '#2a0820',
      '--blue': '#36e3ff',
      '--purple': '#b76bff',
      '--yellow': '#ffcf4f',
      '--danger': '#ff5a7a',
      '--add': '#5affc9',
      '--del': '#ff5a7a',
      '--add-bg': 'rgba(90,255,201,0.1)',
      '--del-bg': 'rgba(255,90,122,0.12)',
      '--radius': '11px',
      '--radius-sm': '7px',
      '--shadow': '0 14px 50px rgba(255,79,216,0.18)',
      '--font-ui': SANS,
      '--font-mono': MONO,
      '--border-width': '1px',
    },
    terminal: {
      background: '#160d2e',
      foreground: '#f4e9ff',
      cursor: '#ff4fd8',
      selectionBackground: '#3a2a72',
      black: '#7a64a8',
      red: '#ff5a7a',
      green: '#5affc9',
      yellow: '#ffcf4f',
      blue: '#36e3ff',
      magenta: '#ff4fd8',
      cyan: '#36e3ff',
      white: '#f4e9ff',
      brightBlack: '#b39cd6',
    },
  },
]

export const DEFAULT_THEME = 'codex'

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export const UI_FONTS: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif",
  rounded: "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', 'Nunito', 'Quicksand', system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
  serif: "'Iowan Old Style', Georgia, 'Times New Roman', serif",
}

const CORNERS: Record<string, { r: string; sm: string }> = {
  sharp: { r: '0px', sm: '0px' },
  soft: { r: '', sm: '' }, // keep the theme's own values
  round: { r: '16px', sm: '11px' },
}

export interface AccentDef {
  id: string
  name: string
  accent: string
  press: string
  ink: string
}

export const ACCENTS: AccentDef[] = [
  { id: 'theme', name: 'Theme', accent: '', press: '', ink: '' },
  { id: 'green', name: 'Green', accent: '#45b884', press: '#3aa073', ink: '#04130c' },
  { id: 'blue', name: 'Blue', accent: '#4aa8ff', press: '#3a92e6', ink: '#021223' },
  { id: 'purple', name: 'Purple', accent: '#b08cff', press: '#9a72f0', ink: '#160a2e' },
  { id: 'pink', name: 'Pink', accent: '#ff5fb0', press: '#ec4a9d', ink: '#2a0418' },
  { id: 'orange', name: 'Orange', accent: '#ff8c42', press: '#f0762a', ink: '#240f02' },
  { id: 'red', name: 'Red', accent: '#f0626b', press: '#dd4d56', ink: '#250507' },
  { id: 'teal', name: 'Teal', accent: '#2dd4bf', press: '#22b8a5', ink: '#022420' },
  { id: 'amber', name: 'Amber', accent: '#e8b339', press: '#d49f28', ink: '#241a04' },
]

export const MONO_FONTS: Record<string, string> = {
  system: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  jetbrains: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  fira: "'Fira Code', ui-monospace, Menlo, monospace",
  ibm: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
  commit: "'Commit Mono', ui-monospace, Menlo, monospace",
  mono45: "'Monaspace Neon', ui-monospace, Menlo, monospace",
}

const UI_ZOOM: Record<string, string> = { small: '0.9', normal: '1', large: '1.12' }

export interface StyleOptions {
  density: 'comfortable' | 'compact'
  uiFont: keyof typeof UI_FONTS
  corners: keyof typeof CORNERS
  /** @deprecated use motion. Kept for backward compat with old configs. */
  animations: boolean
  motion?: 'none' | 'subtle' | 'normal' | 'expressive'
  branchBarWidth?: 'thin' | 'medium' | 'thick'
  tabStyle?: 'filled' | 'outlined' | 'minimal'
  tabDensity?: 'compact' | 'comfortable' | 'spacious'
  topbarDensity?: 'compact' | 'comfortable'
  accent: string
  accentColor?: string
  uiScale?: string
  monoFont?: string
  reduceTransparency?: boolean
}

/** Apply a theme plus the user's structural style choices to the document root. */
export function applyTheme(id: string, opts: StyleOptions): void {
  const theme = getTheme(id)
  const root = document.documentElement
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v)

  // UI font override (mono stays from the theme).
  root.style.setProperty('--font-ui', UI_FONTS[opts.uiFont] ?? UI_FONTS.system)

  // Corner style override (soft = theme default, so clear any prior override).
  const corner = CORNERS[opts.corners] ?? CORNERS.soft
  if (corner.r) {
    root.style.setProperty('--radius', corner.r)
    root.style.setProperty('--radius-sm', corner.sm)
  } else {
    root.style.removeProperty('--radius')
    root.style.removeProperty('--radius-sm')
  }

  // Accent override ('theme' keeps the theme's own accent; 'custom' uses hex).
  if (opts.accent === 'custom' && opts.accentColor) {
    root.style.setProperty('--accent', opts.accentColor)
    root.style.setProperty('--accent-press', opts.accentColor)
    root.style.setProperty('--accent-ink', contrastInk(opts.accentColor))
  } else {
    const accent = ACCENTS.find((a) => a.id === opts.accent)
    if (accent && accent.id !== 'theme') {
      root.style.setProperty('--accent', accent.accent)
      root.style.setProperty('--accent-press', accent.press)
      root.style.setProperty('--accent-ink', accent.ink)
    }
  }

  // Monospace font + UI scale.
  if (opts.monoFont && MONO_FONTS[opts.monoFont]) {
    root.style.setProperty('--font-mono', MONO_FONTS[opts.monoFont])
  }

  root.dataset.theme = theme.id
  root.dataset.group = theme.group.toLowerCase()
  root.dataset.density = opts.density
  // Motion: 'none' → legacy animations:off. Otherwise drive via data-motion and
  // CSS variables defined under each level in index.css.
  const motion = opts.motion ?? (opts.animations ? 'normal' : 'none')
  root.dataset.motion = motion
  root.dataset.animations = motion === 'none' ? 'off' : 'on'
  root.dataset.branchbar = opts.branchBarWidth ?? 'medium'
  root.dataset.tabstyle = opts.tabStyle ?? 'filled'
  root.dataset.tabdensity = opts.tabDensity ?? 'comfortable'
  root.dataset.topbar = opts.topbarDensity ?? 'comfortable'
  root.dataset.uifont = opts.uiFont
  root.dataset.transparency = opts.reduceTransparency ? 'off' : 'on'
  // Whole-window zoom via Chromium page zoom (keeps layout/structure intact;
  // CSS zoom on <html> breaks 100vh sizing).
  try {
    window.bonsai?.setZoom?.(Number(UI_ZOOM[opts.uiScale ?? 'normal'] ?? '1'))
  } catch {
    /* not in a Bonsai window */
  }
}

/** Apply a full AppConfig-shaped object's appearance to the document. */
export function applyConfigStyle(c: {
  theme: string
  density: 'comfortable' | 'compact'
  uiFont: string
  corners: string
  animations: boolean
  accent: string
  accentColor?: string
  uiScale?: string
  monoFont?: string
  reduceTransparency?: boolean
}): void {
  applyTheme(c.theme, {
    density: c.density,
    uiFont: c.uiFont,
    corners: c.corners,
    animations: c.animations,
    accent: c.accent,
    accentColor: c.accentColor,
    uiScale: c.uiScale,
    monoFont: c.monoFont,
    reduceTransparency: c.reduceTransparency,
  })
}

/** Pick black or white ink for legible text on an arbitrary accent color. */
function contrastInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#04130c'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#10130a' : '#ffffff'
}
