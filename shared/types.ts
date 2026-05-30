// Types shared between the Electron main process and the React renderer.

export interface Repo {
  id: string
  name: string
  /** Absolute path to the primary checkout (the folder the user registered). */
  path: string
}

export interface Branch {
  name: string
  /** True if this is the branch currently checked out in the primary repo. */
  current: boolean
  /** Absolute worktree path if one already exists for this branch, else null. */
  worktreePath: string | null
}

export interface Worktree {
  repoId: string
  branch: string
  /** Absolute path of the worktree the terminal should run in. */
  path: string
  /** Whether this is the repo's primary checkout (not a managed worktree). */
  primary: boolean
  /** Names of .env* files that were carried in (symlinked) from the primary checkout. */
  carriedEnvFiles: string[]
}

export interface SessionOptions {
  repoId: string
  branch: string
  /** Working directory the shell starts in (a worktree path). */
  cwd: string
  cols: number
  rows: number
}

export interface FileChange {
  path: string
  /** Staged status code from `git status` (e.g. 'M', 'A', ' '). */
  index: string
  /** Unstaged (working tree) status code. */
  working: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'
  staged: boolean
  unstaged: boolean
  insertions?: number
  deletions?: number
}

export interface GitStatus {
  branch: string
  tracking: string | null
  ahead: number
  behind: number
  files: FileChange[]
  clean: boolean
}

export interface DirEntry {
  name: string
  type: 'dir' | 'file'
  /** Worktree-relative path. */
  path: string
}

/** A persisted terminal tab. */
export interface TabState {
  id: string
  repoId: string
  branch: string
  cwd: string
  title: string
}

export interface Profile {
  id: string
  name: string
  theme: string
  density: 'comfortable' | 'compact'
  fontSize: number
  cursorBlink: boolean
  modes: Record<string, boolean>
}

/** User-tunable configuration, persisted and editable as a JSON file. */
export interface AppConfig {
  theme: string
  density: 'comfortable' | 'compact'
  fontSize: number
  cursorBlink: boolean
  /** Overrides for the mode toggles defined in the renderer (key -> on/off). */
  modes: Record<string, boolean>
  profiles: Profile[]
}

/** Persisted UI layout, reloaded on next launch. */
export interface LayoutState {
  expandedRepoIds: string[]
  expandedBranches: string[] // `${repoId}::${branch}`
  activeTabId: string | null
}

/** The API exposed on `window.bonsai` by the preload script. */
export interface BonsaiApi {
  repos: {
    list(): Promise<Repo[]>
    add(): Promise<Repo | null>
    remove(id: string): Promise<void>
    branches(repoId: string): Promise<Branch[]>
  }
  worktree: {
    ensure(repoId: string, branch: string): Promise<Worktree>
  }
  git: {
    status(cwd: string): Promise<GitStatus>
    stage(cwd: string, file: string): Promise<void>
    unstage(cwd: string, file: string): Promise<void>
    stageAll(cwd: string): Promise<void>
    commit(cwd: string, message: string): Promise<void>
    push(cwd: string): Promise<string>
    pull(cwd: string): Promise<string>
    fetch(repoId: string): Promise<void>
    createBranch(repoId: string, name: string, from?: string): Promise<void>
    deleteBranch(repoId: string, name: string, force?: boolean): Promise<void>
    diffFile(cwd: string, file: string, staged: boolean): Promise<string>
    readFile(cwd: string, relPath: string): Promise<{ content: string; truncated: boolean }>
    listDir(cwd: string, relPath: string): Promise<DirEntry[]>
  }
  session: {
    create(opts: SessionOptions): Promise<string>
    write(id: string, data: string): void
    resize(id: string, cols: number, rows: number): void
    kill(id: string): void
    onData(cb: (id: string, data: string) => void): () => void
    onExit(cb: (id: string, code: number) => void): () => void
  }
  layout: {
    load(): Promise<{ tabs: TabState[]; layout: LayoutState }>
    save(state: { tabs: TabState[]; layout: LayoutState }): Promise<void>
  }
  config: {
    get(): Promise<AppConfig>
    set(patch: Partial<AppConfig>): Promise<AppConfig>
    path(): Promise<string>
    reveal(): Promise<void>
  }
  onOpenSettings(cb: () => void): () => void
}
