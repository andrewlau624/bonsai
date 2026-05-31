import { execFileSync } from 'node:child_process'

// When a macOS/Linux GUI app is launched from Finder/Dock (rather than a
// terminal), it inherits a minimal `launchd` PATH like
// `/usr/bin:/bin:/usr/sbin:/sbin`. That misses Homebrew (`/opt/homebrew/bin`,
// `/usr/local/bin`), nvm, asdf, etc. — so shelling out to `gh`, `git`, and
// friends fails with ENOENT even though they work in a terminal.
//
// Our PTY panes dodge this by spawning a login shell (`zsh -l`), which sources
// the user's profile and gets the full PATH. The CLIs we run directly from the
// main process (see electron/github.ts) do not — so we repair PATH once here,
// the same way fix-path / shell-env do.

const COMMON_BIN = ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin']

/** Ask the user's login+interactive shell for its PATH. */
function loginShellPath(): string | null {
  const shell = process.env.SHELL
  if (!shell) return null
  try {
    // Markers isolate the value from any startup noise the shell may print.
    const out = execFileSync(shell, ['-ilc', 'echo "__BONSAI__${PATH}__BONSAI__"'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const m = /__BONSAI__(.*?)__BONSAI__/s.exec(out)
    return m ? m[1] : null
  } catch {
    return null
  }
}

let done = false

/**
 * Merge the login-shell PATH (and standard bin dirs as a fallback) into
 * process.env.PATH so CLI lookups succeed regardless of how the app launched.
 * Safe to call multiple times; only the first call does work.
 */
export function fixPath(): void {
  if (done) return
  done = true
  if (process.platform === 'win32') return

  const entries: string[] = []
  const seen = new Set<string>()
  const add = (p: string) => {
    if (p && !seen.has(p)) {
      seen.add(p)
      entries.push(p)
    }
  }

  // Prefer the real login-shell PATH (matches what the terminal panes see),
  // then keep whatever we already had, then guarantee the common bin dirs.
  const shellPath = loginShellPath()
  if (shellPath) shellPath.split(':').forEach(add)
  ;(process.env.PATH || '').split(':').forEach(add)
  COMMON_BIN.forEach(add)

  process.env.PATH = entries.join(':')
}
