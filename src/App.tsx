import { useEffect } from 'react'
import { useApp } from './store'
import { Sidebar } from './components/Sidebar'
import { Breadcrumb } from './components/Breadcrumb'
import { TerminalView } from './components/TerminalView'
import { SourceControl } from './components/SourceControl'
import { Modal } from './components/Modal'
import { Settings } from './components/Settings'
import { CommandBar } from './components/CommandBar'
import { CommandPalette } from './components/CommandPalette'
import { Preview } from './components/Preview'
import { PortsMenu, previewLabel } from './components/PortsMenu'
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
    config,
    toggleSidebar,
    openPalette,
    closePalette,
    newTabOnActive,
    revealActive,
    openActiveInEditor,
    isWebApp,
    previewTabs,
    activePane,
    setPaneActive,
    closePreviewTab,
  } = useApp()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    const off = window.bonsai.onOpenSettings(() => setSettingsOpen(true))
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openPalette()
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSourceControl()
      } else if (mod && e.key.toLowerCase() === 't') {
        e.preventDefault()
        newTabOnActive()
      } else if (mod && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (useApp.getState().activeTabId) closeTab(useApp.getState().activeTabId!)
      } else if (e.key === 'Escape') {
        setSettingsOpen(false)
        closePalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      off()
      window.removeEventListener('keydown', onKey)
    }
  }, [setSettingsOpen, openPalette, closePalette, toggleSourceControl, newTabOnActive, closeTab])

  const tab = activeTab()
  const status = tab ? statusByCwd[tab.cwd] : undefined
  const changeCount = status?.files.length ?? 0
  const collapsed = config?.sidebarCollapsed ?? false

  return (
    <div className="app">
      {!collapsed && <Sidebar />}
      <main className="workspace">
        <div className="topbar">
          <button
            className="icon-btn"
            title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
            onClick={toggleSidebar}
          >
            <Icon name="panel" size={15} />
          </button>
          {tabs
            .filter((t) => t.id === activeTabId)
            .map((t) => (
              <div key={t.id} className="active-tab-chip">
                <Icon name="terminal" size={13} />
                <span className="ellipsis">{t.branch}</span>
                <button className="icon-btn close" onClick={() => closeTab(t.id)} title="Close tab (⌘W)">
                  <Icon name="close" size={13} />
                </button>
              </div>
            ))}
          <Breadcrumb />
          {tab && (
            <>
              <button className="icon-btn" title="Reveal in Finder" onClick={revealActive}>
                <Icon name="reveal" size={15} />
              </button>
              <button className="icon-btn" title="Open in editor" onClick={openActiveInEditor}>
                <Icon name="external" size={15} />
              </button>
              {(isWebApp() || previewTabs.length > 0) && <PortsMenu variant="globe" />}
            </>
          )}
          <button className="icon-btn" title="Command palette (⌘K)" onClick={openPalette}>
            <Icon name="search" size={15} />
          </button>
          <button
            className={`sc-toggle-btn ${scOpen ? 'on' : ''}`}
            onClick={toggleSourceControl}
            title="Source Control (⌘B)"
            disabled={!tab}
          >
            <Icon name="commit" size={15} />
            <span>Changes</span>
            {changeCount > 0 && <span className="count">{changeCount}</span>}
          </button>
        </div>

        <div className="body">
          <div className="terminals">
            {previewTabs.length > 0 && (
              <div className="pane-tabs">
                <button
                  className={activePane === 'terminal' ? 'active' : ''}
                  onClick={() => setPaneActive('terminal')}
                >
                  <Icon name="terminal" size={13} /> Terminal
                </button>
                {previewTabs.map((pt) => (
                  <button
                    key={pt.id}
                    className={activePane === pt.id ? 'active' : ''}
                    onClick={() => setPaneActive(pt.id)}
                  >
                    <Icon name="globe" size={13} /> {previewLabel(pt.url)}
                    <span
                      className="pane-tab-close"
                      title="Close preview"
                      onClick={(e) => {
                        e.stopPropagation()
                        closePreviewTab(pt.id)
                      }}
                    >
                      <Icon name="close" size={11} />
                    </span>
                  </button>
                ))}
                <PortsMenu variant="chevron" />
              </div>
            )}
            <div className="pane-content">
              <div
                className="pane-terminals"
                style={{ display: activePane === 'terminal' ? 'block' : 'none' }}
              >
                {tabs.length === 0 && (
                  <div className="placeholder">
                    <Icon name="leaf" size={40} className="placeholder-mark" />
                    <h2>Bonsai</h2>
                    <p>Add a repo, expand it, and pick a branch to open a terminal.</p>
                    <p className="dim">
                      Each branch gets its own git worktree — and your <code>.env</code> files are
                      carried in automatically. Press <kbd>⌘K</kbd> to jump anywhere.
                    </p>
                  </div>
                )}
                {tabs.map((t) => (
                  <TerminalView
                    key={t.id}
                    tab={t}
                    active={t.id === activeTabId && activePane === 'terminal'}
                  />
                ))}
              </div>
              {previewTabs.map((pt) => (
                <div
                  key={pt.id}
                  className="pane-preview"
                  style={{ display: activePane === pt.id ? 'block' : 'none' }}
                >
                  <Preview id={pt.id} url={pt.url} />
                </div>
              ))}
            </div>
          </div>
          <SourceControl />
        </div>
        <CommandBar />
      </main>
      <Modal />
      <Settings />
      <CommandPalette />
    </div>
  )
}
