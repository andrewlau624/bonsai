import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { simpleGit, SimpleGit } from 'simple-git'
import type { Branch, Worktree, GitStatus, FileChange, DirEntry, Commit } from '../shared/types'
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
 * carry the primary checkout's `.env*` files into it.
 */
export async function ensureWorktree(
  repoPath: string,
  repoName: string,
  branch: string,
  carryEnv = true,
): Promise<Worktree> {
  const g = git(repoPath)
  const cur = await currentBranch(repoPath)

  if (branch === cur) {
    return {
      repoId: '',
      branch,
      path: repoPath,
      primary: true,
      carriedEnvFiles: carryEnv ? carryEnvFiles(repoPath, repoPath) : [],
    }
  }

  const existing = (await listWorktrees(repoPath)).find((w) => w.branch === branch)
  let worktreePath = existing?.path

  if (!worktreePath) {
    const dir = path.join(WORKTREES_ROOT, sanitizeBranch(repoName), sanitizeBranch(branch))
    fs.mkdirSync(path.dirname(dir), { recursive: true })
    await g.raw(['worktree', 'add', dir, branch])
    worktreePath = dir
  }

  const carriedEnvFiles = carryEnv ? carryEnvFiles(repoPath, worktreePath) : []
  return { repoId: '', branch, path: worktreePath, primary: false, carriedEnvFiles }
}

// ---------------------------------------------------------------------------
// Branch management
// ---------------------------------------------------------------------------

export async function createBranch(repoPath: string, name: string, from?: string): Promise<void> {
  const clean = name.trim()
  if (!clean) throw new Error('Branch name is required')
  // Let git validate the ref name; it rejects spaces, ~, ^, etc.
  const args = from ? ['branch', clean, from] : ['branch', clean]
  await git(repoPath).raw(args)
}

export async function deleteBranch(
  repoPath: string,
  name: string,
  force = false,
): Promise<void> {
  // A branch checked out in a worktree can't be deleted until the worktree goes.
  const wt = (await listWorktrees(repoPath)).find((w) => w.branch === name)
  if (wt && path.resolve(wt.path) !== path.resolve(repoPath)) {
    await git(repoPath).raw(['worktree', 'remove', '--force', wt.path])
  }
  await git(repoPath).raw(['branch', force ? '-D' : '-d', name])
}

export async function fetch(repoPath: string): Promise<void> {
  await git(repoPath).raw(['fetch', '--all', '--prune'])
}

// ---------------------------------------------------------------------------
// Working tree: status, staging, commit, sync
// ---------------------------------------------------------------------------

function classify(index: string, working: string): FileChange['status'] {
  if (index === '?' && working === '?') return 'untracked'
  if (index === 'U' || working === 'U') return 'conflicted'
  const c = index !== ' ' && index !== '?' ? index : working
  switch (c) {
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
      return 'renamed'
    default:
      return 'modified'
  }
}

export async function status(cwd: string): Promise<GitStatus> {
  const g = git(cwd)
  const s = await g.status()

  // Per-file insertion/deletion counts for tracked changes (vs HEAD).
  const stats = new Map<string, { insertions: number; deletions: number }>()
  try {
    const summary = await g.diffSummary(['HEAD'])
    for (const f of summary.files) {
      if (!('binary' in f) || !f.binary) {
        const tf = f as { file: string; insertions: number; deletions: number }
        stats.set(tf.file, { insertions: tf.insertions, deletions: tf.deletions })
      }
    }
  } catch {
    /* no commits yet, or detached — counts just stay undefined */
  }

  const files: FileChange[] = s.files.map((f) => {
    const st = stats.get(f.path)
    return {
      path: f.path,
      index: f.index,
      working: f.working_dir,
      status: classify(f.index, f.working_dir),
      staged: f.index !== ' ' && f.index !== '?',
      unstaged: f.working_dir !== ' ',
      insertions: st?.insertions,
      deletions: st?.deletions,
    }
  })

  return {
    branch: s.current ?? '(detached)',
    tracking: s.tracking ?? null,
    ahead: s.ahead,
    behind: s.behind,
    files,
    clean: files.length === 0,
  }
}

export async function stageFile(cwd: string, file: string): Promise<void> {
  await git(cwd).add([file])
}

export async function stageAll(cwd: string): Promise<void> {
  await git(cwd).add(['-A'])
}

export async function unstageFile(cwd: string, file: string): Promise<void> {
  try {
    await git(cwd).raw(['restore', '--staged', '--', file])
  } catch {
    // Repo with no commits yet: fall back to plain reset.
    await git(cwd).raw(['reset', '--', file])
  }
}

export async function discardFile(cwd: string, file: string): Promise<void> {
  try {
    await git(cwd).raw(['restore', '--staged', '--worktree', '--', file])
  } catch {
    // Untracked (or no HEAD yet) — just remove the file.
    try {
      fs.rmSync(path.resolve(cwd, file), { force: true })
    } catch {
      /* ignore */
    }
  }
}

/** package.json scripts in the worktree, for one-click running. */
export function packageScripts(cwd: string): Array<{ name: string; command: string }> {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    return Object.entries(pkg.scripts ?? {}).map(([name, command]) => ({ name, command }))
  } catch {
    return []
  }
}

export interface RunnableGroup {
  source: string
  kind: 'npm' | 'make' | 'md'
  items: Array<{ label: string; command: string }>
}

const CMD_PREFIXES =
  /^(npm|npx|pnpm|yarn|bun|deno|node|make|git|docker|docker-compose|supabase|python3?|pip3?|cargo|go|rails|rake|bundle|flask|django|php|composer|kubectl|terraform|vercel|netlify|fly|wrangler|\.\/|sh |bash )/

/** Extract shell commands from fenced code blocks in markdown. */
function commandsFromMarkdown(md: string): string[] {
  const out: string[] = []
  const fence = /```([a-zA-Z]*)\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = fence.exec(md))) {
    const lang = m[1].toLowerCase()
    const shellish = ['', 'sh', 'bash', 'shell', 'zsh', 'console', 'shellsession'].includes(lang)
    if (!shellish) continue
    for (let line of m[2].split('\n')) {
      line = line.trim().replace(/^[$#]\s+/, '')
      if (!line || line.startsWith('#') || line.length > 200) continue
      // For unlabelled blocks, only keep lines that clearly look like commands.
      if (lang === '' && !CMD_PREFIXES.test(line)) continue
      out.push(line)
    }
  }
  return [...new Set(out)]
}

/** Everything runnable in the worktree: npm scripts, make targets, and shell
 * commands pulled from README/markdown files — grouped by source. */
export function detectRunnables(cwd: string): RunnableGroup[] {
  const groups: RunnableGroup[] = []

  const npm = packageScripts(cwd)
  if (npm.length) {
    groups.push({
      source: 'package.json',
      kind: 'npm',
      items: npm.map((s) => ({ label: s.name, command: `npm run ${s.name}` })),
    })
  }

  const make = makeTargets(cwd)
  if (make.length) {
    groups.push({
      source: 'Makefile',
      kind: 'make',
      items: make.map((t) => ({ label: t, command: `make ${t}` })),
    })
  }

  // Markdown: root *.md plus one level of docs/, capped.
  const mdFiles: string[] = []
  try {
    for (const e of fs.readdirSync(cwd, { withFileTypes: true })) {
      if (e.isFile() && /\.md$/i.test(e.name)) mdFiles.push(e.name)
      else if (e.isDirectory() && /^(docs?|documentation)$/i.test(e.name)) {
        try {
          for (const f of fs.readdirSync(path.join(cwd, e.name)))
            if (/\.md$/i.test(f)) mdFiles.push(path.join(e.name, f))
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  for (const rel of mdFiles.slice(0, 15)) {
    let txt: string
    try {
      txt = fs.readFileSync(path.join(cwd, rel), 'utf8')
    } catch {
      continue
    }
    const cmds = commandsFromMarkdown(txt)
    if (cmds.length) {
      groups.push({
        source: rel,
        kind: 'md',
        items: cmds.map((c) => ({ label: c, command: c })),
      })
    }
  }

  return groups
}

/** Makefile targets in the worktree (for `make <target>`). */
export function makeTargets(cwd: string): string[] {
  for (const file of ['Makefile', 'makefile', 'GNUmakefile']) {
    let txt: string
    try {
      txt = fs.readFileSync(path.join(cwd, file), 'utf8')
    } catch {
      continue
    }
    const targets: string[] = []
    for (const line of txt.split('\n')) {
      // A target line: name: ... at column 0, not a variable assignment.
      const m = /^([a-zA-Z0-9][a-zA-Z0-9_.\-/]*)\s*:(?!=)/.exec(line)
      if (m && m[1] !== '.PHONY' && !m[1].includes('/')) targets.push(m[1])
    }
    return [...new Set(targets)]
  }
  return []
}

export async function commit(cwd: string, message: string): Promise<void> {
  const msg = message.trim()
  if (!msg) throw new Error('Commit message is required')
  await git(cwd).commit(msg)
}

export async function push(cwd: string): Promise<string> {
  const s = await git(cwd).status()
  if (!s.tracking) {
    const r = await git(cwd).raw(['push', '-u', 'origin', s.current ?? 'HEAD'])
    return r
  }
  return git(cwd).raw(['push'])
}

export async function pull(cwd: string): Promise<string> {
  return git(cwd).raw(['pull'])
}

// ---------------------------------------------------------------------------
// Diff + file/directory inspection
// ---------------------------------------------------------------------------

export async function diffFile(cwd: string, file: string, staged: boolean): Promise<string> {
  const g = git(cwd)
  if (staged) return g.diff(['--cached', '--', file])

  const out = await g.raw(['diff', '--', file])
  if (out.trim()) return out

  // Untracked (or otherwise no tracked diff): synthesize an all-additions diff
  // straight from the file so the viewer always shows something useful.
  try {
    const abs = path.resolve(cwd, file)
    const raw = fs.readFileSync(abs, 'utf8')
    const lines = raw.split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    const header = `diff --git a/${file} b/${file}\nnew file\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n`
    return header + lines.map((l) => `+${l}`).join('\n')
  } catch {
    return out
  }
}

const MAX_FILE_BYTES = 2 * 1024 * 1024

export function readFile(cwd: string, relPath: string): { content: string; truncated: boolean } {
  const abs = path.resolve(cwd, relPath)
  if (!abs.startsWith(path.resolve(cwd))) throw new Error('Path escapes worktree')
  const stat = fs.statSync(abs)
  if (stat.size > MAX_FILE_BYTES) {
    const fd = fs.openSync(abs, 'r')
    const buf = Buffer.alloc(MAX_FILE_BYTES)
    fs.readSync(fd, buf, 0, MAX_FILE_BYTES, 0)
    fs.closeSync(fd)
    return { content: buf.toString('utf8'), truncated: true }
  }
  return { content: fs.readFileSync(abs, 'utf8'), truncated: false }
}

export async function log(cwd: string): Promise<Commit[]> {
  // Use a unit separator so subjects with any punctuation parse cleanly.
  const fmt = '%H%x1f%h%x1f%s%x1f%an%x1f%cr'
  const out = await git(cwd).raw(['log', '-n', '50', `--pretty=format:${fmt}`])
  if (!out.trim()) return []
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, subject, author, relative] = line.split('\x1f')
      return { hash, shortHash, subject, author, relative }
    })
}

export function listDir(cwd: string, relPath: string): DirEntry[] {
  const abs = path.resolve(cwd, relPath || '.')
  if (!abs.startsWith(path.resolve(cwd))) throw new Error('Path escapes worktree')
  const entries = fs.readdirSync(abs, { withFileTypes: true })
  return entries
    .filter((e) => e.name !== '.git')
    .map((e) => ({
      name: e.name,
      type: e.isDirectory() ? ('dir' as const) : ('file' as const),
      path: path.join(relPath || '', e.name),
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}
