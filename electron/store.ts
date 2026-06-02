import Store from 'electron-store'
import type { Repo, TabState, LayoutState, AppConfig, SavedCommand } from '../shared/types'

interface Schema {
  repos: Repo[]
  tabs: TabState[]
  layout: LayoutState
  config: AppConfig
  commands: Record<string, SavedCommand[]>
  usage: Record<string, Record<string, number>>
  branchPrefs: Record<string, string[]>
  /** repoId -> { branchName -> color id } */
  branchColors: Record<string, Record<string, string>>
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'modern',
  density: 'comfortable',
  fontSize: 13,
  cursorBlink: true,
  uiFont: 'system',
  corners: 'soft',
  cursorStyle: 'bar',
  animations: true,
  accent: 'theme',
  accentColor: '#45b884',
  uiScale: 'normal',
  monoFont: 'system',
  reduceTransparency: false,
  syntaxHighlight: true,
  codeLineNumbers: true,
  sidebarCollapsed: false,
  drawerWidth: 380,
  modes: {},
  profiles: [],
}

const store = new Store<Schema>({
  name: 'bonsai',
  defaults: {
    repos: [],
    tabs: [],
    layout: { expandedRepoIds: [], expandedBranches: [], activeTabId: null },
    config: DEFAULT_CONFIG,
    commands: {},
    usage: {},
    branchPrefs: {},
    branchColors: {},
  },
})

export function getRepos(): Repo[] {
  return store.get('repos')
}

export function setRepos(repos: Repo[]): void {
  store.set('repos', repos)
}

export function getLayout(): { tabs: TabState[]; layout: LayoutState } {
  return { tabs: store.get('tabs'), layout: store.get('layout') }
}

export function setLayout(state: { tabs: TabState[]; layout: LayoutState }): void {
  store.set('tabs', state.tabs)
  store.set('layout', state.layout)
}

export function getConfig(): AppConfig {
  return { ...DEFAULT_CONFIG, ...store.get('config') }
}

export function setConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...getConfig(), ...patch }
  store.set('config', next)
  return next
}

export function configPath(): string {
  return store.path
}

export function getCommands(repoId: string): SavedCommand[] {
  return store.get('commands')[repoId] ?? []
}

export function setCommands(repoId: string, list: SavedCommand[]): void {
  store.set('commands', { ...store.get('commands'), [repoId]: list })
}

export function getUsage(repoId: string): Record<string, number> {
  return store.get('usage')[repoId] ?? {}
}

export function getBranchPrefs(repoId: string): string[] | null {
  return store.get('branchPrefs')[repoId] ?? null
}

export function setBranchPrefs(repoId: string, names: string[]): void {
  store.set('branchPrefs', { ...store.get('branchPrefs'), [repoId]: names })
}

export function getBranchColors(repoId: string): Record<string, string> {
  return store.get('branchColors')[repoId] ?? {}
}

export function setBranchColors(repoId: string, map: Record<string, string>): void {
  store.set('branchColors', { ...store.get('branchColors'), [repoId]: map })
}

export function bumpUsage(repoId: string, command: string): Record<string, number> {
  const all = store.get('usage')
  const repo = { ...(all[repoId] ?? {}) }
  repo[command] = (repo[command] ?? 0) + 1
  store.set('usage', { ...all, [repoId]: repo })
  return repo
}
