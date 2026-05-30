import { useApp } from '../store'
import { Icon } from './Icon'
import { DiffView } from './DiffView'
import { FileView } from './FileView'
import type { FileChange } from '../../shared/types'

const STATUS_LABEL: Record<FileChange['status'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  conflicted: '!',
}

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
  const { inspector, backToList, openFile } = useApp()
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
          onClick={() => openFile(inspector.file)}
          title="Open the full file and see where it lives"
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

function FilePanel() {
  const { inspector, backToList } = useApp()
  if (inspector.kind !== 'file') return null
  return (
    <div className="sc-panel">
      <div className="panel-head">
        <button className="icon-btn" onClick={backToList} title="Back to changes">
          <Icon name="back" size={16} />
        </button>
        <span className="ellipsis panel-title">{inspector.file}</span>
      </div>
      <div className="panel-scroll">
        <FileView
          file={inspector.file}
          content={inspector.content}
          truncated={inspector.truncated}
          dir={inspector.dir}
          entries={inspector.entries}
        />
      </div>
    </div>
  )
}

export function SourceControl() {
  const { scOpen, toggleSourceControl, activeTab, statusByCwd, inspector, sync, syncing } = useApp()
  if (!scOpen) return null
  const tab = activeTab()
  const status = tab ? statusByCwd[tab.cwd] : undefined

  return (
    <aside className="sc-drawer">
      <header className="sc-head">
        <div className="sc-title">
          <Icon name="commit" size={16} />
          <span>Source Control</span>
        </div>
        <button className="icon-btn" onClick={toggleSourceControl} title="Close">
          <Icon name="close" size={16} />
        </button>
      </header>

      {tab ? (
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
          {inspector.kind === 'list' && <ChangesList />}
          {inspector.kind === 'diff' && <DiffPanel />}
          {inspector.kind === 'file' && <FilePanel />}
        </>
      ) : (
        <div className="sc-empty">
          <p>No active terminal</p>
          <span className="dim">Open a branch to see its changes.</span>
        </div>
      )}
    </aside>
  )
}
