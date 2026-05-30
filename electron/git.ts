import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { simpleGit, SimpleGit } from 'simple-git'
import type { Branch, Worktree } from '../shared/types'
import { carryEnvFiles } from './env-vault'

// Worktrees are stored centrally so they don't clutter the repo's parent dir:
//   ~/.bonsai/worktrees/<repoName>/<sanitized-branch>
const WORKTREES_ROOT = path.join(os.homedir(), '.bonsai', 'worktrees')

function git(repoPath: string): SimpleGit {
  return simpleGit({ baseDir: repoPath })
}

function sanitizeBranch(branch: string): string {
  return branch.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    return await git(repoPath).checkIsRepo()
  } catch {
    return false
  }
}

export async function currentBranch(repoPath: string): Promise<string> {
  const name = (await git(repoPath).revparse(['--abbrev-ref', 'HEAD'])).trim()
  return name === 'HEAD' ? '(detached)' : name
}

interface RawWorktree {
  path: string
  branch: string | null
}

/** Parse `git worktree list --porcelain` into structured entries. */
async function listWorktrees(repoPath: string): Promise<RawWorktree[]> {
  const out = await git(repoPath).raw(['worktree', 'list', '--porcelain'])
  const trees: RawWorktree[] = []
  let cur: Partial<RawWorktree> = {}
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (cur.path) trees.push({ path: cur.path, branch: cur.branch ?? null })
      cur = { path: line.slice('worktree '.length).trim() }
    } else if (line.startsWith('branch ')) {
      // e.g. "branch refs/heads/feature/x"
      cur.branch = line.slice('branch '.length).replace('refs/heads/', '').trim()
    } else if (line === '') {
      if (cur.path) trees.push({ path: cur.path, branch: cur.branch ?? null })
      cur = {}
    }
  }
  if (cur.path) trees.push({ path: cur.path, branch: cur.branch ?? null })
  return trees
}

export async function listBranches(repoPath: string): Promise<Branch[]> {
  const g = git(repoPath)
  const summary = await g.branchLocal()
  const worktrees = await listWorktrees(repoPath)
  const byBranch = new Map(worktrees.filter((w) => w.branch).map((w) => [w.branch!, w.path]))

  return summary.all.map((name) => ({
    name,
    current: name === summary.current,
    worktreePath: byBranch.get(name) ?? null,
  }))
}

/**
 * Ensure a usable worktree exists for `branch`, creating one if needed, then
 * carry the primary checkout's `.env*` files into it. Returns where a terminal
 * for this branch should run.
 */
export async function ensureWorktree(
  repoPath: string,
  repoName: string,
  branch: string,
): Promise<Worktree> {
  const g = git(repoPath)
  const cur = await currentBranch(repoPath)

  // The branch checked out in the primary repo just uses the repo dir itself.
  if (branch === cur) {
    return {
      repoId: '',
      branch,
      path: repoPath,
      primary: true,
      carriedEnvFiles: carryEnvFiles(repoPath, repoPath),
    }
  }

  // Reuse an existing worktree for this branch if git already knows one.
  const existing = (await listWorktrees(repoPath)).find((w) => w.branch === branch)
  let worktreePath = existing?.path

  if (!worktreePath) {
    const dir = path.join(WORKTREES_ROOT, sanitizeBranch(repoName), sanitizeBranch(branch))
    fs.mkdirSync(path.dirname(dir), { recursive: true })
    await g.raw(['worktree', 'add', dir, branch])
    worktreePath = dir
  }

  const carriedEnvFiles = carryEnvFiles(repoPath, worktreePath)
  return { repoId: '', branch, path: worktreePath, primary: false, carriedEnvFiles }
}
