import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type {
  PullRequest,
  PullRequestDetail,
  PrStatus,
  PrCheck,
  PrComment,
  GhAccount,
} from '../shared/types'

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

interface RollupCheckRun {
  __typename: 'CheckRun'
  name: string
  status: string
  conclusion: string
  detailsUrl: string
  workflowName?: string
}
interface RollupStatusContext {
  __typename: 'StatusContext'
  context: string
  state: string
  targetUrl: string
}
type RollupItem = RollupCheckRun | RollupStatusContext

function normalizeCheck(item: RollupItem): PrCheck {
  if (item.__typename === 'CheckRun') {
    let bucket: PrCheck['bucket'] = 'pending'
    if (item.status !== 'COMPLETED') bucket = 'pending'
    else if (item.conclusion === 'SUCCESS') bucket = 'pass'
    else if (item.conclusion === 'SKIPPED') bucket = 'skip'
    else if (item.conclusion === 'CANCELLED') bucket = 'cancel'
    else bucket = 'fail'
    return { name: item.name, bucket, link: item.detailsUrl, workflow: item.workflowName }
  }
  const s = item.state
  const bucket: PrCheck['bucket'] =
    s === 'SUCCESS' ? 'pass' : s === 'PENDING' ? 'pending' : s === 'EXPECTED' ? 'pending' : 'fail'
  return { name: item.context, bucket, link: item.targetUrl }
}

export async function prView(cwd: string, num: number): Promise<PullRequestDetail> {
  const out = await gh(cwd, [
    'pr',
    'view',
    String(num),
    '--json',
    'number,title,body,state,url,headRefName,baseRefName,isDraft,author,additions,deletions,commits,statusCheckRollup',
  ])
  const p = JSON.parse(out) as PullRequestDetail & {
    author: { login: string }
    commits: unknown[]
    statusCheckRollup?: RollupItem[]
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
    checks: Array.isArray(p.statusCheckRollup) ? p.statusCheckRollup.map(normalizeCheck) : [],
  }
}

export async function prComments(cwd: string, num: number): Promise<PrComment[]> {
  const out = await gh(cwd, ['pr', 'view', String(num), '--json', 'comments,reviews'])
  const data = JSON.parse(out) as {
    comments?: Array<{ author: { login: string }; body: string; createdAt: string }>
    reviews?: Array<{ author: { login: string }; body: string; state: string; submittedAt: string }>
  }
  const comments: PrComment[] = (data.comments ?? []).map((c) => ({
    author: c.author?.login ?? '',
    body: c.body,
    createdAt: c.createdAt,
    kind: 'comment' as const,
  }))
  const reviews: PrComment[] = (data.reviews ?? [])
    .filter((r) => r.body || r.state !== 'COMMENTED')
    .map((r) => ({
      author: r.author?.login ?? '',
      body: r.body,
      createdAt: r.submittedAt,
      kind: 'review' as const,
      state: r.state,
    }))
  return [...comments, ...reviews].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function prComment(cwd: string, num: number, body: string): Promise<void> {
  await gh(cwd, ['pr', 'comment', String(num), '--body', body])
}

/** List the GitHub accounts `gh` knows about, marking the active one. */
export async function ghAccounts(): Promise<GhAccount[]> {
  if (!(await hasGh())) return []
  let text = ''
  try {
    const { stdout, stderr } = await exec('gh', ['auth', 'status'])
    text = stdout + '\n' + stderr
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string }
    text = (err.stdout ?? '') + '\n' + (err.stderr ?? '')
  }
  const accounts: GhAccount[] = []
  let last: GhAccount | null = null
  for (const line of text.split('\n')) {
    const m = /account (\S+)/i.exec(line)
    if (m) {
      last = { user: m[1], active: false }
      accounts.push(last)
    } else if (/active account:\s*true/i.test(line) && last) {
      last.active = true
    }
  }
  // De-dup while keeping active flags.
  const byUser = new Map<string, GhAccount>()
  for (const a of accounts) {
    const prev = byUser.get(a.user)
    if (prev) prev.active = prev.active || a.active
    else byUser.set(a.user, { ...a })
  }
  return [...byUser.values()]
}

export async function ghSwitch(user: string): Promise<void> {
  await exec('gh', ['auth', 'switch', '--hostname', 'github.com', '--user', user])
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
