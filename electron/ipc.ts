import { ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Repo, SessionOptions, TabState, LayoutState } from '../shared/types'
import * as gitOps from './git'
import * as ptyMgr from './pty'
import * as store from './store'

export function registerIpc(): void {
  // ---- Repos ----
  ipcMain.handle('repos:list', () => store.getRepos())

  ipcMain.handle('repos:add', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: 'Add a git repository',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const repoPath = result.filePaths[0]
    if (!(await gitOps.isGitRepo(repoPath))) {
      await dialog.showMessageBox(win, {
        type: 'error',
        message: 'Not a git repository',
        detail: `${repoPath} is not a git repository.`,
      })
      return null
    }

    const repos = store.getRepos()
    const existing = repos.find((r) => path.resolve(r.path) === path.resolve(repoPath))
    if (existing) return existing

    const repo: Repo = { id: randomUUID(), name: path.basename(repoPath), path: repoPath }
    store.setRepos([...repos, repo])
    return repo
  })

  ipcMain.handle('repos:remove', (_e, id: string) => {
    store.setRepos(store.getRepos().filter((r) => r.id !== id))
  })

  ipcMain.handle('repos:branches', async (_e, repoId: string) => {
    const repo = store.getRepos().find((r) => r.id === repoId)
    if (!repo) return []
    return gitOps.listBranches(repo.path)
  })

  // ---- Worktrees ----
  ipcMain.handle('worktree:ensure', async (_e, repoId: string, branch: string) => {
    const repo = store.getRepos().find((r) => r.id === repoId)
    if (!repo) throw new Error('Unknown repo')
    const wt = await gitOps.ensureWorktree(repo.path, repo.name, branch)
    return { ...wt, repoId }
  })

  // ---- Sessions (PTY) ----
  ipcMain.handle('session:create', (event, opts: SessionOptions) =>
    ptyMgr.createSession(opts, event.sender),
  )
  ipcMain.on('session:write', (_e, id: string, data: string) => ptyMgr.writeSession(id, data))
  ipcMain.on('session:resize', (_e, id: string, cols: number, rows: number) =>
    ptyMgr.resizeSession(id, cols, rows),
  )
  ipcMain.on('session:kill', (_e, id: string) => ptyMgr.killSession(id))

  // ---- Layout persistence ----
  ipcMain.handle('layout:load', () => store.getLayout())
  ipcMain.handle('layout:save', (_e, state: { tabs: TabState[]; layout: LayoutState }) =>
    store.setLayout(state),
  )
}
