import { contextBridge, ipcRenderer } from 'electron'
import type {
  BonsaiApi,
  Repo,
  Branch,
  Worktree,
  SessionOptions,
  TabState,
  LayoutState,
} from '../shared/types'

const api: BonsaiApi = {
  repos: {
    list: () => ipcRenderer.invoke('repos:list') as Promise<Repo[]>,
    add: () => ipcRenderer.invoke('repos:add') as Promise<Repo | null>,
    remove: (id) => ipcRenderer.invoke('repos:remove', id) as Promise<void>,
    branches: (repoId) => ipcRenderer.invoke('repos:branches', repoId) as Promise<Branch[]>,
  },
  worktree: {
    ensure: (repoId, branch) =>
      ipcRenderer.invoke('worktree:ensure', repoId, branch) as Promise<Worktree>,
  },
  session: {
    create: (opts: SessionOptions) =>
      ipcRenderer.invoke('session:create', opts) as Promise<string>,
    write: (id, data) => ipcRenderer.send('session:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('session:resize', id, cols, rows),
    kill: (id) => ipcRenderer.send('session:kill', id),
    onData: (cb) => {
      const listener = (_e: unknown, id: string, data: string) => cb(id, data)
      ipcRenderer.on('session:data', listener)
      return () => ipcRenderer.removeListener('session:data', listener)
    },
    onExit: (cb) => {
      const listener = (_e: unknown, id: string, code: number) => cb(id, code)
      ipcRenderer.on('session:exit', listener)
      return () => ipcRenderer.removeListener('session:exit', listener)
    },
  },
  layout: {
    load: () =>
      ipcRenderer.invoke('layout:load') as Promise<{ tabs: TabState[]; layout: LayoutState }>,
    save: (state) => ipcRenderer.invoke('layout:save', state) as Promise<void>,
  },
}

contextBridge.exposeInMainWorld('bonsai', api)
