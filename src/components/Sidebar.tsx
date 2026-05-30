import { useApp, branchKey } from '../store'
import type { Repo, Branch } from '../../shared/types'

function Chevron({ open }: { open: boolean }) {
  return <span className={`chevron ${open ? 'open' : ''}`}>▸</span>
}

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
  } = useApp()
  const key = branchKey(repo.id, branch.name)
  const branchTabs = tabs.filter((t) => t.repoId === repo.id && t.branch === branch.name)
  const expanded = expandedBranches.has(key)
  const wt = worktrees[key]
  const isLoading = loading.has(key)

  return (
    <div className="branch">
      <div className="row branch-row">
        <button
          className="disclosure"
          onClick={() => (branchTabs.length ? toggleBranch(repo.id, branch.name) : openBranch(repo.id, branch.name))}
        >
          <Chevron open={expanded && branchTabs.length > 0} />
        </button>
        <button className="row-label" onClick={() => openBranch(repo.id, branch.name)} title={branch.name}>
          <span className="branch-icon">⎇</span>
          <span className="ellipsis">{branch.name}</span>
          {branch.current && <span className="badge current">HEAD</span>}
          {wt && !wt.primary && <span className="badge wt">worktree</span>}
          {wt && wt.carriedEnvFiles.length > 0 && (
            <span className="badge env" title={`Carried: ${wt.carriedEnvFiles.join(', ')}`}>
              .env×{wt.carriedEnvFiles.length}
            </span>
          )}
        </button>
        {isLoading ? (
          <span className="spinner">…</span>
        ) : (
          <button
            className="add-tab"
            title="New terminal tab on this branch"
            onClick={() => openBranch(repo.id, branch.name, true)}
          >
            +
          </button>
        )}
      </div>

      {expanded &&
        branchTabs.map((t, i) => (
          <button
            key={t.id}
            className={`row tab-row ${activeTabId === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="tab-icon">▪</span>
            <span className="ellipsis">tab {i + 1}</span>
          </button>
        ))}
    </div>
  )
}

function RepoNode({ repo }: { repo: Repo }) {
  const { expandedRepoIds, branchesByRepo, loading, toggleRepo, removeRepo } = useApp()
  const expanded = expandedRepoIds.has(repo.id)
  const branches = branchesByRepo[repo.id] ?? []
  const isLoading = loading.has(repo.id)

  return (
    <div className="repo">
      <div className="row repo-row">
        <button className="disclosure" onClick={() => toggleRepo(repo.id)}>
          <Chevron open={expanded} />
        </button>
        <button className="row-label" onClick={() => toggleRepo(repo.id)} title={repo.path}>
          <span className="repo-icon">▣</span>
          <span className="ellipsis repo-name">{repo.name}</span>
        </button>
        <button
          className="remove-repo"
          title="Remove repo from Bonsai"
          onClick={() => removeRepo(repo.id)}
        >
          ×
        </button>
      </div>
      {expanded && (
        <div className="branch-list">
          {isLoading && <div className="row muted">loading branches…</div>}
          {!isLoading && branches.length === 0 && <div className="row muted">no branches</div>}
          {branches.map((b) => (
            <BranchRow key={b.name} repo={repo} branch={b} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { repos, addRepo } = useApp()
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="logo">🌳 Bonsai</span>
        <button className="add-repo" onClick={addRepo} title="Add a git repository">
          + Repo
        </button>
      </div>
      <div className="tree">
        {repos.length === 0 && (
          <div className="empty">
            <p>No repos yet.</p>
            <button onClick={addRepo}>Add a repository</button>
          </div>
        )}
        {repos.map((r) => (
          <RepoNode key={r.id} repo={r} />
        ))}
      </div>
    </aside>
  )
}
