import { useEffect, useState } from 'react'
import type { UpdaterState } from '../../shared/types'

// Thin banner pinned to the bottom of the workspace. Hidden when there's no
// actionable state (idle / uptodate). The main process broadcasts state via
// the `updater:state` IPC event; we also pull once on mount in case the
// startup check completed before this component existed.
export function UpdateBanner() {
  const [state, setState] = useState<UpdaterState>({ kind: 'idle' })
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    void window.bonsai.updater.state().then(setState)
    return window.bonsai.onUpdaterState(setState)
  }, [])

  // Auto-hide errors after a beat so a transient network blip doesn't camp
  // at the bottom of the UI forever.
  useEffect(() => {
    if (state.kind !== 'error') return
    const t = setTimeout(() => setState({ kind: 'idle' }), 8000)
    return () => clearTimeout(t)
  }, [state])

  if (state.kind === 'idle' || state.kind === 'uptodate' || state.kind === 'checking') return null

  const onInstall = async () => {
    setInstalling(true)
    try {
      await window.bonsai.updater.install()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="update-banner">
      {state.kind === 'available' && (
        <>
          <span className="update-banner-text">
            Update available — <strong>v{state.version}</strong>
          </span>
          <button
            className="update-banner-btn"
            onClick={onInstall}
            disabled={installing}
          >
            {installing ? 'Installing…' : 'Install & restart'}
          </button>
        </>
      )}
      {state.kind === 'downloading' && (
        <>
          <span className="update-banner-text">
            Downloading v{state.version} — {Math.round(state.progress * 100)}%
          </span>
          <div className="update-banner-progress">
            <div style={{ width: `${state.progress * 100}%` }} />
          </div>
        </>
      )}
      {state.kind === 'ready' && (
        <>
          <span className="update-banner-text">
            v{state.version} ready to install
          </span>
          <button className="update-banner-btn" onClick={onInstall} disabled={installing}>
            {installing ? 'Restarting…' : 'Restart now'}
          </button>
        </>
      )}
      {state.kind === 'error' && (
        <span className="update-banner-text update-banner-err">Update failed: {state.message}</span>
      )}
    </div>
  )
}
