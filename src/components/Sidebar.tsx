import { useApp, branchKey } from '../store'
import type { Repo, Branch } from '../../shared/types'
import { Icon } from './Icon'

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
    openModal,
  } = useApp()
  const key = branchKey(repo.id, branch.name)
  const branchTabs = tabs.filter((t) => t.repoId === repo.id && t.branch === branch.name)
  const expanded = expandedBranches.has(key) && branchTabs.length > 0
  const wt = worktrees[key]
  const isLoading = loading.has(key)

  return (
    <div className="branch">
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
              <button
                className="icon-btn"
                title="New terminal tab"
                onClick={() => openBranch(repo.id, branch.name, true)}
              >
                <Icon name="plus" size={14} />
              </button>
              {!branch.current && (
                <button
                  className="icon-btn danger-hover"
                  title="Delete branch"
                  onClick={() => openModal({ type: 'confirmDelete', repoId: repo.id, branch: branch.name })}
                >
                  <Icon name="trash" size={13} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {expanded &&
        branchTabs.map((t, i) => (
          <button
            key={t.id}
            className={`row tab-row ${activeTabId === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <Icon name="terminal" size={12} className="i-term" />
            <span className="ellipsis">Terminal {i + 1}</span>
          </button>
        ))}
    </div>
  )
}

function RepoNode({ repo }: { repo: Repo }) {
  const { expandedRepoIds, branchesByRepo, loading, branchFilter, toggleRepo, removeRepo, openModal } =
    useApp()
  const expanded = expandedRepoIds.has(repo.id)
  const all = branchesByRepo[repo.id] ?? []
  const filter = branchFilter.trim().toLowerCase()
  const branches = filter ? all.filter((b) => b.name.toLowerCase().includes(filter)) : all
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
            <div className="row muted">{filter ? 'no matches' : 'no branches'}</div>
          )}
          {branches.map((b) => (
            <BranchRow key={b.name} repo={repo} branch={b} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { repos, addRepo, searchOpen, setSearchOpen, branchFilter, setBranchFilter } = useApp()
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <Icon name="leaf" size={18} className="brand-mark" />
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
