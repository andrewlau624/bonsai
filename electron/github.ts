import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { PullRequest, PullRequestDetail, PrStatus } from '../shared/types'

const exec = promisify(execFile)

// PR operations shell out to the GitHub CLI (`gh`), run inside the worktree so
// they target the right branch and remote. `gh` handles auth on its own.

async function gh(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec('gh', args, { cwd, maxBuffer: 10 * 1024 * 1024 })
  return stdout
}

let ghPresent: boolean | null = null
async function hasGh(): Promise<boolean> {
  if (ghPresent !== null) return ghPresent
  try {
    await exec('gh', ['--version'])
    ghPresent = true
  } catch {
    ghPresent = false
  }
  return ghPresent
}

export async function prList(cwd: string): Promise<PrStatus> {
  if (!(await hasGh())) {
    return { available: false, reason: 'GitHub CLI (gh) is not installed. Install it from cli.github.com.' }
  }
  try {
    const out = await gh(cwd, [
      'pr',
      'list',
      '--limit',
      '30',
      '--json',
      'number,title,state,url,headRefName,isDraft,author',
    ])
    const raw = JSON.parse(out) as Array<
      Omit<PullRequest, 'author'> & { author: { login: string } }
    >
    return {
      available: true,
      prs: raw.map((p) => ({ ...p, author: p.author?.login ?? '' })),
    }
  } catch (e) {
    return { available: false, reason: cleanGhError(e) }
  }
}

export async function prView(cwd: string, num: number): Promise<PullRequestDetail> {
  const out = await gh(cwd, [
    'pr',
    'view',
    String(num),
    '--json',
    'number,title,body,state,url,headRefName,baseRefName,isDraft,author,additions,deletions,commits',
  ])
  const p = JSON.parse(out) as PullRequestDetail & {
    author: { login: string }
    commits: unknown[]
  }
  return {
    number: p.number,
    title: p.title,
    body: p.body ?? '',
    state: p.state,
    url: p.url,
    headRefName: p.headRefName,
    baseRefName: p.baseRefName,
    isDraft: p.isDraft,
    author: (p.author as unknown as { login: string })?.login ?? '',
    additions: p.additions ?? 0,
    deletions: p.deletions ?? 0,
    commits: Array.isArray(p.commits) ? p.commits.length : (p.commits as unknown as number) ?? 0,
  }
}

export async function prCreate(
  cwd: string,
  data: { title: string; body: string; base?: string; draft?: boolean },
): Promise<{ url: string }> {
  // gh pr create needs the branch pushed; push (with upstream) first, ignoring
  // "everything up-to-date" style failures.
  try {
    const { stdout: branch } = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd })
    await exec('git', ['push', '-u', 'origin', branch.trim()], { cwd })
  } catch {
    /* may already be pushed, or push fails — let gh surface the real problem */
  }
  const args = ['pr', 'create', '--title', data.title, '--body', data.body || '']
  if (data.base) args.push('--base', data.base)
  if (data.draft) args.push('--draft')
  const out = await gh(cwd, args)
  const url = out.trim().split('\n').find((l) => l.startsWith('http')) ?? out.trim()
  return { url }
}

export async function prEdit(
  cwd: string,
  num: number,
  data: { title: string; body: string },
): Promise<void> {
  await gh(cwd, ['pr', 'edit', String(num), '--title', data.title, '--body', data.body || ''])
}

function cleanGhError(e: unknown): string {
  const err = e as { stderr?: string; message?: string }
  const text = (err.stderr || err.message || 'gh command failed').trim()
  if (/no pull requests|no open pull requests/i.test(text)) return ''
  if (/not a git repository|no git remotes|could not determine/i.test(text))
    return 'This worktree has no GitHub remote.'
  if (/authentication|gh auth login|HTTP 401/i.test(text))
    return 'GitHub CLI is not authenticated. Run `gh auth login`.'
  return text.split('\n').slice(0, 3).join('\n')
}
