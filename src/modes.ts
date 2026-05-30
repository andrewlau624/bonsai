// Behavior "modes" — user-toggleable switches. Each actually drives behavior
// somewhere in the app (see references in the store / components). Add one here
// and it shows up in Settings → Behavior automatically.

export interface ModeDef {
  key: string
  label: string
  description: string
  default: boolean
}

export const MODE_DEFS: ModeDef[] = [
  {
    key: 'autoCarryEnv',
    label: 'Auto-carry .env files',
    description: 'Symlink .env* from the primary checkout into every new worktree.',
    default: true,
  },
  {
    key: 'autoFetchOnOpen',
    label: 'Fetch when opening a branch',
    description: 'Run `git fetch` for the repo each time you open one of its branches.',
    default: false,
  },
  {
    key: 'confirmBeforeDelete',
    label: 'Confirm before deleting a branch',
    description: 'Show a confirmation dialog before a branch (and its worktree) is removed.',
    default: true,
  },
  {
    key: 'confirmBeforePush',
    label: 'Confirm before pushing',
    description: 'Ask for confirmation before running `git push`.',
    default: false,
  },
  {
    key: 'stageAllOnCommit',
    label: 'Stage everything on commit',
    description: 'If nothing is staged, stage all changes automatically when you commit.',
    default: true,
  },
  {
    key: 'showHiddenFiles',
    label: 'Show dotfiles in the file browser',
    description: 'Include hidden files (like .env) when browsing a file’s directory.',
    default: true,
  },
]

export const MODE_DEFAULTS: Record<string, boolean> = Object.fromEntries(
  MODE_DEFS.map((m) => [m.key, m.default]),
)

/** Effective value of a mode given the user's stored overrides. */
export function modeValue(modes: Record<string, boolean>, key: string): boolean {
  return key in modes ? modes[key] : (MODE_DEFAULTS[key] ?? false)
}
