import { useEffect } from 'react'
import { useApp } from './store'
import { Sidebar } from './components/Sidebar'
import { Breadcrumb } from './components/Breadcrumb'
import { TerminalView } from './components/TerminalView'

export default function App() {
  const { tabs, activeTabId, closeTab, init } = useApp()

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className="app">
      <Sidebar />
      <main className="workspace">
        <div className="tabstrip">
          {tabs
            .filter((t) => t.id === activeTabId)
            .map((t) => (
              <div key={t.id} className="active-tab-chip">
                <span className="ellipsis">{t.branch}</span>
                <button className="close" onClick={() => closeTab(t.id)} title="Close tab">
                  ×
                </button>
              </div>
            ))}
          <Breadcrumb />
        </div>
        <div className="terminals">
          {tabs.length === 0 && (
            <div className="placeholder">
              <h2>🌳 Bonsai</h2>
              <p>Add a repo, expand it, and click a branch to open a terminal.</p>
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
      </main>
    </div>
  )
}
