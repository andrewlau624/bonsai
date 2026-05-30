import { useApp } from '../store'
import { Icon } from './Icon'
import type { DirEntry } from '../../shared/types'

/**
 * Full-file view with line numbers, plus a directory navigator showing exactly
 * where the file sits so you can see how it connects to its neighbours.
 */
export function FileView({
  file,
  content,
  truncated,
  dir,
  entries,
}: {
  file: string
  content: string
  truncated: boolean
  dir: string
  entries: DirEntry[]
}) {
  const { openFile, openDir } = useApp()
  const lines = content.split('\n')
  const crumbs = dir ? dir.split('/') : []

  return (
    <div className="fileview">
      <div className="dir-nav">
        <div className="dir-path">
          <button className="crumb-btn" onClick={() => openDir('')} title="Worktree root">
            <Icon name="folder" size={13} /> root
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="crumb-seg">
              <span className="slash">/</span>
              <button
                className="crumb-btn"
                onClick={() => openDir(crumbs.slice(0, i + 1).join('/'))}
              >
                {c}
              </button>
            </span>
          ))}
        </div>
        <div className="dir-entries">
          {dir && (
            <button
              className="dir-entry"
              onClick={() => openDir(dir.split('/').slice(0, -1).join('/'))}
            >
              <Icon name="folder" size={13} /> ..
            </button>
          )}
          {entries.map((e) => (
            <button
              key={e.path}
              className={`dir-entry ${e.path === file ? 'current' : ''}`}
              onClick={() => (e.type === 'dir' ? openDir(e.path) : openFile(e.path))}
            >
              <Icon name={e.type === 'dir' ? 'folder' : 'file'} size={13} />
              <span className="ellipsis">{e.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="file-body">
        {truncated && <div className="file-warn">File truncated — showing the first 2 MB.</div>}
        <div className="code-block">
          {lines.map((l, i) => (
            <div key={i} className="code-line">
              <span className="ln">{i + 1}</span>
              <span className="code">{l || ' '}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
