import { useApp, branchKey } from '../store'

/** Always-visible "where am I" bar for the active tab. */
export function Breadcrumb() {
  const { repos, tabs, activeTabId, worktrees } = useApp()
  const tab = tabs.find((t) => t.id === activeTabId)
  if (!tab) return <div className="breadcrumb empty-crumb">No terminal open</div>

  const repo = repos.find((r) => r.id === tab.repoId)
  const wt = worktrees[branchKey(tab.repoId, tab.branch)]

  return (
    <div className="breadcrumb">
      <span className="crumb repo">▣ {repo?.name ?? '?'}</span>
      <span className="sep">/</span>
      <span className="crumb branch">⎇ {tab.branch}</span>
      {wt && !wt.primary && <span className="crumb tag">worktree</span>}
      {wt && wt.carriedEnvFiles.length > 0 && (
        <span className="crumb env" title={wt.carriedEnvFiles.join(', ')}>
          env: {wt.carriedEnvFiles.join(' · ')}
        </span>
      )}
      <span className="crumb path" title={tab.cwd}>
        {tab.cwd}
      </span>
    </div>
  )
}
