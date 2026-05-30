import { useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'

// Friendly names for well-known local dev ports.
const PORT_NAMES: Record<string, string> = {
  '54323': 'Supabase Studio',
  '54321': 'Supabase API',
  '54324': 'Inbucket',
  '5432': 'Postgres',
  '6006': 'Storybook',
  '8025': 'Mailpit',
  '5173': 'Vite',
  '3000': 'App',
  '8080': 'Web',
}

export function previewLabel(url: string): string {
  try {
    const u = new URL(url)
    return PORT_NAMES[u.port] ?? (u.port ? `:${u.port}` : u.hostname)
  } catch {
    return 'Preview'
  }
}

/**
 * Dropdown listing every detected open port. Rendered both as a chevron in the
 * pane tab strip and as the globe button in the top bar (which also shows a
 * count badge when ports exist).
 */
export function PortsMenu({ variant }: { variant: 'chevron' | 'globe' }) {
  const { previewTabs, activePane, setPaneActive, addPreviewTab } = useApp()
  const [open, setOpen] = useState(false)
  const hasPorts = previewTabs.length > 0

  return (
    <div className={`ports-dd ${variant === 'globe' ? 'ports-dd-globe' : ''}`}>
      <button
        className={
          variant === 'globe'
            ? `icon-btn globe-btn ${hasPorts ? 'has-ports' : ''} ${activePane !== 'terminal' ? 'on' : ''}`
            : 'pane-ports-btn'
        }
        title="Open ports"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={variant === 'globe' ? 'globe' : 'chevron-down'} size={variant === 'globe' ? 15 : 13} />
        {variant === 'globe' && hasPorts && <span className="port-dot">{previewTabs.length}</span>}
      </button>
      {open && (
        <div className={`ports-menu ${variant === 'globe' ? 'ports-menu-right' : ''}`} onMouseLeave={() => setOpen(false)}>
          <div className="ports-menu-title">Open ports</div>
          {!hasPorts && <div className="ports-none">No ports detected yet</div>}
          {previewTabs.map((pt) => (
            <button
              key={pt.id}
              className={`ports-item ${activePane === pt.id ? 'active' : ''}`}
              onClick={() => {
                setPaneActive(pt.id)
                setOpen(false)
              }}
            >
              <Icon name="globe" size={13} />
              <span className="ports-name">{previewLabel(pt.url)}</span>
              <span className="ports-url ellipsis">{pt.url}</span>
            </button>
          ))}
          <button
            className="ports-item ports-add"
            onClick={() => {
              addPreviewTab()
              setOpen(false)
            }}
          >
            <Icon name="plus" size={13} /> Add a port…
          </button>
        </div>
      )}
    </div>
  )
}
