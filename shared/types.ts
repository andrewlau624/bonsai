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

/** A persisted terminal tab. */
export interface TabState {
  id: string
  repoId: string
  branch: string
  cwd: string
  title: string
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
}
