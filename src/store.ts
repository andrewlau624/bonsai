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
  PrComment,
  Commit,
  GhAccount,
  RunnableGroup,
} from '../shared/types'
import { applyTheme } from './themes'
import { modeValue } from './modes'

let tabCounter = 0
const nextTabId = () => `t${Date.now()}-${++tabCounter}`
let previewCounter = 0

export interface PreviewTab {
  id: string
  url: string
}


const branchKey = (repoId: string, branch: string) => `${repoId}::${branch}`

// Foreground-process helpers. A tab is "busy" when its PTY's foreground process
// is a real program rather than the idle login shell.
const SHELLS = new Set([
  'zsh', 'bash', 'sh', 'fish', 'dash', 'ksh', 'tcsh', 'csh', 'pwsh', 'powershell', 'login', 'nu',
])
export function isShellProcess(name?: string): boolean {
  if (!name) return false
  const base = name.replace(/^-/, '').split('/').pop()!.toLowerCase()
  return SHELLS.has(base)
}
export function tabBusy(proc?: string): boolean {
  return !!proc && !isShellProcess(proc)
}
/** Best display name for a tab: live program title → process name → branch. */
export function tabDisplayName(tab: TabState, proc?: string): string {
  if (proc) return tabBusy(proc) ? tab.liveTitle || proc : tab.branch
  return tab.liveTitle || tab.branch
}

type InspectorView =
  | { kind: 'list' }
  | { kind: 'diff'; file: string; staged: boolean; diff: string }

export type DrawerPanel = 'changes' | 'files' | 'prs' | 'log'

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
    accent: c.accent,
    accentColor: c.accentColor,
    uiScale: c.uiScale,
    monoFont: c.monoFont,
    reduceTransparency: c.reduceTransparency,
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
  processByTab: Record<string, string>
  commandsByRepo: Record<string, SavedCommand[]>
  runnablesByCwd: Record<string, RunnableGroup[]>
  usageByRepo: Record<string, Record<string, number>>

  prStatus: PrStatus | null
  prDetail: PullRequestDetail | null
  prComments: PrComment[]
  prBusy: boolean
  ghAccounts: GhAccount[]

  commitsLog: Commit[]

  searchOpen: boolean
  branchFilter: string
  modal: Modal
  branchPrefsByRepo: Record<string, string[] | null>
  branchPicker: string | null // repoId whose picker is open

  config: AppConfig | null
  settingsOpen: boolean
  paletteOpen: boolean

  previewTabs: PreviewTab[]
  activePane: string // 'terminal' or a preview tab id
  previewDetected: boolean

  init: () => Promise<void>
  addRepo: () => Promise<void>
  removeRepo: (id: string) => Promise<void>
  toggleRepo: (id: string) => Promise<void>
  reloadBranches: (repoId: string) => Promise<void>
  openBranch: (repoId: string, branch: string, forceNewTab?: boolean) => Promise<void>
  toggleBranch: (repoId: string, branch: string) => void
  setActiveTab: (id: string) => void
  closeTab: (id: string) => void
  setTabTitle: (id: string, title: string) => void
  setTabProcess: (id: string, name: string) => void
  togglePinTab: (id: string) => void
  reorderTabs: (draggedId: string, targetId: string) => void
  persist: () => void

  activeTab: () => TabState | undefined
  toggleSourceControl: () => void
  setPanel: (p: DrawerPanel) => void
  refreshStatus: () => Promise<void>
  stage: (file: string) => Promise<void>
  unstage: (file: string) => Promise<void>
  discardFile: (file: string) => Promise<void>
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
  runSaved: (cmd: SavedCommand) => void
  runCommandText: (command: string) => void
  loadRunnables: () => Promise<void>
  loadCommands: (repoId: string) => Promise<void>
  saveCommands: (repoId: string, list: SavedCommand[]) => Promise<void>
  toggleBookmark: (label: string, command: string) => void
  isBookmarked: (command: string) => boolean

  loadPrs: () => Promise<void>
  viewPr: (num: number) => Promise<void>
  createPr: (data: { title: string; body: string; draft?: boolean }) => Promise<string | null>
  editPr: (num: number, data: { title: string; body: string }) => Promise<void>
  addPrComment: (num: number, body: string) => Promise<void>
  reviewPr: (num: number, event: 'approve' | 'request-changes' | 'comment', body: string) => Promise<void>
  openPrInWindow: (num: number) => void
  closePrDetail: () => void
  prBranchOnly: boolean
  togglePrBranchOnly: () => void
  loadGhAccounts: () => Promise<void>
  switchGhAccount: (user: string) => Promise<void>

  loadLog: () => Promise<void>

  openPalette: () => void
  closePalette: () => void
  togglePreview: () => void
  setPaneActive: (id: string) => void
  addPreviewTab: (url?: string) => void
  closePreviewTab: (id: string) => void
  setPreviewTabUrl: (id: string, url: string) => void
  openPreviewWindow: (id: string) => void
  detectPreviewUrl: (url: string) => void
  isWebApp: () => boolean
  toggleSidebar: () => void
  setDrawerWidth: (w: number) => void
  revealActive: () => void
  openActiveInEditor: () => void
  newTabOnActive: () => void

  setSearchOpen: (v: boolean) => void
  setBranchFilter: (v: string) => void
  openModal: (m: Modal) => void
  closeModal: () => void
  createBranch: (repoId: string, name: string) => Promise<void>
  requestDeleteBranch: (repoId: string, branch: string) => void
  deleteBranch: (repoId: string, branch: string) => Promise<void>
  loadBranchPrefs: (repoId: string) => Promise<void>
  openBranchPicker: (repoId: string) => void
  closeBranchPicker: () => void
  setIncludedBranches: (repoId: string, names: string[]) => Promise<void>

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
  processByTab: {},
  commandsByRepo: {},
  runnablesByCwd: {},
  usageByRepo: {},

  prStatus: null,
  prDetail: null,
  prComments: [],
  prBusy: false,
  ghAccounts: [],
  prBranchOnly: false,

  commitsLog: [],

  searchOpen: false,
  branchFilter: '',
  modal: null,
  branchPrefsByRepo: {},
  branchPicker: null,

  config: null,
  settingsOpen: false,
  paletteOpen: false,

  previewTabs: [],
  activePane: 'terminal',
  previewDetected: false,

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
    for (const r of repos) {
      void get().loadCommands(r.id)
      void get().loadBranchPrefs(r.id)
    }
    void get().refreshStatus()
    void get().loadRunnables()
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
    void get().loadBranchPrefs(repoId)
  },

  loadBranchPrefs: async (repoId) => {
    const prefs = await window.bonsai.branchPrefs.get(repoId)
    set((s) => ({ branchPrefsByRepo: { ...s.branchPrefsByRepo, [repoId]: prefs } }))
  },

  openBranchPicker: (repoId) => set({ branchPicker: repoId }),
  closeBranchPicker: () => set({ branchPicker: null }),

  setIncludedBranches: async (repoId, names) => {
    await window.bonsai.branchPrefs.set(repoId, names)
    set((s) => ({ branchPrefsByRepo: { ...s.branchPrefsByRepo, [repoId]: names } }))
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
        activePane: 'terminal',
        expandedBranches: new Set(s.expandedBranches).add(key),
      }))
      get().persist()
      void get().refreshStatus()
    void get().loadRunnables()
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
        activePane: 'terminal',
        expandedBranches: new Set(s.expandedBranches).add(key),
        loading,
      }
    })
    get().persist()
    void get().refreshStatus()
    void get().loadRunnables()
  },

  toggleBranch: (repoId, branch) => {
    const key = branchKey(repoId, branch)
    const expanded = new Set(get().expandedBranches)
    expanded.has(key) ? expanded.delete(key) : expanded.add(key)
    set({ expandedBranches: expanded })
    get().persist()
  },

  setActiveTab: (id) => {
    set({ activeTabId: id, inspector: { kind: 'list' }, activePane: 'terminal' })
    get().persist()
    void get().refreshStatus()
    void get().loadRunnables()
  },

  closeTab: (id) => {
    // Guard against losing work: confirm if a real program is running in the tab.
    const proc = get().processByTab[id]
    if (tabBusy(proc) && !confirm(`"${proc}" is still running in this tab. Close it anyway?`)) {
      return
    }
    window.bonsai.session.kill(id)
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id)
      const activeTabId = s.activeTabId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTabId
      const processByTab = { ...s.processByTab }
      delete processByTab[id]
      return { tabs, activeTabId, processByTab }
    })
    get().persist()
    void get().refreshStatus()
    void get().loadRunnables()
  },

  // Live program title (OSC) → tab name, falling back to the branch in the UI.
  // Runtime-only: not persisted (re-derived from the running program each launch).
  setTabTitle: (id, title) => {
    const clean = title.replace(/\s+/g, ' ').trim().slice(0, 60)
    const tab = get().tabs.find((t) => t.id === id)
    if (!tab || tab.liveTitle === (clean || undefined)) return
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, liveTitle: clean || undefined } : t)),
    }))
  },

  // Foreground process name for a tab's PTY (drives titles + busy indicator).
  setTabProcess: (id, name) => {
    if (get().processByTab[id] === name) return
    set((s) => ({ processByTab: { ...s.processByTab, [id]: name } }))
  },

  togglePinTab: (id) => {
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)) }))
    get().persist()
  },

  // Move the dragged tab to the target tab's slot — but only within its own
  // group (same repo + pin state); cross-group drags are ignored.
  reorderTabs: (draggedId, targetId) => {
    if (draggedId === targetId) return
    let changed = false
    set((s) => {
      const tabs = [...s.tabs]
      const from = tabs.findIndex((t) => t.id === draggedId)
      const to = tabs.findIndex((t) => t.id === targetId)
      if (from === -1 || to === -1) return s
      const a = tabs[from]
      const b = tabs[to]
      // Only reorder among terminals of the same branch.
      if (a.repoId !== b.repoId || a.branch !== b.branch || !!a.pinned !== !!b.pinned) return s
      const [moved] = tabs.splice(from, 1)
      tabs.splice(to, 0, moved)
      changed = true
      return { tabs }
    })
    if (changed) get().persist()
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
    if (next) get().setPanel(get().panel)
  },

  setPanel: (p) => {
    set({ panel: p, inspector: { kind: 'list' } })
    if (p === 'changes') void get().refreshStatus()
    if (p === 'prs') void get().loadPrs()
    if (p === 'files') void get().browseFiles('')
    if (p === 'log') void get().loadLog()
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

  discardFile: async (file) => {
    const tab = get().activeTab()
    if (!tab) return
    if (!confirm(`Discard all changes to ${file}? This can't be undone.`)) return
    await window.bonsai.git.discard(tab.cwd, file)
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
      const processByTab = { ...s.processByTab }
      delete processByTab[tabId]
      return { sessionByTab: next, processByTab }
    }),

  runSaved: (cmd) => {
    const { activeTabId, sessionByTab } = get()
    if (!activeTabId) return
    const sid = sessionByTab[activeTabId]
    if (!sid) return
    if (cmd.action === 'paste') {
      // Drop the text at the prompt (no trailing newline) so it can be edited.
      window.bonsai.session.write(sid, cmd.commands.join('\n'))
    } else {
      for (const line of cmd.commands) {
        if (line.trim()) window.bonsai.session.write(sid, line + '\n')
      }
    }
  },

  runCommandText: (command) => {
    const tab = get().activeTab()
    if (!tab) return
    const sid = get().sessionByTab[tab.id]
    if (sid) window.bonsai.session.write(sid, `${command}\n`)
    // Track usage so frequently-run tasks can be surfaced.
    void window.bonsai.usage.bump(tab.repoId, command).then((counts) =>
      set((s) => ({ usageByRepo: { ...s.usageByRepo, [tab.repoId]: counts } })),
    )
  },

  loadRunnables: async () => {
    const tab = get().activeTab()
    if (!tab) return
    try {
      const groups = await window.bonsai.git.runnables(tab.cwd)
      set((s) => ({ runnablesByCwd: { ...s.runnablesByCwd, [tab.cwd]: groups } }))
    } catch {
      /* ignore */
    }
    try {
      const counts = await window.bonsai.usage.get(tab.repoId)
      set((s) => ({ usageByRepo: { ...s.usageByRepo, [tab.repoId]: counts } }))
    } catch {
      /* ignore */
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

  isBookmarked: (command) => {
    const tab = get().activeTab()
    if (!tab) return false
    const list = get().commandsByRepo[tab.repoId] ?? []
    return list.some((c) => c.commands.length === 1 && c.commands[0] === command)
  },

  toggleBookmark: (label, command) => {
    const tab = get().activeTab()
    if (!tab) return
    const list = get().commandsByRepo[tab.repoId] ?? []
    const existing = list.find((c) => c.commands.length === 1 && c.commands[0] === command)
    const next = existing
      ? list.filter((c) => c.id !== existing.id)
      : [...list, { id: `c${Date.now()}`, name: label, commands: [command], action: 'run' as const }]
    void get().saveCommands(tab.repoId, next)
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
    void get().loadGhAccounts()
  },

  loadGhAccounts: async () => {
    try {
      const ghAccounts = await window.bonsai.pr.accounts()
      set({ ghAccounts })
    } catch {
      /* gh missing */
    }
  },

  switchGhAccount: async (user) => {
    try {
      await window.bonsai.pr.switchAccount(user)
      await get().loadGhAccounts()
      await get().loadPrs()
    } catch (err) {
      alert(`Could not switch account:\n${(err as Error).message}`)
    }
  },

  viewPr: async (num) => {
    const tab = get().activeTab()
    if (!tab) return
    set({ prBusy: true, prComments: [] })
    try {
      const prDetail = await window.bonsai.pr.view(tab.cwd, num)
      set({ prDetail })
      // Comments load in the background; detail shows immediately.
      void window.bonsai.pr
        .comments(tab.cwd, num)
        .then((prComments) => set({ prComments }))
        .catch(() => {})
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

  addPrComment: async (num, body) => {
    const tab = get().activeTab()
    if (!tab || !body.trim()) return
    set({ prBusy: true })
    try {
      await window.bonsai.pr.comment(tab.cwd, num, body)
      const prComments = await window.bonsai.pr.comments(tab.cwd, num)
      set({ prComments })
    } catch (err) {
      alert(`Could not post comment:\n${(err as Error).message}`)
    } finally {
      set({ prBusy: false })
    }
  },

  reviewPr: async (num, event, body) => {
    const tab = get().activeTab()
    if (!tab) return
    set({ prBusy: true })
    try {
      await window.bonsai.pr.review(tab.cwd, num, event, body)
      const prComments = await window.bonsai.pr.comments(tab.cwd, num)
      set({ prComments })
    } catch (err) {
      alert(`Review failed:\n${(err as Error).message}`)
    } finally {
      set({ prBusy: false })
    }
  },

  openPrInWindow: (num) => {
    const tab = get().activeTab()
    if (tab) void window.bonsai.window.openPr(tab.cwd, num)
  },

  togglePrBranchOnly: () => set((s) => ({ prBranchOnly: !s.prBranchOnly })),

  closePrDetail: () => set({ prDetail: null, prComments: [] }),

  loadLog: async () => {
    const tab = get().activeTab()
    if (!tab) return
    try {
      const commitsLog = await window.bonsai.git.log(tab.cwd)
      set({ commitsLog })
    } catch (err) {
      console.error('log failed', err)
    }
  },

  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),

  togglePreview: () => {
    const { previewTabs, activePane } = get()
    if (activePane !== 'terminal') set({ activePane: 'terminal' })
    else if (previewTabs.length) set({ activePane: previewTabs[0].id })
    else get().addPreviewTab()
  },
  setPaneActive: (id) => set({ activePane: id }),

  addPreviewTab: (url = 'http://localhost:3000') => {
    const id = `pv${++previewCounter}`
    set((s) => ({
      previewTabs: [...s.previewTabs, { id, url }],
      activePane: id,
      previewDetected: true,
    }))
  },

  closePreviewTab: (id) =>
    set((s) => {
      const previewTabs = s.previewTabs.filter((t) => t.id !== id)
      const activePane =
        s.activePane === id ? (previewTabs[previewTabs.length - 1]?.id ?? 'terminal') : s.activePane
      return { previewTabs, activePane }
    }),

  setPreviewTabUrl: (id, url) =>
    set((s) => ({ previewTabs: s.previewTabs.map((t) => (t.id === id ? { ...t, url } : t)) })),

  openPreviewWindow: (id) => {
    const t = get().previewTabs.find((x) => x.id === id)
    if (t) void window.bonsai.window.openBrowser(t.url)
  },

  // Picks up dev-server URLs printed in the terminal (Vite/Next/Supabase/etc.).
  // One preview tab per distinct host:port; the first one auto-opens.
  detectPreviewUrl: (url) => {
    const clean = url.replace(/[)\].,'"]+$/, '')
    let origin: string
    try {
      origin = new URL(clean).origin
    } catch {
      return
    }
    const exists = get().previewTabs.some((t) => {
      try {
        return new URL(t.url).origin === origin
      } catch {
        return false
      }
    })
    if (exists) return
    const id = `pv${++previewCounter}`
    const firstEver = !get().previewDetected
    set((s) => ({
      previewTabs: [...s.previewTabs, { id, url: clean }],
      previewDetected: true,
      activePane: firstEver ? id : s.activePane,
    }))
  },

  // A repo is a "web app" if it has a dev/start/serve/preview script, OR if a
  // local server URL was detected in the terminal (covers non-npm setups).
  isWebApp: () => {
    if (get().previewDetected) return true
    const tab = get().activeTab()
    if (!tab) return false
    const groups = get().runnablesByCwd[tab.cwd] ?? []
    return groups.some((g) => g.items.some((i) => /\b(dev|start|serve|preview)\b/.test(i.label)))
  },

  toggleSidebar: () => {
    const c = get().config
    if (c) void get().updateConfig({ sidebarCollapsed: !c.sidebarCollapsed })
  },

  setDrawerWidth: (w) => {
    const width = Math.max(280, Math.min(720, Math.round(w)))
    const c = get().config
    if (c) void get().updateConfig({ drawerWidth: width })
  },

  revealActive: () => {
    const tab = get().activeTab()
    if (tab) void window.bonsai.app.reveal(tab.cwd)
  },

  openActiveInEditor: () => {
    const tab = get().activeTab()
    if (tab) void window.bonsai.app.openInEditor(tab.cwd)
  },

  newTabOnActive: () => {
    const tab = get().activeTab()
    if (tab) void get().openBranch(tab.repoId, tab.branch, true)
  },

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
