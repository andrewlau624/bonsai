import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Markdown } from './Markdown'
import type { PullRequestDetail, PrComment, PrCheck } from '../../shared/types'

type ReviewEvent = 'approve' | 'request-changes' | 'comment'

const CHECK_ICON: Record<PrCheck['bucket'], { name: Parameters<typeof Icon>[0]['name']; cls: string }> = {
  pass: { name: 'check', cls: 'pass' },
  fail: { name: 'close', cls: 'fail' },
  pending: { name: 'history', cls: 'pending' },
  skip: { name: 'dot', cls: 'skip' },
  cancel: { name: 'close', cls: 'skip' },
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
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(detail.title)
  const [body, setBody] = useState(detail.body)
  const [composer, setComposer] = useState('')

  if (editing) {
    return (
      <div className="pr-form">
        <div className="pr-form-head">Edit PR #{detail.number}</div>
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
          #{detail.number} {detail.title}
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

      <div className="panel-scroll pr-detail">
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
      </div>
    </div>
  )
}
