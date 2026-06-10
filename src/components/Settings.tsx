import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { useApp } from '../store'
import { Icon } from './Icon'
import { THEMES, ACCENTS } from '../themes'
import { parseTerminalConfig, TERMINAL_THEME_NAMES } from '../terminalConfig'
import { MODE_DEFS, modeValue } from '../modes'

type Tab = 'appearance' | 'behavior' | 'terminal' | 'profiles' | 'config'

const TABS: { id: Tab; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'behavior', label: 'Behavior', icon: 'sliders' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal' },
  { id: 'profiles', label: 'Profiles', icon: 'layers' },
  { id: 'config', label: 'Config', icon: 'config' },
]

// Seeded into the editor via "Insert example" — only keys Bonsai applies.
const TERMINAL_CONFIG_STARTER = `# Bonsai terminal config — Ghostty-style \`key = value\` lines.
# Changes apply to the terminal live. Lines starting with # are comments.

theme = Catppuccin Macchiato

font-family = "Comic Mono"
font-size = 14
# Nudge xterm's cell height; percentages only (e.g. 5% taller, -3% tighter).
adjust-cell-height = 5%

# Padding around the terminal, in pixels.
window-padding-x = 16
window-padding-y = 12

cursor-style = block
cursor-style-blink = true
`

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="knob" />
    </button>
  )
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { v: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? 'active' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Appearance() {
  const { config, updateConfig } = useApp()
  if (!config) return null
  return (
    <>
      <h4 className="set-h">Theme</h4>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-card ${config.theme === t.id ? 'active' : ''}`}
            style={{
              background: t.vars['--bg'],
              color: t.vars['--text'],
              borderColor: config.theme === t.id ? t.vars['--accent'] : t.vars['--border'],
            }}
            onClick={() => updateConfig({ theme: t.id })}
          >
            <div className="theme-card-top">
              <span className="sw" style={{ background: t.vars['--accent'] }} />
              <span className="sw" style={{ background: t.vars['--blue'] }} />
              <span className="sw" style={{ background: t.vars['--purple'] }} />
              {config.theme === t.id && (
                <span
                  className="theme-check"
                  style={{ background: t.vars['--accent'], color: t.vars['--accent-ink'] }}
                >
                  <Icon name="check" size={12} />
                </span>
              )}
            </div>
            <div className="theme-card-bottom">
              <span className="theme-name">{t.name}</span>
              <span className="theme-group" style={{ color: t.vars['--text-faint'] }}>
                {t.group}
              </span>
            </div>
          </button>
        ))}
      </div>

      <h4 className="set-h">Accent</h4>
      <div className="accent-row">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            className={`accent-dot ${config.accent === a.id ? 'active' : ''} ${a.id === 'theme' ? 'theme-accent' : ''}`}
            title={a.name}
            style={a.id === 'theme' ? undefined : { background: a.accent }}
            onClick={() => updateConfig({ accent: a.id })}
          >
            {a.id === 'theme' ? 'A' : config.accent === a.id ? <Icon name="check" size={13} /> : null}
          </button>
        ))}
        <label className={`accent-dot accent-custom ${config.accent === 'custom' ? 'active' : ''}`} title="Custom">
          <input
            type="color"
            value={config.accentColor}
            onChange={(e) => updateConfig({ accent: 'custom', accentColor: e.target.value })}
          />
        </label>
      </div>

      <h4 className="set-h">Interface</h4>
      <div className="set-row">
        <div className="set-label">
          <span>Font</span>
          <span className="set-desc">Typeface used across the interface.</span>
        </div>
        <Seg
          value={config.uiFont}
          onChange={(v) => updateConfig({ uiFont: v })}
          options={[
            { v: 'system', label: 'System' },
            { v: 'rounded', label: 'Rounded' },
            { v: 'mono', label: 'Mono' },
            { v: 'serif', label: 'Serif' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Corners</span>
          <span className="set-desc">How rounded panels, buttons, and cards are.</span>
        </div>
        <Seg
          value={config.corners}
          onChange={(v) => updateConfig({ corners: v })}
          options={[
            { v: 'sharp', label: 'Sharp' },
            { v: 'soft', label: 'Soft' },
            { v: 'round', label: 'Round' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Density</span>
          <span className="set-desc">Spacing and overall compactness.</span>
        </div>
        <Seg
          value={config.density}
          onChange={(v) => updateConfig({ density: v })}
          options={[
            { v: 'comfortable', label: 'Comfortable' },
            { v: 'compact', label: 'Compact' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Scale</span>
          <span className="set-desc">Zoom the whole interface up or down.</span>
        </div>
        <Seg
          value={config.uiScale}
          onChange={(v) => updateConfig({ uiScale: v })}
          options={[
            { v: 'small', label: 'Small' },
            { v: 'normal', label: 'Normal' },
            { v: 'large', label: 'Large' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Reduce transparency</span>
          <span className="set-desc">Turn off the blur behind dialogs and overlays.</span>
        </div>
        <Switch on={config.reduceTransparency} onChange={(v) => updateConfig({ reduceTransparency: v })} />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Motion</span>
          <span className="set-desc">Animation intensity across the UI. Expressive adds subtle hover lifts, slides, and scales — never bouncy.</span>
        </div>
        <Seg
          value={config.motion ?? (config.animations ? 'normal' : 'none')}
          onChange={(v) => updateConfig({ motion: v, animations: v !== 'none' })}
          options={[
            { v: 'none', label: 'None' },
            { v: 'subtle', label: 'Subtle' },
            { v: 'normal', label: 'Normal' },
            { v: 'expressive', label: 'Expressive' },
          ]}
        />
      </div>

      <h4 className="set-h">Tabs &amp; branches</h4>
      <div className="set-row">
        <div className="set-label">
          <span>Branch bar width</span>
          <span className="set-desc">Thickness of the colored rectangle that marks each branch.</span>
        </div>
        <Seg
          value={config.branchBarWidth ?? 'medium'}
          onChange={(v) => updateConfig({ branchBarWidth: v })}
          options={[
            { v: 'thin', label: 'Thin' },
            { v: 'medium', label: 'Medium' },
            { v: 'thick', label: 'Thick' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Tab style</span>
          <span className="set-desc">How a terminal tab looks when active.</span>
        </div>
        <Seg
          value={config.tabStyle ?? 'filled'}
          onChange={(v) => updateConfig({ tabStyle: v })}
          options={[
            { v: 'filled', label: 'Filled' },
            { v: 'outlined', label: 'Outlined' },
            { v: 'minimal', label: 'Minimal' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Tab density</span>
          <span className="set-desc">Vertical spacing in the tab strip.</span>
        </div>
        <Seg
          value={config.tabDensity ?? 'comfortable'}
          onChange={(v) => updateConfig({ tabDensity: v })}
          options={[
            { v: 'compact', label: 'Compact' },
            { v: 'comfortable', label: 'Cozy' },
            { v: 'spacious', label: 'Spacious' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Topbar density</span>
          <span className="set-desc">Vertical padding in the workspace topbar.</span>
        </div>
        <Seg
          value={config.topbarDensity ?? 'comfortable'}
          onChange={(v) => updateConfig({ topbarDensity: v })}
          options={[
            { v: 'compact', label: 'Compact' },
            { v: 'comfortable', label: 'Comfortable' },
          ]}
        />
      </div>

      <h4 className="set-h">Code &amp; terminal</h4>
      <div className="set-row">
        <div className="set-label">
          <span>Monospace font</span>
          <span className="set-desc">Font for terminals, diffs, and the code viewer.</span>
        </div>
        <Seg
          value={config.monoFont}
          onChange={(v) => updateConfig({ monoFont: v })}
          options={[
            { v: 'system', label: 'System' },
            { v: 'jetbrains', label: 'JetBrains' },
            { v: 'fira', label: 'Fira' },
            { v: 'ibm', label: 'IBM' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Syntax highlighting</span>
          <span className="set-desc">Color code by language in the viewer.</span>
        </div>
        <Switch on={config.syntaxHighlight} onChange={(v) => updateConfig({ syntaxHighlight: v })} />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Line numbers</span>
          <span className="set-desc">Show line numbers in the code viewer.</span>
        </div>
        <Switch on={config.codeLineNumbers} onChange={(v) => updateConfig({ codeLineNumbers: v })} />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Font size</span>
          <span className="set-desc">Size of text in the terminal panes.</span>
        </div>
        <div className="stepper">
          <button onClick={() => updateConfig({ fontSize: Math.max(9, config.fontSize - 1) })}>−</button>
          <span>{config.fontSize}px</span>
          <button onClick={() => updateConfig({ fontSize: Math.min(24, config.fontSize + 1) })}>+</button>
        </div>
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Cursor</span>
          <span className="set-desc">Shape of the terminal cursor.</span>
        </div>
        <Seg
          value={config.cursorStyle}
          onChange={(v) => updateConfig({ cursorStyle: v })}
          options={[
            { v: 'bar', label: 'Bar' },
            { v: 'block', label: 'Block' },
            { v: 'underline', label: 'Line' },
          ]}
        />
      </div>
      <div className="set-row">
        <div className="set-label">
          <span>Blink cursor</span>
          <span className="set-desc">Whether the terminal cursor blinks.</span>
        </div>
        <Switch on={config.cursorBlink} onChange={(v) => updateConfig({ cursorBlink: v })} />
      </div>
    </>
  )
}

function Behavior() {
  const { config, setMode } = useApp()
  if (!config) return null
  return (
    <>
      <h4 className="set-h">Modes</h4>
      <p className="set-intro">
        Toggle behaviors on or off. These are saved to your config file and can be bundled into
        Profiles.
      </p>
      {MODE_DEFS.map((m) => (
        <div className="set-row" key={m.key}>
          <div className="set-label">
            <span>{m.label}</span>
            <span className="set-desc">{m.description}</span>
          </div>
          <Switch on={modeValue(config.modes, m.key)} onChange={(v) => setMode(m.key, v)} />
        </div>
      ))}
    </>
  )
}

function TerminalConfigTab() {
  const { config, updateConfig } = useApp()
  const [text, setText] = useState(config?.terminalConfig ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Resync if the stored value changes elsewhere (matches our own debounced write).
  useEffect(() => setText(config?.terminalConfig ?? ''), [config?.terminalConfig])
  const warnings = useMemo(() => parseTerminalConfig(text).warnings, [text])
  if (!config) return null

  const apply = (v: string) => {
    setText(v)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void updateConfig({ terminalConfig: v }), 400)
  }

  return (
    <>
      <h4 className="set-h">Terminal config</h4>
      <p className="set-intro">
        Style the terminal with <a href="https://ghostty.org/docs/config" onClick={(e) => { e.preventDefault(); window.bonsai.openExternal('https://ghostty.org/docs/config/reference') }}>Ghostty-style</a>{' '}
        <code>key = value</code> lines. Bonsai's terminal is xterm.js, so it applies the subset below — other
        Ghostty keys are ignored. Changes take effect live and override the Appearance settings.
      </p>
      <div className="term-cfg-editor">
        <CodeMirror
          value={text}
          height="300px"
          theme="dark"
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            autocompletion: false,
            bracketMatching: false,
            closeBrackets: false,
            searchKeymap: false,
          }}
          onChange={apply}
        />
      </div>
      {text.trim() === '' && (
        <button className="btn ghost sm" onClick={() => apply(TERMINAL_CONFIG_STARTER)}>
          <Icon name="plus" size={13} /> Insert example
        </button>
      )}
      {warnings.length > 0 && (
        <div className="term-cfg-warn">
          {warnings.map((w, i) => (
            <div key={i} className="term-cfg-warn-row">
              <Icon name="dot" size={12} /> {w}
            </div>
          ))}
        </div>
      )}
      <h4 className="set-h">Supported keys</h4>
      <ul className="term-cfg-keys">
        <li><code>theme</code> — a built-in palette (see below)</li>
        <li><code>font-family</code> — e.g. <code>"Comic Mono"</code></li>
        <li><code>font-size</code> — points (6–72)</li>
        <li><code>adjust-cell-height</code> — line height as a percent, e.g. <code>5%</code></li>
        <li><code>cursor-style</code> — <code>block</code>, <code>bar</code>, or <code>underline</code></li>
        <li><code>cursor-style-blink</code> — <code>true</code> / <code>false</code></li>
        <li><code>window-padding-x</code>, <code>window-padding-y</code> — pixels</li>
        <li><code>background</code>, <code>foreground</code>, <code>cursor-color</code>, <code>selection-background</code> — hex</li>
        <li><code>palette</code> — <code>N=#hex</code> for ANSI 0–15</li>
      </ul>
      <h4 className="set-h">Built-in themes</h4>
      <div className="term-cfg-themes">
        {TERMINAL_THEME_NAMES.map((n) => (
          <button key={n} className="term-cfg-theme" onClick={() => apply(setThemeLine(text, n))} title={`Use ${n}`}>
            {n}
          </button>
        ))}
      </div>
    </>
  )
}

/** Replace an existing `theme = …` line, or prepend one, keeping the rest intact. */
function setThemeLine(text: string, name: string): string {
  const line = `theme = ${name}`
  const lines = text.split('\n')
  const idx = lines.findIndex((l) => /^\s*theme\s*=/.test(l))
  if (idx >= 0) {
    lines[idx] = line
    return lines.join('\n')
  }
  return text.trim() ? `${line}\n${text}` : `${line}\n`
}

function Profiles() {
  const { config, saveProfile, applyProfile, deleteProfile } = useApp()
  const [name, setName] = useState('')
  if (!config) return null
  return (
    <>
      <h4 className="set-h">Profiles</h4>
      <p className="set-intro">
        A profile bundles a theme, density, terminal settings, and all your modes. Save your current
        setup, then switch between profiles in one click — or make your own.
      </p>
      <div className="profile-save">
        <input
          placeholder="Profile name (e.g. Focus, Hacker)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              saveProfile(name)
              setName('')
            }
          }}
        />
        <button
          className="btn primary"
          disabled={!name.trim()}
          onClick={() => {
            saveProfile(name)
            setName('')
          }}
        >
          Save current
        </button>
      </div>
      {config.profiles.length === 0 ? (
        <div className="set-empty">No profiles yet — save your current setup above.</div>
      ) : (
        config.profiles.map((p) => (
          <div className="profile-row" key={p.id}>
            <div className="profile-info">
              <span className="profile-name">{p.name}</span>
              <span className="profile-sub">
                {p.theme} · {p.density}
              </span>
            </div>
            <button className="btn ghost sm" onClick={() => applyProfile(p.id)}>
              Apply
            </button>
            <button className="icon-btn danger-hover" title="Delete" onClick={() => deleteProfile(p.id)}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))
      )}
    </>
  )
}

function ConfigTab() {
  const { config } = useApp()
  const [path, setPath] = useState('')
  const [updater, setUpdater] = useState<import('../../shared/types').UpdaterState>({ kind: 'idle' })
  const [checking, setChecking] = useState(false)
  useEffect(() => {
    void window.bonsai.config.path().then(setPath)
    void window.bonsai.updater.state().then(setUpdater)
    return window.bonsai.onUpdaterState(setUpdater)
  }, [])
  const checkNow = async () => {
    setChecking(true)
    try {
      await window.bonsai.updater.check()
    } finally {
      setChecking(false)
    }
  }
  const stateLabel = (() => {
    switch (updater.kind) {
      case 'idle':
        return 'Idle'
      case 'checking':
        return 'Checking…'
      case 'uptodate':
        return 'Up to date'
      case 'available':
        return `Update available: v${updater.version}`
      case 'downloading':
        return `Downloading v${updater.version} — ${Math.round(updater.progress * 100)}%`
      case 'ready':
        return `v${updater.version} ready — restart to install`
      case 'error':
        return `Error: ${updater.message}`
    }
  })()
  return (
    <>
      <h4 className="set-h">Updates</h4>
      <div className="set-row">
        <div className="set-label">
          <span>Status</span>
          <span className="set-desc">{stateLabel}</span>
        </div>
        <button
          className="btn ghost sm"
          disabled={checking || updater.kind === 'checking' || updater.kind === 'downloading'}
          onClick={checkNow}
        >
          <Icon name="fetch" size={13} /> Check for updates
        </button>
      </div>
      {updater.kind === 'ready' || updater.kind === 'available' ? (
        <div className="set-row">
          <div className="set-label">
            <span>Install</span>
            <span className="set-desc">
              The app will restart automatically once the new version is in place.
            </span>
          </div>
          <button className="btn primary sm" onClick={() => window.bonsai.updater.install()}>
            Install &amp; restart
          </button>
        </div>
      ) : null}

      <h4 className="set-h">Config file</h4>
      <p className="set-intro">
        Everything here is stored as JSON on disk. You can edit it by hand — Bonsai reads it on next
        launch. See <code>CONFIG.md</code> in the repo for the full reference and how to author your
        own modes and profiles.
      </p>
      <div className="config-path">
        <code className="ellipsis">{path}</code>
        <button className="btn ghost sm" onClick={() => window.bonsai.config.reveal()}>
          <Icon name="reveal" size={13} /> Reveal
        </button>
      </div>
      <h4 className="set-h">Current values</h4>
      <pre className="config-json">{JSON.stringify(config, null, 2)}</pre>
    </>
  )
}

export function Settings() {
  const { settingsOpen, setSettingsOpen } = useApp()
  const [tab, setTab] = useState<Tab>('appearance')
  if (!settingsOpen) return null
  return (
    <div className="settings-scrim" onMouseDown={() => setSettingsOpen(false)}>
      <div className="settings" onMouseDown={(e) => e.stopPropagation()}>
        <nav className="settings-side">
          <div className="settings-brand">
            <Icon name="settings" size={16} />
            <span>Settings</span>
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`settings-nav ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="settings-main">
          <header className="settings-head">
            <span>{TABS.find((t) => t.id === tab)?.label}</span>
            <button className="icon-btn" onClick={() => setSettingsOpen(false)} title="Close (Esc)">
              <Icon name="close" size={16} />
            </button>
          </header>
          <div className="settings-body">
            {tab === 'appearance' && <Appearance />}
            {tab === 'behavior' && <Behavior />}
            {tab === 'terminal' && <TerminalConfigTab />}
            {tab === 'profiles' && <Profiles />}
            {tab === 'config' && <ConfigTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
