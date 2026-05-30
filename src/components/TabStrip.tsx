import { useEffect, useRef, useState } from 'react'
import type { TabState } from '../../shared/types'
import { useApp, tabDisplayName, tabBusy } from '../store'
import { Icon } from './Icon'
import { previewLabel } from './PortsMenu'

/**
 * Two-row tab bar above the terminal, matching the Terminal/Preview pane tabs:
 *   Row 1 (repos)    — one tab per repo with open terminals; picks the repo.
 *   Row 2 (branches) — the active repo's branches. A branch with one terminal
 *                      is a single tab; a branch with several becomes a
 *                      collapsible group holding its terminals.
 * Terminals auto-name from their running program, show a busy dot while a
 * program runs, can be pinned, and dragged to reorder within their branch.
 */
export function TabStrip() {
  const tabs = useApp((s) => s.tabs)
  const activeTabId = useApp((s) => s.activeTabId)
  const repos = useApp((s) => s.repos)
  const processByTab = useApp((s) => s.processByTab)
  const setActiveTab = useApp((s) => s.setActiveTab)
  const closeTab = useApp((s) => s.closeTab)
  const togglePinTab = useApp((s) => s.togglePinTab)
  const reorderTabs = useApp((s) => s.reorderTabs)
  const newTabOnActive = useApp((s) => s.newTabOnActive)
  const previewTabs = useApp((s) => s.previewTabs)
  const activePane = useApp((s) => s.activePane)
  const setPaneActive = useApp((s) => s.setPaneActive)
  const closePreviewTab = useApp((s) => s.closePreviewTab)

  const dragId = useRef<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const lastTabByRepo = useRef<Record<string, string>>({})

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activeRepoId = activeTab?.repoId ?? tabs[0]?.repoId ?? null

  useEffect(() => {
    if (activeTab) lastTabByRepo.current[activeTab.repoId] = activeTab.id
  }, [activeTab])

  if (tabs.length === 0) return null

  const repoName = (id: string) => repos.find((r) => r.id === id)?.name ?? '?'

  // Repos that have open terminals, in first-appearance order.
  const repoOrder: string[] = []
  for (const t of tabs) if (!repoOrder.includes(t.repoId)) repoOrder.push(t.repoId)

  const selectRepo = (rid: string) => {
    if (rid === activeRepoId) return
    const remembered = lastTabByRepo.current[rid]
    const target =
      (remembered && tabs.some((t) => t.id === remembered) && remembered) ||
      tabs.find((t) => t.repoId === rid)?.id
    if (target) setActiveTab(target)
  }

  // Branches of the active repo (first-appearance order) and their terminals.
  const branchOrder: string[] = []
  for (const t of tabs)
    if (t.repoId === activeRepoId && !branchOrder.includes(t.branch)) branchOrder.push(t.branch)
  const termsOf = (br: string) =>
    tabs
      .filter((t) => t.repoId === activeRepoId && t.branch === br)
      .sort((a, b) => (!!a.pinned === !!b.pinned ? 0 : a.pinned ? -1 : 1))

  const collapseKey = (br: string) => `${activeRepoId}::${br}`
  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const dragHandlers = (t: TabState) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      dragId.current = t.id
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragOver: (e: React.DragEvent) => {
      const d = dragId.current
      if (!d || d === t.id) return
      const dragged = tabs.find((x) => x.id === d)
      // Reorder only within the same branch.
      if (
        !dragged ||
        dragged.repoId !== t.repoId ||
        dragged.branch !== t.branch ||
        !!dragged.pinned !== !!t.pinned
      )
        return
      e.preventDefault()
      setDropTargetId(t.id)
    },
    onDragLeave: () => setDropTargetId((id) => (id === t.id ? null : id)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      if (dragId.current) reorderTabs(dragId.current, t.id)
      dragId.current = null
      setDropTargetId(null)
    },
    onDragEnd: () => {
      dragId.current = null
      setDropTargetId(null)
    },
  })

  // One terminal chip. `subLabel` is used for extra terminals inside a group.
  const chip = (t: TabState, subIndex?: number) => {
    const proc = processByTab[t.id]
    const busy = tabBusy(proc)
    const live = tabDisplayName(t, proc)
    const label =
      subIndex === undefined ? live : busy ? live : `term ${subIndex + 1}`
    const isActive = t.id === activeTabId && activePane === 'terminal'
    return (
      <div
        key={t.id}
        className={
          'tab-chip' +
          (isActive ? ' active' : '') +
          (t.pinned ? ' pinned' : '') +
          (dropTargetId === t.id ? ' drop-target' : '')
        }
        title={`${repoName(t.repoId)} · ${t.branch}\n${t.cwd}`}
        onClick={() => setActiveTab(t.id)}
        onContextMenu={(e) => {
          e.preventDefault()
          togglePinTab(t.id)
        }}
        {...dragHandlers(t)}
      >
        {busy ? (
          <span className="tab-busy" title={`${proc} running`} />
        ) : (
          <Icon name="terminal" size={12} />
        )}
        <span className="tab-name">{label}</span>
        <button
          className="tab-pin"
          title={t.pinned ? 'Unpin' : 'Pin'}
          onClick={(e) => {
            e.stopPropagation()
            togglePinTab(t.id)
          }}
        >
          <Icon name="pin" size={11} />
        </button>
        <button
          className="tab-close"
          title="Close tab (⌘W)"
          onClick={(e) => {
            e.stopPropagation()
            closeTab(t.id)
          }}
        >
          <Icon name="close" size={12} />
        </button>
      </div>
    )
  }

  const multiRepo = repoOrder.length > 1

  return (
    <div className="tabbar">
      {multiRepo && (
        <div className="tabbar-row tabbar-repos">
          {repoOrder.map((rid) => (
            <button
              key={rid}
              className={`repo-tab${rid === activeRepoId ? ' active' : ''}`}
              onClick={() => selectRepo(rid)}
              title={repoName(rid)}
            >
              <Icon name="repo" size={12} />
              <span className="tab-name">{repoName(rid)}</span>
              <span className="tab-count">{tabs.filter((t) => t.repoId === rid).length}</span>
            </button>
          ))}
        </div>
      )}
      <div className="tabbar-row tabbar-branches">
        {previewTabs.length > 0 &&
          (() => {
            const isCollapsed = collapsed.has('__ports')
            const hasActive = previewTabs.some((pt) => pt.id === activePane)
            return (
              <div className={`branch-grp ports-grp${hasActive ? ' has-active' : ''}`}>
                <button
                  className="branch-hd"
                  onClick={() => toggleCollapse('__ports')}
                  title={isCollapsed ? 'Expand ports' : 'Collapse ports'}
                >
                  <Icon name={isCollapsed ? 'chevron' : 'chevron-down'} size={11} />
                  <Icon name="globe" size={11} />
                  <span className="tab-name">Ports</span>
                  <span className="tab-count">{previewTabs.length}</span>
                </button>
                {!isCollapsed &&
                  previewTabs.map((pt) => (
                    <div
                      key={pt.id}
                      className={`tab-chip${activePane === pt.id ? ' active' : ''}`}
                      title={pt.url}
                      onClick={() => setPaneActive(pt.id)}
                    >
                      <Icon name="globe" size={12} />
                      <span className="tab-name">{previewLabel(pt.url)}</span>
                      <button
                        className="tab-close"
                        title="Close port"
                        onClick={(e) => {
                          e.stopPropagation()
                          closePreviewTab(pt.id)
                        }}
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            )
          })()}
        {branchOrder.map((br) => {
          const terms = termsOf(br)
          if (terms.length === 1) return chip(terms[0])
          const key = collapseKey(br)
          const isCollapsed = collapsed.has(key)
          const hasActive = terms.some((t) => t.id === activeTabId)
          return (
            <div className={`branch-grp${hasActive ? ' has-active' : ''}`} key={br}>
              <button
                className="branch-hd"
                onClick={() => toggleCollapse(key)}
                title={isCollapsed ? `Expand ${br}` : `Collapse ${br}`}
              >
                <Icon name={isCollapsed ? 'chevron' : 'chevron-down'} size={11} />
                <Icon name="branch" size={11} />
                <span className="tab-name">{br}</span>
                <span className="tab-count">{terms.length}</span>
              </button>
              {!isCollapsed && terms.map((t, i) => chip(t, i))}
            </div>
          )
        })}
        <button className="tab-new" title="New terminal on this branch (⌘T)" onClick={newTabOnActive}>
          <Icon name="plus" size={13} />
        </button>
      </div>
    </div>
  )
}
