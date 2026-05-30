import { create } from 'zustand'
import type { Repo, Branch, TabState, Worktree } from '../shared/types'

let tabCounter = 0
const nextTabId = () => `t${Date.now()}-${++tabCounter}`

const branchKey = (repoId: string, branch: string) => `${repoId}::${branch}`

interface AppState {
  repos: Repo[]
  branchesByRepo: Record<string, Branch[]>
  worktrees: Record<string, Worktree> // keyed by branchKey
  tabs: TabState[]
  activeTabId: string | null
  expandedRepoIds: Set<string>
  expandedBranches: Set<string>
  loading: Set<string>

  init: () => Promise<void>
  addRepo: () => Promise<void>
  removeRepo: (id: string) => Promise<void>
  toggleRepo: (id: string) => Promise<void>
  openBranch: (repoId: string, branch: string, forceNewTab?: boolean) => Promise<void>
  toggleBranch: (repoId: string, branch: string) => void
  setActiveTab: (id: string) => void
  closeTab: (id: string) => void
  persist: () => void
}

export const useApp = create<AppState>((set, get) => ({
  repos: [],
  branchesByRepo: {},
  worktrees: {},
  tabs: [],
  activeTabId: null,
  expandedRepoIds: new Set(),
  expandedBranches: new Set(),
  loading: new Set(),

  init: async () => {
    const repos = await window.bonsai.repos.list()
    const { tabs, layout } = await window.bonsai.layout.load()
    set({
      repos,
      tabs,
      activeTabId: layout.activeTabId ?? tabs[0]?.id ?? null,
      expandedRepoIds: new Set(layout.expandedRepoIds),
      expandedBranches: new Set(layout.expandedBranches),
    })
    // Eagerly load branches for any expanded repos.
    for (const id of layout.expandedRepoIds) {
      const branches = await window.bonsai.repos.branches(id)
      set((s) => ({ branchesByRepo: { ...s.branchesByRepo, [id]: branches } }))
    }
  },

  addRepo: async () => {
    const repo = await window.bonsai.repos.add()
    if (!repo) return
    set((s) => (s.repos.some((r) => r.id === repo.id) ? s : { repos: [...s.repos, repo] }))
    await get().toggleRepo(repo.id)
  },

  removeRepo: async (id) => {
    await window.bonsai.repos.remove(id)
    set((s) => ({
      repos: s.repos.filter((r) => r.id !== id),
      tabs: s.tabs.filter((t) => t.repoId !== id),
    }))
    get().persist()
  },

  toggleRepo: async (id) => {
    const expanded = new Set(get().expandedRepoIds)
    if (expanded.has(id)) {
      expanded.delete(id)
      set({ expandedRepoIds: expanded })
    } else {
      expanded.add(id)
      set((s) => ({ expandedRepoIds: expanded, loading: new Set(s.loading).add(id) }))
      const branches = await window.bonsai.repos.branches(id)
      set((s) => {
        const loading = new Set(s.loading)
        loading.delete(id)
        return { branchesByRepo: { ...s.branchesByRepo, [id]: branches }, loading }
      })
    }
    get().persist()
  },

  openBranch: async (repoId, branch, forceNewTab = false) => {
    const key = branchKey(repoId, branch)
    const existing = get().tabs.find((t) => t.repoId === repoId && t.branch === branch)
    if (existing && !forceNewTab) {
      set((s) => ({
        activeTabId: existing.id,
        expandedBranches: new Set(s.expandedBranches).add(key),
      }))
      get().persist()
      return
    }

    set((s) => ({ loading: new Set(s.loading).add(key) }))
    let worktree: Worktree
    try {
      worktree = await window.bonsai.worktree.ensure(repoId, branch)
    } catch (err) {
      console.error(err)
      set((s) => {
        const loading = new Set(s.loading)
        loading.delete(key)
        return { loading }
      })
      alert(`Could not create worktree for ${branch}:\n${(err as Error).message}`)
      return
    }

    const tab: TabState = {
      id: nextTabId(),
      repoId,
      branch,
      cwd: worktree.path,
      title: branch,
    }
    set((s) => {
      const expanded = new Set(s.expandedBranches).add(key)
      const loading = new Set(s.loading)
      loading.delete(key)
      return {
        worktrees: { ...s.worktrees, [key]: worktree },
        tabs: [...s.tabs, tab],
        activeTabId: tab.id,
        expandedBranches: expanded,
        loading,
      }
    })
    get().persist()
  },

  toggleBranch: (repoId, branch) => {
    const key = branchKey(repoId, branch)
    const expanded = new Set(get().expandedBranches)
    expanded.has(key) ? expanded.delete(key) : expanded.add(key)
    set({ expandedBranches: expanded })
    get().persist()
  },

  setActiveTab: (id) => {
    set({ activeTabId: id })
    get().persist()
  },

  closeTab: (id) => {
    window.bonsai.session.kill(id)
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id)
      const activeTabId =
        s.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId
      return { tabs, activeTabId }
    })
    get().persist()
  },

  persist: () => {
    const s = get()
    window.bonsai.layout.save({
      tabs: s.tabs,
      layout: {
        expandedRepoIds: [...s.expandedRepoIds],
        expandedBranches: [...s.expandedBranches],
        activeTabId: s.activeTabId,
      },
    })
  },
}))

export { branchKey }
