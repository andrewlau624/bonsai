import Store from 'electron-store'
import type { Repo, TabState, LayoutState } from '../shared/types'

interface Schema {
  repos: Repo[]
  tabs: TabState[]
  layout: LayoutState
}

const store = new Store<Schema>({
  name: 'bonsai',
  defaults: {
    repos: [],
    tabs: [],
    layout: { expandedRepoIds: [], expandedBranches: [], activeTabId: null },
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
