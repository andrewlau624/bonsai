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

  // ---- Git working tree + branch management ----
  const repoPath = (repoId: string): string => {
    const repo = store.getRepos().find((r) => r.id === repoId)
    if (!repo) throw new Error('Unknown repo')
    return repo.path
  }

  ipcMain.handle('git:status', (_e, cwd: string) => gitOps.status(cwd))
  ipcMain.handle('git:stage', (_e, cwd: string, file: string) => gitOps.stageFile(cwd, file))
  ipcMain.handle('git:unstage', (_e, cwd: string, file: string) => gitOps.unstageFile(cwd, file))
  ipcMain.handle('git:stageAll', (_e, cwd: string) => gitOps.stageAll(cwd))
  ipcMain.handle('git:commit', (_e, cwd: string, message: string) => gitOps.commit(cwd, message))
  ipcMain.handle('git:push', (_e, cwd: string) => gitOps.push(cwd))
  ipcMain.handle('git:pull', (_e, cwd: string) => gitOps.pull(cwd))
  ipcMain.handle('git:fetch', (_e, repoId: string) => gitOps.fetch(repoPath(repoId)))
  ipcMain.handle('git:createBranch', (_e, repoId: string, name: string, from?: string) =>
    gitOps.createBranch(repoPath(repoId), name, from),
  )
  ipcMain.handle('git:deleteBranch', (_e, repoId: string, name: string, force?: boolean) =>
    gitOps.deleteBranch(repoPath(repoId), name, force),
  )
  ipcMain.handle('git:diffFile', (_e, cwd: string, file: string, staged: boolean) =>
    gitOps.diffFile(cwd, file, staged),
  )
  ipcMain.handle('git:readFile', (_e, cwd: string, relPath: string) =>
    gitOps.readFile(cwd, relPath),
  )
  ipcMain.handle('git:listDir', (_e, cwd: string, relPath: string) =>
    gitOps.listDir(cwd, relPath),
  )

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
