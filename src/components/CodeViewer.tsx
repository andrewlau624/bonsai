import { useEffect, useState, useCallback, useRef } from 'react'
import type { DirEntry } from '../../shared/types'
import { applyConfigStyle } from '../themes'
import { highlight } from '../highlight'
import { Icon } from './Icon'

function dirOf(p: string): string {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '' : p.slice(0, i)
}

/**
 * Standalone code-viewer window: a resizable, collapsible file tree on the left
 * and a roomy, syntax-highlighted code pane on the right.
 */
export function CodeViewer({ cwd, initialFile }: { cwd: string; initialFile: string }) {
  const [dir, setDir] = useState('')
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [file, setFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [html, setHtml] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [showHidden, setShowHidden] = useState(true)
  const [lineNumbers, setLineNumbers] = useState(true)
  const [syntax, setSyntax] = useState(true)
  const [treeWidth, setTreeWidth] = useState(280)
  const [treeOpen, setTreeOpen] = useState(true)
  const dragging = useRef(false)

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
      setHtml(null)
      void browse(dirOf(relPath))
      if (syntax) {
        const hl = await highlight(c, relPath)
        setHtml(hl)
      }
    },
    [cwd, browse, syntax],
  )

  useEffect(() => {
    void window.bonsai.config.get().then((c) => {
      applyConfigStyle(c)
      setShowHidden(c.modes.showHiddenFiles !== false)
      setLineNumbers(c.codeLineNumbers !== false)
      setSyntax(c.syntaxHighlight !== false)
    })
  }, [])

  useEffect(() => {
    if (initialFile) void open(initialFile)
    else void browse('')
    const off = window.bonsai.window.onNavigate((f) => (f ? open(f) : browse('')))
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drag-to-resize the tree.
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (dragging.current) setTreeWidth(Math.max(180, Math.min(560, e.clientX)))
    }
    const up = () => (dragging.current = false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  const visible = showHidden ? entries : entries.filter((e) => !e.name.startsWith('.'))
  const crumbs = dir ? dir.split('/') : []
  const lineCount = content ? content.split('\n').length : 0

  return (
    <div className="cv">
      <div className="win-drag" />
      {treeOpen && (
        <>
          <aside className="cv-tree" style={{ width: treeWidth }}>
            <div className="cv-tree-head">
              <Icon name="folder" size={14} />
              <span>Files</span>
              <button className="icon-btn" title="Hide file tree" onClick={() => setTreeOpen(false)}>
                <Icon name="back" size={14} />
              </button>
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
          <div className="cv-resizer" onMouseDown={() => (dragging.current = true)} />
        </>
      )}

      <main className="cv-main">
        {file ? (
          <>
            <header className="cv-file-head">
              {!treeOpen && (
                <button className="icon-btn" title="Show file tree" onClick={() => setTreeOpen(true)}>
                  <Icon name="folder" size={14} />
                </button>
              )}
              <Icon name="file" size={14} />
              <span className="cv-file-name">{file}</span>
              {truncated && <span className="cv-trunc">truncated</span>}
            </header>
            <div className="cv-code">
              {lineNumbers && (
                <div className="cv-gutter" aria-hidden>
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              )}
              {html != null ? (
                <pre className="cv-pre hljs">
                  <code dangerouslySetInnerHTML={{ __html: html }} />
                </pre>
              ) : (
                <pre className="cv-pre">
                  <code>{content}</code>
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="cv-empty">
            {!treeOpen && (
              <button className="btn ghost" onClick={() => setTreeOpen(true)}>
                Show files
              </button>
            )}
            <Icon name="file" size={34} />
            <p>Select a file to view its contents</p>
          </div>
        )}
      </main>
    </div>
  )
}
