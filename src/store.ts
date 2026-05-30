import { create } from 'zustand'
import type { Repo, Branch, TabState, Worktree, GitStatus, DirEntry } from '../shared/types'

let tabCounter = 0
const nextTabId = () => `t${Date.now()}-${++tabCounter}`

const branchKey = (repoId: string, branch: string) => `${repoId}::${branch}`

/** What the Source Control drawer is currently showing. */
type InspectorView =
  | { kind: 'list' }
  | { kind: 'diff'; file: string; staged: boolean; diff: string }
  | {
      kind: 'file'
      file: string
      content: string
      truncated: boolean
      dir: string
      entries: DirEntry[]
    }

type Modal =
  | { type: 'newBranch'; repoId: string }
  | { type: 'confirmDelete'; repoId: string; branch: string }
  | null

interface AppState {
  repos: Repo[]
  branchesByRepo: Record<string, Branch[]>
  worktrees: Record<string, Worktree> // keyed by branchKey
  tabs: TabState[]
  activeTabId: string | null
  expandedRepoIds: Set<string>
  expandedBranches: Set<string>
  loading: Set<string>

  // Source control
  scOpen: boolean
  statusByCwd: Record<string, GitStatus>
  inspector: InspectorView
  commitMessage: string
  syncing: string | null // label of the in-flight git op, for spinner text

  // Branch search + modals
  searchOpen: boolean
  branchFilter: string
  modal: Modal

  init: () => Promise<void>
  addRepo: () => Promise<void>
  removeRepo: (id: string) => Promise<void>
  toggleRepo: (id: string) => Promise<void>
  reloadBranches: (repoId: string) => Promise<void>
  openBranch: (repoId: string, branch: string, forceNewTab?: boolean) => Promise<void>
  toggleBranch: (repoId: string, branch: string) => void
  setActiveTab: (id: string) => void
  closeTab: (id: string) => void
  persist: () => void

  // SC actions
  activeTab: () => TabState | undefined
  toggleSourceControl: () => void
  refreshStatus: () => Promise<void>
  stage: (file: string) => Promise<void>
  unstage: (file: string) => Promise<void>
  stageAll: () => Promise<void>
  commit: () => Promise<void>
  sync: (op: 'push' | 'pull' | 'fetch') => Promise<void>
  setCommitMessage: (m: string) => void
  openDiff: (file: string, staged: boolean) => Promise<void>
  openFile: (relPath: string) => Promise<void>
  openDir: (relPath: string) => Promise<void>
  backToList: () => void

  // Branch mgmt + search
  setSearchOpen: (v: boolean) => void
  setBranchFilter: (v: string) => void
  openModal: (m: Modal) => void
  closeModal: () => void
  createBranch: (repoId: string, name: string) => Promise<void>
  deleteBranch: (repoId: string, branch: string) => Promise<void>
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

  scOpen: false,
  statusByCwd: {},
  inspector: { kind: 'list' },
  commitMessage: '',
  syncing: null,

  searchOpen: false,
  branchFilter: '',
  modal: null,

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
    for (const id of layout.expandedRepoIds) {
      const branches = await window.bonsai.repos.branches(id)
      set((s) => ({ branchesByRepo: { ...s.branchesByRepo, [id]: branches } }))
    }
    void get().refreshStatus()
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
      await get().reloadBranches(id)
      set((s) => {
        const loading = new Set(s.loading)
        loading.delete(id)
        return { loading }
      })
    }
    get().persist()
  },

  reloadBranches: async (repoId) => {
    const branches = await window.bonsai.repos.branches(repoId)
    set((s) => ({ branchesByRepo: { ...s.branchesByRepo, [repoId]: branches } }))
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
      void get().refreshStatus()
      return
    }

    set((s) => ({ loading: new Set(s.loading).add(key) }))
    let worktree: Worktree
    try {
      worktree = await window.bonsai.worktree.ensure(repoId, branch)
    } catch (err) {
      set((s) => {
        const loading = new Set(s.loading)
        loading.delete(key)
        return { loading }
      })
      alert(`Could not create worktree for ${branch}:\n${(err as Error).message}`)
      return
    }

    const tab: TabState = { id: nextTabId(), repoId, branch, cwd: worktree.path, title: branch }
    set((s) => {
      const loading = new Set(s.loading)
      loading.delete(key)
      return {
        worktrees: { ...s.worktrees, [key]: worktree },
        tabs: [...s.tabs, tab],
        activeTabId: tab.id,
        expandedBranches: new Set(s.expandedBranches).add(key),
        loading,
      }
    })
    get().persist()
    void get().refreshStatus()
  },

  toggleBranch: (repoId, branch) => {
    const key = branchKey(repoId, branch)
    const expanded = new Set(get().expandedBranches)
    expanded.has(key) ? expanded.delete(key) : expanded.add(key)
    set({ expandedBranches: expanded })
    get().persist()
  },

  setActiveTab: (id) => {
    set({ activeTabId: id, inspector: { kind: 'list' } })
    get().persist()
    void get().refreshStatus()
  },

  closeTab: (id) => {
    window.bonsai.session.kill(id)
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id)
      const activeTabId = s.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId
      return { tabs, activeTabId }
    })
    get().persist()
    void get().refreshStatus()
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

  // ---- Source control ----
  activeTab: () => get().tabs.find((t) => t.id === get().activeTabId),

  toggleSourceControl: () => {
    const next = !get().scOpen
    set({ scOpen: next, inspector: { kind: 'list' } })
    if (next) void get().refreshStatus()
  },

  refreshStatus: async () => {
    const tab = get().activeTab()
    if (!tab) return
    try {
      const status = await window.bonsai.git.status(tab.cwd)
      set((s) => ({ statusByCwd: { ...s.statusByCwd, [tab.cwd]: status } }))
    } catch (err) {
      console.error('status failed', err)
    }
  },

  stage: async (file) => {
    const tab = get().activeTab()
    if (!tab) return
    await window.bonsai.git.stage(tab.cwd, file)
    await get().refreshStatus()
  },

  unstage: async (file) => {
    const tab = get().activeTab()
    if (!tab) return
    await window.bonsai.git.unstage(tab.cwd, file)
    await get().refreshStatus()
  },

  stageAll: async () => {
    const tab = get().activeTab()
    if (!tab) return
    await window.bonsai.git.stageAll(tab.cwd)
    await get().refreshStatus()
  },

  commit: async () => {
    const tab = get().activeTab()
    const msg = get().commitMessage.trim()
    if (!tab || !msg) return
    set({ syncing: 'Committing' })
    try {
      const status = get().statusByCwd[tab.cwd]
      if (status && !status.files.some((f) => f.staged)) {
        await window.bonsai.git.stageAll(tab.cwd)
      }
      await window.bonsai.git.commit(tab.cwd, msg)
      set({ commitMessage: '' })
      await get().refreshStatus()
    } catch (err) {
      alert(`Commit failed:\n${(err as Error).message}`)
    } finally {
      set({ syncing: null })
    }
  },

  sync: async (op) => {
    const tab = get().activeTab()
    if (!tab) return
    set({ syncing: op === 'push' ? 'Pushing' : op === 'pull' ? 'Pulling' : 'Fetching' })
    try {
      if (op === 'push') await window.bonsai.git.push(tab.cwd)
      else if (op === 'pull') await window.bonsai.git.pull(tab.cwd)
      else await window.bonsai.git.fetch(tab.repoId)
      await get().refreshStatus()
    } catch (err) {
      alert(`${op} failed:\n${(err as Error).message}`)
    } finally {
      set({ syncing: null })
    }
  },

  setCommitMessage: (m) => set({ commitMessage: m }),

  openDiff: async (file, staged) => {
    const tab = get().activeTab()
    if (!tab) return
    const diff = await window.bonsai.git.diffFile(tab.cwd, file, staged)
    set({ inspector: { kind: 'diff', file, staged, diff } })
  },

  openFile: async (relPath) => {
    const tab = get().activeTab()
    if (!tab) return
    const [{ content, truncated }, entries] = await Promise.all([
      window.bonsai.git.readFile(tab.cwd, relPath),
      window.bonsai.git.listDir(tab.cwd, dirname(relPath)),
    ])
    set({
      inspector: { kind: 'file', file: relPath, content, truncated, dir: dirname(relPath), entries },
    })
  },

  openDir: async (relPath) => {
    const tab = get().activeTab()
    if (!tab) return
    const entries = await window.bonsai.git.listDir(tab.cwd, relPath)
    const cur = get().inspector
    if (cur.kind === 'file') {
      set({ inspector: { ...cur, dir: relPath, entries } })
    }
  },

  backToList: () => set({ inspector: { kind: 'list' } }),

  // ---- Branch search + management ----
  setSearchOpen: (v) => set({ searchOpen: v, branchFilter: v ? get().branchFilter : '' }),
  setBranchFilter: (v) => set({ branchFilter: v }),
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: null }),

  createBranch: async (repoId, name) => {
    try {
      await window.bonsai.git.createBranch(repoId, name)
      await get().reloadBranches(repoId)
      set({ modal: null })
    } catch (err) {
      alert(`Could not create branch:\n${(err as Error).message}`)
    }
  },

  deleteBranch: async (repoId, branch) => {
    try {
      await window.bonsai.git.deleteBranch(repoId, branch, true)
      set((s) => ({
        tabs: s.tabs.filter((t) => !(t.repoId === repoId && t.branch === branch)),
        modal: null,
      }))
      await get().reloadBranches(repoId)
      get().persist()
    } catch (err) {
      alert(`Could not delete branch:\n${(err as Error).message}`)
    }
  },
}))

function dirname(p: string): string {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '' : p.slice(0, i)
}

export { branchKey }
