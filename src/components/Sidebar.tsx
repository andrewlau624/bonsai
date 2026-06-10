import { useState } from 'react'
import { useApp, branchKey, tabDisplayName, tabBusy } from '../store'
import type { Repo, Branch } from '../../shared/types'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { BRANCH_COLORS, resolveBranchColor } from '../colors'

function BranchRow({ repo, branch }: { repo: Repo; branch: Branch }) {
  const {
    tabs,
    activeTabId,
    expandedBranches,
    worktrees,
    loading,
    openBranch,
    toggleBranch,
    setActiveTab,
    closeTab,
    requestDeleteBranch,
    checkoutBranch,
    branchesByRepo,
    branchColorsByRepo,
    setBranchColor,
    processByTab,
  } = useApp()
  const [colorMenu, setColorMenu] = useState(false)
  const key = branchKey(repo.id, branch.name)
  const branchTabs = tabs.filter((t) => t.repoId === repo.id && t.branch === branch.name)
  const expanded = expandedBranches.has(key) && branchTabs.length > 0
  const wt = worktrees[key]
  const isLoading = loading.has(key)
  const explicitColor = branchColorsByRepo[repo.id]?.[branch.name]
  const branchIndex = (branchesByRepo[repo.id] ?? []).findIndex((b) => b.name === branch.name)
  const color = resolveBranchColor(explicitColor, branchIndex)

  return (
    <div
      className={`branch${color ? ' colored' : ''}`}
      style={color ? ({ '--branch-color': color } as React.CSSProperties) : undefined}
    >
      <div className="row branch-row">
        <button
          className="disclosure"
          onClick={() =>
            branchTabs.length ? toggleBranch(repo.id, branch.name) : openBranch(repo.id, branch.name)
          }
        >
          <Icon name="chevron" size={13} className={`chevron ${expanded ? 'open' : ''}`} />
        </button>
        <button
          className="row-label"
          onClick={() => openBranch(repo.id, branch.name)}
          title={branch.name}
        >
          <Icon name="branch" size={14} className="i-branch" />
          <span className="ellipsis">{branch.name}</span>
          {branch.current && <span className="badge current">HEAD</span>}
          {wt && wt.carriedEnvFiles.length > 0 && (
            <span className="badge env" title={`Carried: ${wt.carriedEnvFiles.join(', ')}`}>
              env {wt.carriedEnvFiles.length}
            </span>
          )}
        </button>
        <div className="row-actions">
          {isLoading ? (
            <span className="dot-spin" />
          ) : (
            <>
              <div className="color-pick">
                <button
                  className="swatch-btn"
                  title="Color this branch"
                  style={{ background: color }}
                  onClick={() => setColorMenu((v) => !v)}
                />
                {colorMenu && (
                  <>
                    <div className="color-scrim" onClick={() => setColorMenu(false)} />
                    <div className="color-menu">
                      {BRANCH_COLORS.map((c) => (
                        <button
                          key={c.id}
                          className={`swatch-opt${explicitColor === c.id ? ' sel' : ''}`}
                          title={c.label}
                          style={{ background: c.hex }}
                          onClick={() => {
                            void setBranchColor(repo.id, branch.name, c.id)
                            setColorMenu(false)
                          }}
                        />
                      ))}
                      <button
                        className="swatch-opt none"
                        title="Reset to default"
                        onClick={() => {
                          void setBranchColor(repo.id, branch.name, null)
                          setColorMenu(false)
                        }}
                      >
                        <Icon name="sync" size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                className="icon-btn"
                title="New terminal tab"
                onClick={() => openBranch(repo.id, branch.name, true)}
              >
                <Icon name="plus" size={14} />
              </button>
              {!branch.current && (
                <>
                  <button
                    className="icon-btn"
                    title="Checkout as HEAD"
                    onClick={() => checkoutBranch(repo.id, branch.name)}
                  >
                    <Icon name="swap" size={13} />
                  </button>
                  <button
                    className="icon-btn danger-hover"
                    title="Delete branch"
                    onClick={() => requestDeleteBranch(repo.id, branch.name)}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {expanded &&
        branchTabs.map((t, i) => {
          const proc = processByTab[t.id]
          const busy = tabBusy(proc)
          const live = tabDisplayName(t, proc)
          // Fall back to "Terminal N" when the tab is just an idle shell.
          const label = live === branch.name ? `Terminal ${i + 1}` : live
          return (
            <div
              key={t.id}
              className={`row tab-row ${activeTabId === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              title={busy ? `${proc} running` : undefined}
            >
              {busy ? (
                <span className="tab-busy" />
              ) : (
                <Icon name="terminal" size={12} className="i-term" />
              )}
              <span className="ellipsis">{label}</span>
              <button
                className="tab-row-close"
                title="Close tab (⌘W)"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(t.id)
                }}
              >
                <Icon name="close" size={11} />
              </button>
            </div>
          )
        })}
    </div>
  )
}

function RepoNode({ repo }: { repo: Repo }) {
  const {
    expandedRepoIds,
    branchesByRepo,
    branchPrefsByRepo,
    loading,
    branchFilter,
    toggleRepo,
    refreshRepo,
    removeRepo,
    openModal,
    openBranchPicker,
  } = useApp()
  const expanded = expandedRepoIds.has(repo.id)
  const all = branchesByRepo[repo.id] ?? []
  const prefs = branchPrefsByRepo[repo.id]
  const filter = branchFilter.trim().toLowerCase()
  // Curated set (if the user picked branches); current branch always stays visible.
  const curated = prefs ? all.filter((b) => prefs.includes(b.name) || b.current) : all
  const branches = filter ? curated.filter((b) => b.name.toLowerCase().includes(filter)) : curated
  const hidden = all.length - curated.length
  const isLoading = loading.has(repo.id)

  return (
    <div className="repo">
      <div className="row repo-row">
        <button className="disclosure" onClick={() => toggleRepo(repo.id)}>
          <Icon name="chevron" size={13} className={`chevron ${expanded ? 'open' : ''}`} />
        </button>
        <button className="row-label" onClick={() => toggleRepo(repo.id)} title={repo.path}>
          <Icon name="repo" size={15} className="i-repo" />
          <span className="ellipsis repo-name">{repo.name}</span>
        </button>
        <div className="row-actions">
          <button
            className="icon-btn"
            title="Fetch & refresh branches"
            onClick={() => refreshRepo(repo.id)}
            disabled={isLoading}
          >
            <Icon name="fetch" size={14} className={isLoading ? 'spinning' : undefined} />
          </button>
          <button
            className="icon-btn"
            title="Choose which branches to show"
            onClick={() => openBranchPicker(repo.id)}
          >
            <Icon name="sliders" size={14} />
          </button>
          <button
            className="icon-btn"
            title="New branch"
            onClick={() => openModal({ type: 'newBranch', repoId: repo.id })}
          >
            <Icon name="plus" size={14} />
          </button>
          <button
            className="icon-btn danger-hover"
            title="Remove repo from Bonsai"
            onClick={() => removeRepo(repo.id)}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="branch-list">
          {isLoading && <div className="row muted">loading branches…</div>}
          {!isLoading && branches.length === 0 && (
            <div className="row muted">{filter ? 'no matches' : 'no branches shown'}</div>
          )}
          {branches.map((b) => (
            <BranchRow key={b.name} repo={repo} branch={b} />
          ))}
          {!filter && hidden > 0 && (
            <button className="row muted hidden-row" onClick={() => openBranchPicker(repo.id)}>
              {hidden} hidden — choose branches
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { repos, addRepo, searchOpen, setSearchOpen, branchFilter, setBranchFilter, setSettingsOpen } =
    useApp()
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <Logo size={18} className="brand-mark" />
          <span className="brand-name">Bonsai</span>
        </div>
        <div className="header-actions">
          <button
            className={`icon-btn ${searchOpen ? 'on' : ''}`}
            title="Search branches"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Icon name="search" size={15} />
          </button>
          <button className="icon-btn" title="Add repository" onClick={addRepo}>
            <Icon name="plus" size={16} />
          </button>
          <button className="icon-btn" title="Settings (⌘,)" onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" size={15} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="search-bar">
          <Icon name="search" size={14} className="search-icon" />
          <input
            autoFocus
            placeholder="Filter branches…"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
          />
          {branchFilter && (
            <button className="icon-btn" onClick={() => setBranchFilter('')}>
              <Icon name="close" size={13} />
            </button>
          )}
        </div>
      )}

      <div className="tree">
        {repos.length === 0 && (
          <div className="empty">
            <Icon name="repo" size={28} className="empty-icon" />
            <p>No repositories yet</p>
            <button className="btn primary" onClick={addRepo}>
              Add a repository
            </button>
          </div>
        )}
        {repos.map((r) => (
          <RepoNode key={r.id} repo={r} />
        ))}
      </div>
    </aside>
  )
}
