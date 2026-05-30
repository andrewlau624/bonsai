import Store from 'electron-store'
import type { Repo, TabState, LayoutState, AppConfig } from '../shared/types'

interface Schema {
  repos: Repo[]
  tabs: TabState[]
  layout: LayoutState
  config: AppConfig
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'modern',
  density: 'comfortable',
  fontSize: 13,
  cursorBlink: true,
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
