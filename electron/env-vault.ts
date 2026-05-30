import fs from 'node:fs'
import path from 'node:path'

// The core feature: git worktrees don't carry gitignored files like `.env`,
// so a freshly-created worktree is missing the secrets the app needs. The
// env vault finds every `.env*` file in the primary checkout and symlinks it
// into the worktree, so the file stays a single source of truth across all
// branches.

const ENV_FILE_RE = /^\.env(\..+)?$/

/** Names of `.env*` files present at the root of `dir`. */
export function findEnvFiles(dir: string): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => (e.isFile() || e.isSymbolicLink()) && ENV_FILE_RE.test(e.name))
    .map((e) => e.name)
    .sort()
}

/**
 * Carry every `.env*` file from `sourceDir` into `targetDir` as a symlink.
 * Skips files that already exist in the target (so a real file in the worktree
 * is never clobbered). Returns the list of file names now available in target.
 */
export function carryEnvFiles(sourceDir: string, targetDir: string): string[] {
  if (path.resolve(sourceDir) === path.resolve(targetDir)) {
    // Primary checkout — the files already live here.
    return findEnvFiles(sourceDir)
  }

  const carried: string[] = []
  for (const name of findEnvFiles(sourceDir)) {
    const from = path.join(sourceDir, name)
    const to = path.join(targetDir, name)

    if (fs.existsSync(to)) {
      // Already present (real file or a stale symlink) — leave it alone.
      carried.push(name)
      continue
    }
    try {
      fs.symlinkSync(from, to)
      carried.push(name)
    } catch (err) {
      // Symlink can fail (e.g. permissions); fall back to a copy.
      try {
        fs.copyFileSync(from, to)
        carried.push(name)
      } catch {
        console.error(`[env-vault] could not carry ${name}:`, err)
      }
    }
  }
  return carried
}
