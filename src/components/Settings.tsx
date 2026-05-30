import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'
import { THEMES, ACCENTS } from '../themes'
import { MODE_DEFS, modeValue } from '../modes'

type Tab = 'appearance' | 'behavior' | 'profiles' | 'config'

const TABS: { id: Tab; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'behavior', label: 'Behavior', icon: 'sliders' },
  { id: 'profiles', label: 'Profiles', icon: 'layers' },
  { id: 'config', label: 'Config', icon: 'config' },
]

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
          <span>Animations</span>
          <span className="set-desc">Play transitions and motion across the UI.</span>
        </div>
        <Switch on={config.animations} onChange={(v) => updateConfig({ animations: v })} />
      </div>

      <h4 className="set-h">Terminal</h4>
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
  useEffect(() => {
    void window.bonsai.config.path().then(setPath)
  }, [])
  return (
    <>
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
            {tab === 'profiles' && <Profiles />}
            {tab === 'config' && <ConfigTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
