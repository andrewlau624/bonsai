import { useEffect, useState, useCallback } from 'react'
import type { DirEntry } from '../../shared/types'
import { applyTheme } from '../themes'
import { Icon } from './Icon'

function dirOf(p: string): string {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '' : p.slice(0, i)
}

/**
 * Standalone code-viewer window: a file tree on the left, a roomy code pane on
 * the right. Runs in its own BrowserWindow so it isn't cramped inside a drawer.
 */
export function CodeViewer({ cwd, initialFile }: { cwd: string; initialFile: string }) {
  const [dir, setDir] = useState('')
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [file, setFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [showHidden, setShowHidden] = useState(true)

  const browse = useCallback(
    async (relPath: string) => {
      const list = await window.bonsai.git.listDir(cwd, relPath)
      setDir(relPath)
      setEntries(list)
    },
    [cwd],
  )

  const open = useCallback(
    async (relPath: string) => {
      const { content: c, truncated: t } = await window.bonsai.git.readFile(cwd, relPath)
      setFile(relPath)
      setContent(c)
      setTruncated(t)
      void browse(dirOf(relPath))
    },
    [cwd, browse],
  )

  // Apply the saved theme/style so this window matches the main one.
  useEffect(() => {
    void window.bonsai.config.get().then((c) => {
      applyTheme(c.theme, {
        density: c.density,
        uiFont: c.uiFont,
        corners: c.corners,
        animations: c.animations,
      })
      setShowHidden(c.modes.showHiddenFiles !== false)
    })
  }, [])

  useEffect(() => {
    if (initialFile) void open(initialFile)
    else void browse('')
    const off = window.bonsai.window.onNavigate((f) => (f ? open(f) : browse('')))
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = showHidden ? entries : entries.filter((e) => !e.name.startsWith('.'))
  const crumbs = dir ? dir.split('/') : []
  const lines = content.split('\n')

  return (
    <div className="cv">
      <aside className="cv-tree">
        <div className="cv-tree-head">
          <Icon name="folder" size={14} /> Files
        </div>
        <div className="cv-path">
          <button className="crumb-btn" onClick={() => browse('')}>
            root
          </button>
          {crumbs.map((c, i) => (
            <span key={i}>
              <span className="slash">/</span>
              <button className="crumb-btn" onClick={() => browse(crumbs.slice(0, i + 1).join('/'))}>
                {c}
              </button>
            </span>
          ))}
        </div>
        <div className="cv-entries">
          {dir && (
            <button className="cv-entry" onClick={() => browse(dir.split('/').slice(0, -1).join('/'))}>
              <Icon name="folder" size={14} /> ..
            </button>
          )}
          {visible.map((e) => (
            <button
              key={e.path}
              className={`cv-entry ${e.path === file ? 'current' : ''}`}
              onClick={() => (e.type === 'dir' ? browse(e.path) : open(e.path))}
            >
              <Icon name={e.type === 'dir' ? 'folder' : 'file'} size={14} />
              <span className="ellipsis">{e.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="cv-main">
        {file ? (
          <>
            <header className="cv-file-head">
              <Icon name="file" size={14} />
              <span className="cv-file-name">{file}</span>
              {truncated && <span className="cv-trunc">truncated</span>}
            </header>
            <div className="cv-code">
              {lines.map((l, i) => (
                <div key={i} className="code-line">
                  <span className="ln">{i + 1}</span>
                  <span className="code">{l || ' '}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="cv-empty">
            <Icon name="file" size={34} />
            <p>Select a file to view its contents</p>
          </div>
        )}
      </main>
    </div>
  )
}
