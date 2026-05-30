import { useEffect } from 'react'
import { useApp } from './store'
import { Sidebar } from './components/Sidebar'
import { Breadcrumb } from './components/Breadcrumb'
import { TerminalView } from './components/TerminalView'
import { SourceControl } from './components/SourceControl'
import { Modal } from './components/Modal'
import { Settings } from './components/Settings'
import { CommandBar } from './components/CommandBar'
import { Icon } from './components/Icon'

export default function App() {
  const {
    tabs,
    activeTabId,
    closeTab,
    init,
    scOpen,
    toggleSourceControl,
    activeTab,
    statusByCwd,
    setSettingsOpen,
  } = useApp()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    const off = window.bonsai.onOpenSettings(() => setSettingsOpen(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      off()
      window.removeEventListener('keydown', onKey)
    }
  }, [setSettingsOpen])

  const tab = activeTab()
  const status = tab ? statusByCwd[tab.cwd] : undefined
  const changeCount = status?.files.length ?? 0

  return (
    <div className="app">
      <Sidebar />
      <main className="workspace">
        <div className="topbar">
          {tabs
            .filter((t) => t.id === activeTabId)
            .map((t) => (
              <div key={t.id} className="active-tab-chip">
                <Icon name="terminal" size={13} />
                <span className="ellipsis">{t.branch}</span>
                <button className="icon-btn close" onClick={() => closeTab(t.id)} title="Close tab">
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
          <Breadcrumb />
          <button
            className={`sc-toggle-btn ${scOpen ? 'on' : ''}`}
            onClick={toggleSourceControl}
            title="Source Control"
            disabled={!tab}
          >
            <Icon name="commit" size={15} />
            <span>Changes</span>
            {changeCount > 0 && <span className="count">{changeCount}</span>}
          </button>
        </div>

        <div className="body">
          <div className="terminals">
            {tabs.length === 0 && (
              <div className="placeholder">
                <Icon name="leaf" size={40} className="placeholder-mark" />
                <h2>Bonsai</h2>
                <p>Add a repo, expand it, and pick a branch to open a terminal.</p>
                <p className="dim">
                  Each branch gets its own git worktree — and your <code>.env</code> files are
                  carried in automatically.
                </p>
              </div>
            )}
            {tabs.map((t) => (
              <TerminalView key={t.id} tab={t} active={t.id === activeTabId} />
            ))}
          </div>
          <SourceControl />
        </div>
        <CommandBar />
      </main>
      <Modal />
      <Settings />
    </div>
  )
}
