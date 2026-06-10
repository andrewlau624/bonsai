// Ghostty-style terminal config. Bonsai's terminal is xterm.js, not Ghostty, so
// we parse the subset of Ghostty's `key = value` config that maps cleanly onto
// xterm options + the terminal pane's CSS. Unknown keys are ignored (Ghostty has
// hundreds); known keys with bad values surface a warning in Settings.
import type { ITheme } from '@xterm/xterm'

export interface ParsedTerminalConfig {
  fontFamily?: string
  fontSize?: number
  /** xterm lineHeight multiplier (1.0 = default), from `adjust-cell-height = N%`. */
  lineHeight?: number
  cursorStyle?: 'block' | 'bar' | 'underline'
  cursorBlink?: boolean
  paddingX?: number
  paddingY?: number
  /** Color overrides merged onto the active theme's terminal palette. */
  theme?: ITheme
  warnings: string[]
}

/** Built-in terminal palettes selectable via `theme = <name>` (Ghostty-style). */
export const TERMINAL_THEMES: { name: string; theme: ITheme }[] = [
  {
    name: 'Catppuccin Macchiato',
    theme: {
      background: '#24273a', foreground: '#cad3f5', cursor: '#f4dbd6', cursorAccent: '#24273a',
      selectionBackground: '#5b6078',
      black: '#494d64', red: '#ed8796', green: '#a6da95', yellow: '#eed49f',
      blue: '#8aadf4', magenta: '#f5bde6', cyan: '#8bd5ca', white: '#b8c0e0',
      brightBlack: '#5b6078', brightRed: '#ed8796', brightGreen: '#a6da95', brightYellow: '#eed49f',
      brightBlue: '#8aadf4', brightMagenta: '#f5bde6', brightCyan: '#8bd5ca', brightWhite: '#a5adcb',
    },
  },
  {
    name: 'Catppuccin Mocha',
    theme: {
      background: '#1e1e2e', foreground: '#cdd6f4', cursor: '#f5e0dc', cursorAccent: '#1e1e2e',
      selectionBackground: '#585b70',
      black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af',
      blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
      brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1', brightYellow: '#f9e2af',
      brightBlue: '#89b4fa', brightMagenta: '#f5c2e7', brightCyan: '#94e2d5', brightWhite: '#a6adc8',
    },
  },
  {
    name: 'Catppuccin Frappe',
    theme: {
      background: '#303446', foreground: '#c6d0f5', cursor: '#f2d5cf', cursorAccent: '#303446',
      selectionBackground: '#626880',
      black: '#51576d', red: '#e78284', green: '#a6d189', yellow: '#e5c890',
      blue: '#8caaee', magenta: '#f4b8e4', cyan: '#81c8be', white: '#b5bfe2',
      brightBlack: '#626880', brightRed: '#e78284', brightGreen: '#a6d189', brightYellow: '#e5c890',
      brightBlue: '#8caaee', brightMagenta: '#f4b8e4', brightCyan: '#81c8be', brightWhite: '#a5adce',
    },
  },
  {
    name: 'Catppuccin Latte',
    theme: {
      background: '#eff1f5', foreground: '#4c4f69', cursor: '#dc8a78', cursorAccent: '#eff1f5',
      selectionBackground: '#acb0be',
      black: '#5c5f77', red: '#d20f39', green: '#40a02b', yellow: '#df8e1d',
      blue: '#1e66f5', magenta: '#ea76cb', cyan: '#179299', white: '#acb0be',
      brightBlack: '#6c6f85', brightRed: '#d20f39', brightGreen: '#40a02b', brightYellow: '#df8e1d',
      brightBlue: '#1e66f5', brightMagenta: '#ea76cb', brightCyan: '#179299', brightWhite: '#bcc0cc',
    },
  },
  {
    name: 'Dracula',
    theme: {
      background: '#282a36', foreground: '#f8f8f2', cursor: '#f8f8f2', cursorAccent: '#282a36',
      selectionBackground: '#44475a',
      black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
      blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
      brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94', brightYellow: '#ffffa5',
      brightBlue: '#d6acff', brightMagenta: '#ff92df', brightCyan: '#a4ffff', brightWhite: '#ffffff',
    },
  },
  {
    name: 'Nord',
    theme: {
      background: '#2e3440', foreground: '#d8dee9', cursor: '#d8dee9', cursorAccent: '#2e3440',
      selectionBackground: '#434c5e',
      black: '#3b4252', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b',
      blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', white: '#e5e9f0',
      brightBlack: '#4c566a', brightRed: '#bf616a', brightGreen: '#a3be8c', brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1', brightMagenta: '#b48ead', brightCyan: '#8fbcbb', brightWhite: '#eceff4',
    },
  },
  {
    name: 'Tokyo Night',
    theme: {
      background: '#1a1b26', foreground: '#c0caf5', cursor: '#c0caf5', cursorAccent: '#1a1b26',
      selectionBackground: '#283457',
      black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
      blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
      brightBlack: '#414868', brightRed: '#f7768e', brightGreen: '#9ece6a', brightYellow: '#e0af68',
      brightBlue: '#7aa2f7', brightMagenta: '#bb9af7', brightCyan: '#7dcfff', brightWhite: '#c0caf5',
    },
  },
  {
    name: 'Gruvbox Dark',
    theme: {
      background: '#282828', foreground: '#ebdbb2', cursor: '#ebdbb2', cursorAccent: '#282828',
      selectionBackground: '#504945',
      black: '#282828', red: '#cc241d', green: '#98971a', yellow: '#d79921',
      blue: '#458588', magenta: '#b16286', cyan: '#689d6a', white: '#a89984',
      brightBlack: '#928374', brightRed: '#fb4934', brightGreen: '#b8bb26', brightYellow: '#fabd2f',
      brightBlue: '#83a598', brightMagenta: '#d3869b', brightCyan: '#8ec07c', brightWhite: '#ebdbb2',
    },
  },
  {
    name: 'One Dark',
    theme: {
      background: '#282c34', foreground: '#abb2bf', cursor: '#528bff', cursorAccent: '#282c34',
      selectionBackground: '#3e4451',
      black: '#282c34', red: '#e06c75', green: '#98c379', yellow: '#e5c07b',
      blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf',
      brightBlack: '#5c6370', brightRed: '#e06c75', brightGreen: '#98c379', brightYellow: '#e5c07b',
      brightBlue: '#61afef', brightMagenta: '#c678dd', brightCyan: '#56b6c2', brightWhite: '#ffffff',
    },
  },
  {
    name: 'Solarized Dark',
    theme: {
      background: '#002b36', foreground: '#839496', cursor: '#93a1a1', cursorAccent: '#002b36',
      selectionBackground: '#073642',
      black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
      blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
      brightBlack: '#586e75', brightRed: '#cb4b16', brightGreen: '#586e75', brightYellow: '#657b83',
      brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#93a1a1', brightWhite: '#fdf6e3',
    },
  },
]

export const TERMINAL_THEME_NAMES = TERMINAL_THEMES.map((t) => t.name)

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const THEME_BY_KEY = new Map(TERMINAL_THEMES.map((t) => [normalize(t.name), t.theme]))

// xterm ITheme keys that hold a single color string (excludes extendedAnsi: string[]).
type ColorKey = Exclude<keyof ITheme, 'extendedAnsi'>

// Ghostty palette index → xterm ITheme color key.
const ANSI_BY_INDEX: Record<number, ColorKey> = {
  0: 'black', 1: 'red', 2: 'green', 3: 'yellow', 4: 'blue', 5: 'magenta', 6: 'cyan', 7: 'white',
  8: 'brightBlack', 9: 'brightRed', 10: 'brightGreen', 11: 'brightYellow',
  12: 'brightBlue', 13: 'brightMagenta', 14: 'brightCyan', 15: 'brightWhite',
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const unquote = (s: string) => s.replace(/^["']|["']$/g, '').trim()

function asColor(v: string): string | null {
  const c = unquote(v)
  return HEX.test(c) ? c : null
}

/** Parse a Ghostty-style config string. Tolerant: bad lines warn, never throw. */
export function parseTerminalConfig(text: string): ParsedTerminalConfig {
  const out: ParsedTerminalConfig = { warnings: [] }
  const theme: ITheme = {}
  let themeTouched = false

  for (const raw of (text ?? '').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim().toLowerCase()
    const value = line.slice(eq + 1).trim()
    if (!value) continue

    switch (key) {
      case 'font-family':
        out.fontFamily = unquote(value)
        break
      case 'font-size': {
        const n = Number(value)
        if (Number.isFinite(n) && n > 0) out.fontSize = Math.max(6, Math.min(72, n))
        else out.warnings.push(`font-size: "${value}" is not a number`)
        break
      }
      case 'adjust-cell-height': {
        const m = /^(-?\d+(?:\.\d+)?)%$/.exec(value)
        if (m) out.lineHeight = Math.max(0.5, Math.min(2, 1 + Number(m[1]) / 100))
        else out.warnings.push(`adjust-cell-height: only percentages like "5%" are supported`)
        break
      }
      case 'cursor-style': {
        const v = value.toLowerCase()
        if (v === 'block' || v === 'bar' || v === 'underline') out.cursorStyle = v
        else out.warnings.push(`cursor-style: "${value}" (use block, bar, or underline)`)
        break
      }
      case 'cursor-style-blink':
        out.cursorBlink = /^(true|1|yes|on)$/i.test(value)
        break
      case 'window-padding-x': {
        const n = parseInt(value, 10)
        if (Number.isFinite(n)) out.paddingX = Math.max(0, n)
        break
      }
      case 'window-padding-y': {
        const n = parseInt(value, 10)
        if (Number.isFinite(n)) out.paddingY = Math.max(0, n)
        break
      }
      case 'theme': {
        // Ghostty also supports "dark:Foo,light:Bar"; take the dark/first entry.
        const first = value.split(',')[0].replace(/^(dark|light):/i, '').trim()
        const found = THEME_BY_KEY.get(normalize(first))
        if (found) {
          Object.assign(theme, found)
          themeTouched = true
        } else {
          out.warnings.push(`theme: "${value}" not built in. Available: ${TERMINAL_THEME_NAMES.join(', ')}`)
        }
        break
      }
      case 'background':
      case 'foreground':
      case 'cursor-color':
      case 'selection-background':
      case 'selection-foreground': {
        const c = asColor(value)
        if (!c) {
          out.warnings.push(`${key}: "${value}" is not a hex color`)
          break
        }
        const map: Record<string, ColorKey> = {
          background: 'background',
          foreground: 'foreground',
          'cursor-color': 'cursor',
          'selection-background': 'selectionBackground',
          'selection-foreground': 'selectionForeground',
        }
        theme[map[key]] = c
        themeTouched = true
        break
      }
      case 'palette': {
        // `palette = 0=#1a1a1a`
        const pm = /^(\d+)\s*=\s*(.+)$/.exec(value)
        const idx = pm ? Number(pm[1]) : NaN
        const col = pm ? asColor(pm[2]) : null
        const slot = ANSI_BY_INDEX[idx]
        if (slot && col) {
          theme[slot] = col
          themeTouched = true
        } else {
          out.warnings.push(`palette: "${value}" (expected "N=#hex", N from 0–15)`)
        }
        break
      }
      default:
        // Unrecognized Ghostty key — silently ignored.
        break
    }
  }

  if (themeTouched) out.theme = theme
  return out
}
