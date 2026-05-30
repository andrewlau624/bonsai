import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'
import { THEMES } from '../themes'
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
            onClick={() => updateConfig({ theme: t.id })}
          >
            <div className="theme-preview" style={{ background: t.swatch[0] }}>
              <span className="sw" style={{ background: t.swatch[1] }} />
              <span className="sw" style={{ background: t.swatch[2] }} />
            </div>
            <div className="theme-meta">
              <span className="theme-name">{t.name}</span>
              <span className="theme-group">{t.group}</span>
            </div>
            {config.theme === t.id && <Icon name="check" size={14} className="theme-check" />}
          </button>
        ))}
      </div>

      <h4 className="set-h">Density</h4>
      <div className="segmented">
        {(['comfortable', 'compact'] as const).map((d) => (
          <button
            key={d}
            className={config.density === d ? 'active' : ''}
            onClick={() => updateConfig({ density: d })}
          >
            {d[0].toUpperCase() + d.slice(1)}
          </button>
        ))}
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
