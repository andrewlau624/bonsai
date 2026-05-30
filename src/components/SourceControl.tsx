import { useState } from 'react'
import { useApp, type DrawerPanel } from '../store'
import { Icon } from './Icon'
import { DiffView } from './DiffView'
import type { FileChange, PullRequest } from '../../shared/types'

const STATUS_LABEL: Record<FileChange['status'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  conflicted: '!',
}

/* ----------------------------- Changes ----------------------------- */

function FileRow({ file, staged }: { file: FileChange; staged: boolean }) {
  const { stage, unstage, openDiff } = useApp()
  return (
    <div className="sc-file" onClick={() => openDiff(file.path, staged)}>
      <span className={`sc-status ${file.status}`}>{STATUS_LABEL[file.status]}</span>
      <span className="ellipsis sc-path">{file.path}</span>
      {(file.insertions || file.deletions) && (
        <span className="sc-stat">
          {file.insertions ? <span className="add">+{file.insertions}</span> : null}
          {file.deletions ? <span className="del">−{file.deletions}</span> : null}
        </span>
      )}
      <button
        className="icon-btn sc-toggle"
        title={staged ? 'Unstage' : 'Stage'}
        onClick={(e) => {
          e.stopPropagation()
          staged ? unstage(file.path) : stage(file.path)
        }}
      >
        <Icon name={staged ? 'close' : 'plus'} size={13} />
      </button>
    </div>
  )
}

function ChangesList() {
  const { activeTab, statusByCwd, commitMessage, setCommitMessage, commit, stageAll, syncing } =
    useApp()
  const tab = activeTab()
  const status = tab ? statusByCwd[tab.cwd] : undefined

  if (!status) return <div className="sc-empty">Loading…</div>
  if (status.clean)
    return (
      <div className="sc-empty">
        <Icon name="check" size={26} className="sc-clean-icon" />
        <p>No changes</p>
        <span className="dim">Your working tree is clean.</span>
      </div>
    )

  const staged = status.files.filter((f) => f.staged)
  const unstaged = status.files.filter((f) => f.unstaged || (!f.staged && !f.unstaged))

  return (
    <div className="sc-list">
      <div className="commit-box">
        <textarea
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') commit()
          }}
        />
        <button
          className="btn primary commit-btn"
          disabled={!commitMessage.trim() || !!syncing}
          onClick={commit}
          title="Commit (⌘↵). Stages everything if nothing is staged."
        >
          <Icon name="commit" size={14} />
          {syncing === 'Committing' ? 'Committing…' : 'Commit'}
        </button>
      </div>

      {staged.length > 0 && (
        <section className="sc-section">
          <div className="sc-section-head">
            <span>Staged ({staged.length})</span>
          </div>
          {staged.map((f) => (
            <FileRow key={`s-${f.path}`} file={f} staged />
          ))}
        </section>
      )}

      <section className="sc-section">
        <div className="sc-section-head">
          <span>Changes ({unstaged.length})</span>
          {unstaged.length > 0 && (
            <button className="text-btn" onClick={stageAll}>
              Stage all
            </button>
          )}
        </div>
        {unstaged.map((f) => (
          <FileRow key={`u-${f.path}`} file={f} staged={false} />
        ))}
      </section>
    </div>
  )
}

function DiffPanel() {
  const { inspector, backToList, openCode } = useApp()
  if (inspector.kind !== 'diff') return null
  return (
    <div className="sc-panel">
      <div className="panel-head">
        <button className="icon-btn" onClick={backToList} title="Back to changes">
          <Icon name="back" size={16} />
        </button>
        <span className="ellipsis panel-title">{inspector.file}</span>
        <button
          className="btn ghost sm"
          onClick={() => openCode(inspector.file)}
          title="Open the full file in a separate window"
        >
          <Icon name="file" size={13} /> Full file
        </button>
      </div>
      <div className="panel-scroll">
        <DiffView diff={inspector.diff} />
      </div>
    </div>
  )
}

/* ------------------------------ Files ------------------------------ */

function FilesPanel() {
  const { filesDir, filesEntries, browseFiles, openCode, mode } = useApp()
  const showHidden = mode('showHiddenFiles')
  const visible = showHidden ? filesEntries : filesEntries.filter((e) => !e.name.startsWith('.'))
  const crumbs = filesDir ? filesDir.split('/') : []
  return (
    <div className="sc-files">
      <div className="files-bar">
        <div className="dir-path">
          <button className="crumb-btn" onClick={() => browseFiles('')}>
            <Icon name="folder" size={13} /> root
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="crumb-seg">
              <span className="slash">/</span>
              <button className="crumb-btn" onClick={() => browseFiles(crumbs.slice(0, i + 1).join('/'))}>
                {c}
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="files-list">
        {filesDir && (
          <button className="sc-file" onClick={() => browseFiles(filesDir.split('/').slice(0, -1).join('/'))}>
            <Icon name="folder" size={14} className="i-branch" />
            <span className="sc-path">..</span>
          </button>
        )}
        {visible.map((e) => (
          <button
            key={e.path}
            className="sc-file"
            onClick={() => (e.type === 'dir' ? browseFiles(e.path) : openCode(e.path))}
          >
            <Icon name={e.type === 'dir' ? 'folder' : 'file'} size={14} className={e.type === 'dir' ? 'i-branch' : 'i-term'} />
            <span className="ellipsis sc-path">{e.name}</span>
          </button>
        ))}
      </div>
      <div className="files-hint">Files open in a separate window.</div>
    </div>
  )
}

/* --------------------------- Pull requests --------------------------- */

function PrCreateForm({ onDone }: { onDone: () => void }) {
  const { createPr, activeTab, prBusy } = useApp()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [draft, setDraft] = useState(false)
  const branch = activeTab()?.branch
  return (
    <div className="pr-form">
      <div className="pr-form-head">New pull request from {branch}</div>
      <input className="pr-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        className="pr-textarea"
        placeholder="Description"
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <label className="pr-draft">
        <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} /> Draft
      </label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onDone}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!title.trim() || prBusy}
          onClick={async () => {
            const url = await createPr({ title: title.trim(), body, draft })
            if (url) onDone()
          }}
        >
          {prBusy ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  )
}

function PrEditForm({ pr, onDone }: { pr: { number: number; title: string; body: string }; onDone: () => void }) {
  const { editPr, prBusy } = useApp()
  const [title, setTitle] = useState(pr.title)
  const [body, setBody] = useState(pr.body)
  return (
    <div className="pr-form">
      <div className="pr-form-head">Edit PR #{pr.number}</div>
      <input className="pr-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="pr-textarea" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="modal-actions">
        <button className="btn ghost" onClick={onDone}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!title.trim() || prBusy}
          onClick={async () => {
            await editPr(pr.number, { title: title.trim(), body })
            onDone()
          }}
        >
          {prBusy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function PrDetail() {
  const { prDetail, closePrDetail } = useApp()
  const [editing, setEditing] = useState(false)
  if (!prDetail) return null
  if (editing) return <PrEditForm pr={prDetail} onDone={() => setEditing(false)} />
  return (
    <div className="sc-panel">
      <div className="panel-head">
        <button className="icon-btn" onClick={closePrDetail} title="Back to PR list">
          <Icon name="back" size={16} />
        </button>
        <span className="ellipsis panel-title">
          #{prDetail.number} {prDetail.title}
        </span>
        <button className="btn ghost sm" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
      <div className="panel-scroll pr-detail">
        <div className="pr-meta">
          <span className={`pr-state ${prDetail.state.toLowerCase()}`}>
            {prDetail.isDraft ? 'Draft' : prDetail.state}
          </span>
          <span className="pr-refs">
            {prDetail.baseRefName} ← {prDetail.headRefName}
          </span>
        </div>
        <div className="pr-stats">
          <span className="add">+{prDetail.additions}</span>
          <span className="del">−{prDetail.deletions}</span>
          <span className="dim">{prDetail.commits} commits</span>
          <span className="dim">by {prDetail.author}</span>
        </div>
        <pre className="pr-body">{prDetail.body || 'No description.'}</pre>
        <button className="btn ghost sm" onClick={() => window.bonsai.openExternal(prDetail.url)}>
          Open on GitHub
        </button>
      </div>
    </div>
  )
}

function PrList() {
  const { prStatus, prBusy, viewPr, loadPrs } = useApp()
  const [creating, setCreating] = useState(false)

  if (creating) return <PrCreateForm onDone={() => setCreating(false)} />
  if (prBusy && !prStatus) return <div className="sc-empty">Loading pull requests…</div>

  if (prStatus && !prStatus.available) {
    return (
      <div className="sc-empty">
        <Icon name="commit" size={24} className="dim" />
        <p>Pull requests unavailable</p>
        <span className="dim">{prStatus.reason || 'Could not load pull requests.'}</span>
        <button className="btn ghost sm" onClick={() => setCreating(true)} style={{ marginTop: 10 }}>
          Try creating one
        </button>
      </div>
    )
  }

  const prs: PullRequest[] = prStatus?.available ? prStatus.prs : []
  return (
    <div className="sc-list">
      <div className="pr-toolbar">
        <button className="btn primary sm" onClick={() => setCreating(true)}>
          <Icon name="plus" size={13} /> New PR
        </button>
        <button className="icon-btn" title="Refresh" onClick={loadPrs}>
          <Icon name="fetch" size={14} />
        </button>
      </div>
      {prs.length === 0 ? (
        <div className="sc-empty">
          <p>No open pull requests</p>
          <span className="dim">Create one from the current branch.</span>
        </div>
      ) : (
        prs.map((pr) => (
          <button key={pr.number} className="pr-row" onClick={() => viewPr(pr.number)}>
            <span className="pr-num">#{pr.number}</span>
            <span className="ellipsis pr-title">{pr.title}</span>
            {pr.isDraft && <span className="badge wt">draft</span>}
            <span className="pr-branch ellipsis">{pr.headRefName}</span>
          </button>
        ))
      )}
    </div>
  )
}

function PrPanel() {
  const { prDetail } = useApp()
  return prDetail ? <PrDetail /> : <PrList />
}

/* ------------------------------ Drawer ------------------------------ */

const SEGMENTS: { id: DrawerPanel; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'changes', label: 'Changes', icon: 'diff' },
  { id: 'files', label: 'Files', icon: 'folder' },
  { id: 'prs', label: 'PRs', icon: 'commit' },
]

export function SourceControl() {
  const { scOpen, toggleSourceControl, activeTab, statusByCwd, inspector, sync, syncing, panel, setPanel } =
    useApp()
  if (!scOpen) return null
  const tab = activeTab()
  const status = tab ? statusByCwd[tab.cwd] : undefined

  return (
    <aside className="sc-drawer">
      <header className="sc-head">
        <div className="sc-segmented">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              className={panel === s.id ? 'active' : ''}
              onClick={() => setPanel(s.id)}
            >
              <Icon name={s.icon} size={13} /> {s.label}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={toggleSourceControl} title="Close">
          <Icon name="close" size={16} />
        </button>
      </header>

      {!tab ? (
        <div className="sc-empty">
          <p>No active terminal</p>
          <span className="dim">Open a branch to work with it.</span>
        </div>
      ) : (
        <>
          {panel === 'changes' && (
            <>
              <div className="sc-sync">
                <span className="sc-branch">
                  <Icon name="branch" size={13} /> {status?.branch ?? tab.branch}
                </span>
                <div className="sc-sync-btns">
                  <button className="icon-btn" title="Fetch" disabled={!!syncing} onClick={() => sync('fetch')}>
                    <Icon name="fetch" size={15} />
                  </button>
                  <button className="icon-btn pill" title="Pull" disabled={!!syncing} onClick={() => sync('pull')}>
                    <Icon name="pull" size={15} />
                    {status && status.behind > 0 ? <span className="count">{status.behind}</span> : null}
                  </button>
                  <button className="icon-btn pill" title="Push" disabled={!!syncing} onClick={() => sync('push')}>
                    <Icon name="push" size={15} />
                    {status && status.ahead > 0 ? <span className="count">{status.ahead}</span> : null}
                  </button>
                </div>
              </div>
              {syncing && <div className="sc-syncing">{syncing}…</div>}
              {inspector.kind === 'diff' ? <DiffPanel /> : <ChangesList />}
            </>
          )}
          {panel === 'files' && <FilesPanel />}
          {panel === 'prs' && <PrPanel />}
        </>
      )}
    </aside>
  )
}
