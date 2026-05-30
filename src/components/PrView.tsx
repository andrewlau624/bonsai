import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { Markdown } from './Markdown'
import { DiffView } from './DiffView'
import type {
  PullRequestDetail,
  PrComment,
  PrCheck,
  PrCommit,
  PrCommitDetail,
  PrFile,
  PrReviewComment,
} from '../../shared/types'

type ReviewEvent = 'approve' | 'request-changes' | 'comment'
type Tab = 'conversation' | 'commits' | 'files'

const CHECK_ICON: Record<PrCheck['bucket'], { name: Parameters<typeof Icon>[0]['name']; cls: string }> = {
  pass: { name: 'check', cls: 'pass' },
  fail: { name: 'close', cls: 'fail' },
  pending: { name: 'history', cls: 'pending' },
  skip: { name: 'dot', cls: 'skip' },
  cancel: { name: 'close', cls: 'skip' },
}

/** Split a `gh pr diff` blob into per-file unified-diff chunks keyed by path. */
function splitDiff(diff: string): Record<string, string> {
  const out: Record<string, string> = {}
  const parts = diff.split(/(?=^diff --git )/m)
  for (const part of parts) {
    if (!part.startsWith('diff --git')) continue
    const m = /^diff --git a\/.+ b\/(.+)$/m.exec(part)
    if (m) out[m[1].trim()] = part
  }
  return out
}

function CheckLogModal({ cwd, check, onClose }: { cwd: string; check: PrCheck; onClose: () => void }) {
  const [log, setLog] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    void window.bonsai.pr.checkLog(cwd, check.link).then(setLog)
  }, [cwd, check.link])
  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal log-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <Icon name="sync" size={16} />
          <h3 className="ellipsis">{check.name}</h3>
          <button
            className="btn ghost sm"
            disabled={!log}
            onClick={() => {
              if (log) {
                void navigator.clipboard.writeText(log)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }
            }}
          >
            <Icon name="config" size={13} /> {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </header>
        <pre className="log-output">{log ?? 'Loading log…'}</pre>
      </div>
    </div>
  )
}

function Checks({ cwd, checks }: { cwd: string; checks: PrCheck[] }) {
  const [logCheck, setLogCheck] = useState<PrCheck | null>(null)
  if (checks.length === 0) return null
  const pass = checks.filter((c) => c.bucket === 'pass').length
  const fail = checks.filter((c) => c.bucket === 'fail').length
  const pending = checks.filter((c) => c.bucket === 'pending').length
  return (
    <div className="pr-checks">
      <div className="pr-checks-head">
        <Icon name="sync" size={13} /> Checks
        <span className="pr-checks-sum">
          {pass} passed{fail ? `, ${fail} failed` : ''}{pending ? `, ${pending} pending` : ''}
        </span>
      </div>
      {checks.map((c, i) => {
        const ic = CHECK_ICON[c.bucket]
        return (
          <div key={i} className="pr-check">
            <span className={`check-ic ${ic.cls}`}>
              <Icon name={ic.name} size={12} />
            </span>
            <span className="ellipsis check-name">{c.name}</span>
            {c.workflow && <span className="check-wf ellipsis">{c.workflow}</span>}
            {c.link && /\/(runs|job)\//.test(c.link) && (
              <button className="text-btn" onClick={() => setLogCheck(c)}>
                logs
              </button>
            )}
            {c.link && (
              <button className="icon-btn" title="Open check" onClick={() => window.bonsai.openExternal(c.link)}>
                <Icon name="external" size={12} />
              </button>
            )}
          </div>
        )
      })}
      {logCheck && <CheckLogModal cwd={cwd} check={logCheck} onClose={() => setLogCheck(null)} />}
    </div>
  )
}

function FilesTab({
  cwd,
  files,
  diffMap,
  reviewComments,
}: {
  cwd: string
  files: PrFile[] | null
  diffMap: Record<string, string> | null
  reviewComments: PrReviewComment[]
}) {
  const [open, setOpen] = useState<string | null>(null)
  if (!files) return <div className="sc-empty">Loading files…</div>
  if (files.length === 0) return <div className="sc-empty">No changed files.</div>
  return (
    <div className="pr-files">
      {files.map((f) => {
        const fileComments = reviewComments.filter((c) => c.path === f.path)
        const isOpen = open === f.path
        return (
          <div key={f.path} className="pr-file">
            <button className="pr-file-head" onClick={() => setOpen(isOpen ? null : f.path)}>
              <Icon name="chevron" size={12} className={`chevron ${isOpen ? 'open' : ''}`} />
              <span className="ellipsis pr-file-path">{f.path}</span>
              <span className="sc-stat">
                {f.additions ? <span className="add">+{f.additions}</span> : null}
                {f.deletions ? <span className="del">−{f.deletions}</span> : null}
              </span>
              {fileComments.length > 0 && <span className="pr-file-cc">{fileComments.length}💬</span>}
              <span
                className="icon-btn"
                title="Open in code window"
                onClick={(e) => {
                  e.stopPropagation()
                  void window.bonsai.window.openCode(cwd, f.path)
                }}
              >
                <Icon name="external" size={12} />
              </span>
            </button>
            {isOpen && (
              <div className="pr-file-body">
                {diffMap && diffMap[f.path] ? (
                  <DiffView diff={diffMap[f.path]} />
                ) : (
                  <div className="diff-empty">No inline diff available.</div>
                )}
                {fileComments.map((c, i) => (
                  <div className="pr-inline-comment" key={i}>
                    <div className="pr-card-author">
                      {c.author}
                      {c.line != null && <span className="dim">line {c.line}</span>}
                    </div>
                    {c.diffHunk && <pre className="pr-hunk">{c.diffHunk.split('\n').slice(-4).join('\n')}</pre>}
                    <Markdown>{c.body}</Markdown>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CommitDetail({ cwd, commit, onBack }: { cwd: string; commit: PrCommit; onBack: () => void }) {
  const [d, setD] = useState<PrCommitDetail | null>(null)
  useEffect(() => {
    void window.bonsai.pr
      .commitDiff(cwd, commit.hash)
      .then(setD)
      .catch(() => setD({ message: '', files: [], diff: '' }))
  }, [cwd, commit.hash])
  const diffMap = useMemo(() => (d ? splitDiff(d.diff) : {}), [d])
  return (
    <div className="commit-detail">
      <button className="text-btn commit-back" onClick={onBack}>
        <Icon name="back" size={13} /> All commits
      </button>
      <div className="commit-head">
        <span className="log-hash">{commit.shortHash}</span>
        <span className="dim">{commit.author}</span>
      </div>
      <pre className="commit-msg">{d?.message || commit.subject}</pre>
      {!d ? (
        <div className="sc-empty">Loading changes…</div>
      ) : (
        <FilesTab cwd={cwd} files={d.files} diffMap={diffMap} reviewComments={[]} />
      )}
    </div>
  )
}

export function PrView({
  cwd,
  detail,
  comments,
  busy,
  onBack,
  onSave,
  onComment,
  onReview,
  onOpenWindow,
}: {
  cwd: string
  detail: PullRequestDetail
  comments: PrComment[]
  busy: boolean
  onBack?: () => void
  onSave: (title: string, body: string) => void | Promise<void>
  onComment: (body: string) => void | Promise<void>
  onReview: (event: ReviewEvent, body: string) => void | Promise<void>
  onOpenWindow?: () => void
}) {
  const num = detail.number
  const [tab, setTab] = useState<Tab>('conversation')
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(detail.title)
  const [body, setBody] = useState(detail.body)
  const [composer, setComposer] = useState('')

  const [commits, setCommits] = useState<PrCommit[] | null>(null)
  const [openCommit, setOpenCommit] = useState<PrCommit | null>(null)
  const [files, setFiles] = useState<PrFile[] | null>(null)
  const [diffMap, setDiffMap] = useState<Record<string, string> | null>(null)
  const [reviewComments, setReviewComments] = useState<PrReviewComment[]>([])

  // Reset per-PR caches when the PR changes.
  useEffect(() => {
    setTab('conversation')
    setEditing(false)
    setCommits(null)
    setOpenCommit(null)
    setFiles(null)
    setDiffMap(null)
    setReviewComments([])
  }, [num])

  // Lazy-load tab data on demand.
  useEffect(() => {
    if (tab === 'commits' && commits === null) {
      void window.bonsai.pr.commits(cwd, num).then(setCommits).catch(() => setCommits([]))
    }
    if (tab === 'files' && files === null) {
      void window.bonsai.pr.files(cwd, num).then(setFiles).catch(() => setFiles([]))
      void window.bonsai.pr.diff(cwd, num).then((d) => setDiffMap(splitDiff(d))).catch(() => setDiffMap({}))
      void window.bonsai.pr.reviewComments(cwd, num).then(setReviewComments).catch(() => {})
    }
  }, [tab, cwd, num, commits, files])

  if (editing) {
    return (
      <div className="pr-form">
        <div className="pr-form-head">Edit PR #{num}</div>
        <input className="pr-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="pr-textarea" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!title.trim() || busy}
            onClick={async () => {
              await onSave(title.trim(), body)
              setEditing(false)
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pr-view">
      <div className="panel-head">
        {onBack && (
          <button className="icon-btn" onClick={onBack} title="Back">
            <Icon name="back" size={16} />
          </button>
        )}
        <span className="ellipsis panel-title">
          #{num} {detail.title}
        </span>
        {onOpenWindow && (
          <button className="icon-btn" title="Open in window" onClick={onOpenWindow}>
            <Icon name="external" size={15} />
          </button>
        )}
        <button className="btn ghost sm" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>

      <div className="pr-tabs">
        <button className={tab === 'conversation' ? 'active' : ''} onClick={() => setTab('conversation')}>
          Conversation
        </button>
        <button className={tab === 'commits' ? 'active' : ''} onClick={() => setTab('commits')}>
          Commits{commits ? ` (${commits.length})` : ''}
        </button>
        <button className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>
          Files{files ? ` (${files.length})` : ''}
        </button>
      </div>

      <div className="panel-scroll pr-detail">
        {tab === 'conversation' && (
          <>
            <div className="pr-meta">
              <span className={`pr-state ${detail.state.toLowerCase()}`}>
                {detail.isDraft ? 'Draft' : detail.state}
              </span>
              <span className="pr-refs">
                {detail.baseRefName} ← {detail.headRefName}
              </span>
            </div>
            <div className="pr-stats">
              <span className="add">+{detail.additions}</span>
              <span className="del">−{detail.deletions}</span>
              <span className="dim">{detail.commits} commits</span>
              <span className="dim">by {detail.author}</span>
            </div>

            <Checks cwd={cwd} checks={detail.checks} />

            <div className="thread">
              <div className="thread-item">
                <span className="thread-dot" />
                <div className="pr-card">
                  <div className="pr-card-author">{detail.author}</div>
                  {detail.body ? <Markdown>{detail.body}</Markdown> : <span className="dim">No description.</span>}
                </div>
              </div>
              {comments.map((c, i) => (
                <div className="thread-item" key={i}>
                  <span className={`thread-dot ${c.kind}`} />
                  <div className="pr-card">
                    <div className="pr-card-author">
                      {c.author}
                      {c.kind === 'review' && c.state && (
                        <span className={`review-state ${c.state.toLowerCase()}`}>
                          {c.state.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      )}
                    </div>
                    {c.body ? <Markdown>{c.body}</Markdown> : <span className="dim">(no comment)</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="pr-composer">
              <textarea
                className="pr-textarea"
                rows={3}
                placeholder="Leave a comment or review…"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
              />
              <div className="pr-composer-actions">
                <button
                  className="btn ghost sm"
                  disabled={busy || !composer.trim()}
                  onClick={async () => {
                    await onReview('request-changes', composer)
                    setComposer('')
                  }}
                >
                  Request changes
                </button>
                <button
                  className="btn ghost sm approve"
                  disabled={busy}
                  onClick={async () => {
                    await onReview('approve', composer)
                    setComposer('')
                  }}
                >
                  <Icon name="check" size={13} /> Approve
                </button>
                <button
                  className="btn primary sm"
                  disabled={busy || !composer.trim()}
                  onClick={async () => {
                    await onComment(composer)
                    setComposer('')
                  }}
                >
                  Comment
                </button>
              </div>
              <button className="text-btn pr-gh-link" onClick={() => window.bonsai.openExternal(detail.url)}>
                Open on GitHub — resolve threads & apply suggestions there →
              </button>
            </div>
          </>
        )}

        {tab === 'commits' &&
          (openCommit ? (
            <CommitDetail cwd={cwd} commit={openCommit} onBack={() => setOpenCommit(null)} />
          ) : commits === null ? (
            <div className="sc-empty">Loading commits…</div>
          ) : commits.length === 0 ? (
            <div className="sc-empty">No commits.</div>
          ) : (
            commits.map((c) => (
              <button className="log-row log-row-btn" key={c.hash} onClick={() => setOpenCommit(c)}>
                <span className="log-hash">{c.shortHash}</span>
                <div className="log-info">
                  <span className="log-subject ellipsis">{c.subject}</span>
                  <span className="log-meta">{c.author}</span>
                </div>
                <Icon name="chevron" size={13} className="log-chevron" />
              </button>
            ))
          ))}

        {tab === 'files' && (
          <FilesTab cwd={cwd} files={files} diffMap={diffMap} reviewComments={reviewComments} />
        )}
      </div>
    </div>
  )
}
