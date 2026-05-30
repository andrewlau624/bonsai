import { create } from 'zustand'
import type {
  Repo,
  Branch,
  TabState,
  Worktree,
  GitStatus,
  DirEntry,
  AppConfig,
  Profile,
  SavedCommand,
  PrStatus,
  PullRequestDetail,
} from '../shared/types'
import { applyTheme } from './themes'
import { modeValue } from './modes'

let tabCounter = 0
const nextTabId = () => `t${Date.now()}-${++tabCounter}`

const branchKey = (repoId: string, branch: string) => `${repoId}::${branch}`

type InspectorView =
  | { kind: 'list' }
  | { kind: 'diff'; file: string; staged: boolean; diff: string }

export type DrawerPanel = 'changes' | 'files' | 'prs'

type Modal =
  | { type: 'newBranch'; repoId: string }
  | { type: 'confirmDelete'; repoId: string; branch: string }
  | null

function applyConfig(c: AppConfig) {
  applyTheme(c.theme, {
    density: c.density,
    uiFont: c.uiFont,
    corners: c.corners,
    animations: c.animations,
  })
}

interface AppState {
  repos: Repo[]
  branchesByRepo: Record<string, Branch[]>
  worktrees: Record<string, Worktree>
  tabs: TabState[]
  activeTabId: string | null
  expandedRepoIds: Set<string>
  expandedBranches: Set<string>
  loading: Set<string>

  scOpen: boolean
  panel: DrawerPanel
  statusByCwd: Record<string, GitStatus>
  inspector: InspectorView
  commitMessage: string
  syncing: string | null

  filesDir: string
  filesEntries: DirEntry[]

  sessionByTab: Record<string, string>
  commandsByRepo: Record<string, SavedCommand[]>

  prStatus: PrStatus | null
  prDetail: PullRequestDetail | null
  prBusy: boolean

  searchOpen: boolean
  branchFilter: string
  modal: Modal

  config: AppConfig | null
  settingsOpen: boolean

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

  activeTab: () => TabState | undefined
  toggleSourceControl: () => void
  setPanel: (p: DrawerPanel) => void
  refreshStatus: () => Promise<void>
  stage: (file: string) => Promise<void>
  unstage: (file: string) => Promise<void>
  stageAll: () => Promise<void>
  commit: () => Promise<void>
  sync: (op: 'push' | 'pull' | 'fetch') => Promise<void>
  setCommitMessage: (m: string) => void
  openDiff: (file: string, staged: boolean) => Promise<void>
  backToList: () => void
  browseFiles: (relPath: string) => Promise<void>
  openCode: (file?: string) => void

  registerSession: (tabId: string, sessionId: string) => void
  unregisterSession: (tabId: string) => void
  runCommands: (commands: string[]) => void
  loadCommands: (repoId: string) => Promise<void>
  saveCommands: (repoId: string, list: SavedCommand[]) => Promise<void>

  loadPrs: () => Promise<void>
  viewPr: (num: number) => Promise<void>
  createPr: (data: { title: string; body: string; draft?: boolean }) => Promise<string | null>
  editPr: (num: number, data: { title: string; body: string }) => Promise<void>
  closePrDetail: () => void

  setSearchOpen: (v: boolean) => void
  setBranchFilter: (v: string) => void
  openModal: (m: Modal) => void
  closeModal: () => void
  createBranch: (repoId: string, name: string) => Promise<void>
  requestDeleteBranch: (repoId: string, branch: string) => void
  deleteBranch: (repoId: string, branch: string) => Promise<void>

  mode: (key: string) => boolean
  setSettingsOpen: (v: boolean) => void
  updateConfig: (patch: Partial<AppConfig>) => Promise<void>
  setMode: (key: string, value: boolean) => Promise<void>
  saveProfile: (name: string) => Promise<void>
  applyProfile: (id: string) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
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
  panel: 'changes',
  statusByCwd: {},
  inspector: { kind: 'list' },
  commitMessage: '',
  syncing: null,

  filesDir: '',
  filesEntries: [],

  sessionByTab: {},
  commandsByRepo: {},

  prStatus: null,
  prDetail: null,
  prBusy: false,

  searchOpen: false,
  branchFilter: '',
  modal: null,

  config: null,
  settingsOpen: false,

  init: async () => {
    const config = await window.bonsai.config.get()
    applyConfig(config)
    set({ config })

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
    for (const r of repos) void get().loadCommands(r.id)
    void get().refreshStatus()
  },

  addRepo: async () => {
    const repo = await window.bonsai.repos.add()
    if (!repo) return
    set((s) => (s.repos.some((r) => r.id === repo.id) ? s : { repos: [...s.repos, repo] }))
    void get().loadCommands(repo.id)
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
    if (get().mode('autoFetchOnOpen')) {
      try {
        await window.bonsai.git.fetch(repoId)
      } catch {
        /* offline / no remote */
      }
    }
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
    if (next) {
      void get().refreshStatus()
      if (get().panel === 'prs') void get().loadPrs()
      if (get().panel === 'files') void get().browseFiles('')
    }
  },

  setPanel: (p) => {
    set({ panel: p, inspector: { kind: 'list' } })
    if (p === 'prs') void get().loadPrs()
    if (p === 'files') void get().browseFiles('')
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
      if (get().mode('stageAllOnCommit') && status && !status.files.some((f) => f.staged)) {
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
    if (op === 'push' && get().mode('confirmBeforePush')) {
      if (!confirm(`Push ${tab.branch} to its remote?`)) return
    }
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

  backToList: () => set({ inspector: { kind: 'list' } }),

  browseFiles: async (relPath) => {
    const tab = get().activeTab()
    if (!tab) return
    try {
      const entries = await window.bonsai.git.listDir(tab.cwd, relPath)
      set({ filesDir: relPath, filesEntries: entries })
    } catch (err) {
      console.error('browse failed', err)
    }
  },

  openCode: (file = '') => {
    const tab = get().activeTab()
    if (!tab) return
    void window.bonsai.window.openCode(tab.cwd, file)
  },

  // ---- Session registry + saved commands ----
  registerSession: (tabId, sessionId) =>
    set((s) => ({ sessionByTab: { ...s.sessionByTab, [tabId]: sessionId } })),

  unregisterSession: (tabId) =>
    set((s) => {
      const next = { ...s.sessionByTab }
      delete next[tabId]
      return { sessionByTab: next }
    }),

  runCommands: (commands) => {
    const { activeTabId, sessionByTab } = get()
    if (!activeTabId) return
    const sid = sessionByTab[activeTabId]
    if (!sid) return
    for (const cmd of commands) {
      if (cmd.trim()) window.bonsai.session.write(sid, cmd + '\n')
    }
  },

  loadCommands: async (repoId) => {
    const list = await window.bonsai.commands.list(repoId)
    set((s) => ({ commandsByRepo: { ...s.commandsByRepo, [repoId]: list } }))
  },

  saveCommands: async (repoId, list) => {
    await window.bonsai.commands.save(repoId, list)
    set((s) => ({ commandsByRepo: { ...s.commandsByRepo, [repoId]: list } }))
  },

  // ---- Pull requests ----
  loadPrs: async () => {
    const tab = get().activeTab()
    if (!tab) return
    set({ prBusy: true, prDetail: null })
    try {
      const prStatus = await window.bonsai.pr.list(tab.cwd)
      set({ prStatus })
    } catch (err) {
      set({ prStatus: { available: false, reason: (err as Error).message } })
    } finally {
      set({ prBusy: false })
    }
  },

  viewPr: async (num) => {
    const tab = get().activeTab()
    if (!tab) return
    set({ prBusy: true })
    try {
      const prDetail = await window.bonsai.pr.view(tab.cwd, num)
      set({ prDetail })
    } catch (err) {
      alert(`Could not load PR #${num}:\n${(err as Error).message}`)
    } finally {
      set({ prBusy: false })
    }
  },

  createPr: async (data) => {
    const tab = get().activeTab()
    if (!tab) return null
    set({ prBusy: true })
    try {
      const { url } = await window.bonsai.pr.create(tab.cwd, data)
      await get().loadPrs()
      return url
    } catch (err) {
      alert(`Could not create PR:\n${(err as Error).message}`)
      return null
    } finally {
      set({ prBusy: false })
    }
  },

  editPr: async (num, data) => {
    const tab = get().activeTab()
    if (!tab) return
    set({ prBusy: true })
    try {
      await window.bonsai.pr.edit(tab.cwd, num, data)
      await get().viewPr(num)
      await get().loadPrs()
    } catch (err) {
      alert(`Could not update PR:\n${(err as Error).message}`)
    } finally {
      set({ prBusy: false })
    }
  },

  closePrDetail: () => set({ prDetail: null }),

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

  requestDeleteBranch: (repoId, branch) => {
    if (get().mode('confirmBeforeDelete')) {
      set({ modal: { type: 'confirmDelete', repoId, branch } })
    } else {
      void get().deleteBranch(repoId, branch)
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

  // ---- Config / settings ----
  mode: (key) => modeValue(get().config?.modes ?? {}, key),

  setSettingsOpen: (v) => set({ settingsOpen: v }),

  updateConfig: async (patch) => {
    const next = await window.bonsai.config.set(patch)
    applyConfig(next)
    set({ config: next })
  },

  setMode: async (key, value) => {
    const cur = get().config
    if (!cur) return
    await get().updateConfig({ modes: { ...cur.modes, [key]: value } })
  },

  saveProfile: async (name) => {
    const c = get().config
    if (!c || !name.trim()) return
    const profile: Profile = {
      id: `p${Date.now()}`,
      name: name.trim(),
      theme: c.theme,
      density: c.density,
      fontSize: c.fontSize,
      cursorBlink: c.cursorBlink,
      modes: { ...c.modes },
    }
    await get().updateConfig({ profiles: [...c.profiles, profile] })
  },

  applyProfile: async (id) => {
    const c = get().config
    const p = c?.profiles.find((x) => x.id === id)
    if (!p) return
    await get().updateConfig({
      theme: p.theme,
      density: p.density,
      fontSize: p.fontSize,
      cursorBlink: p.cursorBlink,
      modes: { ...p.modes },
    })
  },

  deleteProfile: async (id) => {
    const c = get().config
    if (!c) return
    await get().updateConfig({ profiles: c.profiles.filter((p) => p.id !== id) })
  },
}))

export { branchKey }
