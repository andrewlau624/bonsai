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

export interface Commit {
  hash: string
  shortHash: string
  subject: string
  author: string
  relative: string
}

/** A persisted terminal tab. */
export interface TabState {
  id: string
  repoId: string
  branch: string
  cwd: string
  title: string
}

export interface SavedCommand {
  id: string
  name: string
  /** One or more shell commands / text lines for the active terminal. */
  commands: string[]
  /** 'run' executes (sends a newline); 'paste' drops the text at the prompt to edit/reuse. */
  action: 'run' | 'paste'
}

export interface PullRequest {
  number: number
  title: string
  state: string
  url: string
  headRefName: string
  isDraft: boolean
  author: string
}

export interface PrCheck {
  name: string
  /** Normalized status: pass | fail | pending | skip | cancel. */
  bucket: 'pass' | 'fail' | 'pending' | 'skip' | 'cancel'
  link: string
  workflow?: string
}

export interface PrComment {
  author: string
  body: string
  createdAt: string
  /** A conversation comment or a review summary. */
  kind: 'comment' | 'review'
  /** Review state (APPROVED, CHANGES_REQUESTED, COMMENTED) when kind === 'review'. */
  state?: string
}

export interface PullRequestDetail extends PullRequest {
  body: string
  baseRefName: string
  additions: number
  deletions: number
  commits: number
  checks: PrCheck[]
}

export type PrStatus =
  | { available: false; reason: string }
  | { available: true; prs: PullRequest[] }

export interface GhAccount {
  user: string
  active: boolean
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

export type UiFont = 'system' | 'rounded' | 'mono' | 'serif'
export type Corners = 'sharp' | 'soft' | 'round'
export type CursorStyle = 'bar' | 'block' | 'underline'

/** User-tunable configuration, persisted and editable as a JSON file. */
export interface AppConfig {
  theme: string
  density: 'comfortable' | 'compact'
  fontSize: number
  cursorBlink: boolean
  /** Interface font family style. */
  uiFont: UiFont
  /** Corner rounding style across the UI. */
  corners: Corners
  /** Terminal cursor shape. */
  cursorStyle: CursorStyle
  /** Whether UI transitions/animations play. */
  animations: boolean
  /** Accent color override id, or 'theme' to use the theme's own accent. */
  accent: string
  /** Layout preferences. */
  sidebarCollapsed: boolean
  drawerWidth: number
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
    log(cwd: string): Promise<Commit[]>
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
  commands: {
    list(repoId: string): Promise<SavedCommand[]>
    save(repoId: string, list: SavedCommand[]): Promise<void>
  }
  pr: {
    list(cwd: string): Promise<PrStatus>
    view(cwd: string, num: number): Promise<PullRequestDetail>
    comments(cwd: string, num: number): Promise<PrComment[]>
    create(
      cwd: string,
      data: { title: string; body: string; base?: string; draft?: boolean },
    ): Promise<{ url: string }>
    edit(cwd: string, num: number, data: { title: string; body: string }): Promise<void>
    comment(cwd: string, num: number, body: string): Promise<void>
    review(
      cwd: string,
      num: number,
      event: 'approve' | 'request-changes' | 'comment',
      body: string,
    ): Promise<void>
    accounts(): Promise<GhAccount[]>
    switchAccount(user: string): Promise<void>
    /** Fetch the CI log for a check given its details URL. */
    checkLog(cwd: string, link: string): Promise<string>
  }
  window: {
    /** Open the standalone code viewer window for a worktree (optionally at a file). */
    openCode(cwd: string, file: string): Promise<void>
    /** (Code window) fired when the main window requests navigation to a file. */
    onNavigate(cb: (file: string) => void): () => void
    /** Open a pull request in its own window. */
    openPr(cwd: string, num: number): Promise<void>
  }
  openExternal(url: string): Promise<void>
  app: {
    /** Open a folder/file in the OS file manager. */
    reveal(path: string): Promise<void>
    /** Open a path in the user's editor (VS Code if available). Resolves to true on success. */
    openInEditor(path: string): Promise<boolean>
  }
  onOpenSettings(cb: () => void): () => void
}
