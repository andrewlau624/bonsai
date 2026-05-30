import { contextBridge, ipcRenderer } from 'electron'
import type {
  BonsaiApi,
  Repo,
  Branch,
  Worktree,
  GitStatus,
  DirEntry,
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
  git: {
    status: (cwd) => ipcRenderer.invoke('git:status', cwd) as Promise<GitStatus>,
    stage: (cwd, file) => ipcRenderer.invoke('git:stage', cwd, file) as Promise<void>,
    unstage: (cwd, file) => ipcRenderer.invoke('git:unstage', cwd, file) as Promise<void>,
    stageAll: (cwd) => ipcRenderer.invoke('git:stageAll', cwd) as Promise<void>,
    commit: (cwd, message) => ipcRenderer.invoke('git:commit', cwd, message) as Promise<void>,
    push: (cwd) => ipcRenderer.invoke('git:push', cwd) as Promise<string>,
    pull: (cwd) => ipcRenderer.invoke('git:pull', cwd) as Promise<string>,
    fetch: (repoId) => ipcRenderer.invoke('git:fetch', repoId) as Promise<void>,
    createBranch: (repoId, name, from) =>
      ipcRenderer.invoke('git:createBranch', repoId, name, from) as Promise<void>,
    deleteBranch: (repoId, name, force) =>
      ipcRenderer.invoke('git:deleteBranch', repoId, name, force) as Promise<void>,
    diffFile: (cwd, file, staged) =>
      ipcRenderer.invoke('git:diffFile', cwd, file, staged) as Promise<string>,
    readFile: (cwd, relPath) =>
      ipcRenderer.invoke('git:readFile', cwd, relPath) as Promise<{
        content: string
        truncated: boolean
      }>,
    listDir: (cwd, relPath) =>
      ipcRenderer.invoke('git:listDir', cwd, relPath) as Promise<DirEntry[]>,
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
