import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { DirEntry, CodeDiffSource } from '../../shared/types'
import { applyConfigStyle } from '../themes'
import { Icon } from './Icon'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { css as cssLang } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { rust } from '@codemirror/lang-rust'
import { cpp } from '@codemirror/lang-cpp'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { go } from '@codemirror/lang-go'

// File extension → CodeMirror language extension.
function languageFor(file: string) {
  const m = /\.([^./]+)$/.exec(file)
  const ext = (m?.[1] ?? '').toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return javascript({ jsx: ext === 'tsx', typescript: true })
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return javascript({ jsx: ext === 'jsx' })
    case 'json':
      return json()
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return cssLang()
    case 'html':
    case 'htm':
    case 'svelte':
    case 'vue':
      return html()
    case 'py':
      return python()
    case 'md':
    case 'mdx':
    case 'markdown':
      return markdown()
    case 'rs':
      return rust()
    case 'c':
    case 'cc':
    case 'cpp':
    case 'cxx':
    case 'h':
    case 'hpp':
      return cpp()
    case 'sql':
      return sql()
    case 'xml':
    case 'svg':
      return xml()
    case 'yaml':
    case 'yml':
      return yaml()
    case 'go':
      return go()
    default:
      return null
  }
}

function dirOf(p: string): string {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '' : p.slice(0, i)
}

/** Split a multi-file unified diff into per-path chunks. */
function splitDiff(diff: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of diff.split(/(?=^diff --git )/m)) {
    if (!part.startsWith('diff --git')) continue
    const m = /^diff --git a\/.+ b\/(.+)$/m.exec(part)
    if (m) out[m[1].trim()] = part
  }
  return out
}

interface ChangeMap {
  added: Set<number> // new-file line numbers that are additions
  delBefore: Set<number> // new-file line numbers preceded by a pure deletion
  delAtEnd: boolean // lines deleted past the end of the file
}
const EMPTY_CHANGE: ChangeMap = { added: new Set(), delBefore: new Set(), delAtEnd: false }

/**
 * Walk a single-file unified diff, mapping change info onto the *new* file's
 * line numbers. Deletions immediately followed by additions are replacements —
 * the green add already signals the change, so no separate deletion wedge.
 */
function computeChangeMap(diff: string): ChangeMap {
  const added = new Set<number>()
  const delBefore = new Set<number>()
  let delAtEnd = false
  let newNo = 0
  let inHunk = false
  let delRun = 0
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      if (delRun > 0) delBefore.add(newNo)
      delRun = 0
      const m = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      newNo = m ? parseInt(m[1], 10) : newNo
      inHunk = true
      continue
    }
    if (!inHunk) continue
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) {
      added.add(newNo++)
      delRun = 0 // del-then-add = replacement; the add covers it
    } else if (line.startsWith('-')) {
      delRun++
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file" — ignore
    } else {
      if (delRun > 0) delBefore.add(newNo)
      delRun = 0
      newNo++
    }
  }
  if (delRun > 0) delAtEnd = true
  return { added, delBefore, delAtEnd }
}

/**
 * Standalone code-viewer window: a resizable, collapsible file tree on the left
 * and a roomy, syntax-highlighted code pane on the right. When opened with a
 * diff source, the gutter overlays +/- change markers for each file.
 */
export function CodeViewer({
  cwd,
  initialFile,
  initialSource,
}: {
  cwd: string
  initialFile: string
  initialSource?: CodeDiffSource
}) {
  const [dir, setDir] = useState('')
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [file, setFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [showHidden, setShowHidden] = useState(true)
  const [lineNumbers, setLineNumbers] = useState(true)
  const [saving, setSaving] = useState(false)
  const [treeWidth, setTreeWidth] = useState(280)
  const [treeOpen, setTreeOpen] = useState(true)
  const [change, setChange] = useState<ChangeMap>(EMPTY_CHANGE)
  const dragging = useRef(false)
  const sourceRef = useRef<CodeDiffSource | undefined>(initialSource)
  // Mirror dirty state in a ref so the save handler / file-switch confirm see
  // the latest value without re-creating the keymap on every keystroke.
  const useRefDirty = useRef(false)
  // Per-file diff cache for PR/commit sources (fetched once as one blob).
  const diffMapRef = useRef<Promise<Record<string, string>> | null>(null)

  // Resolve the unified diff for one file from the active source, or '' if none.
  const diffForFile = useCallback(
    async (relPath: string): Promise<string> => {
      const src = sourceRef.current
      if (!src) return ''
      if (src.diff === 'worktree') {
        return window.bonsai.git.diffFile(cwd, relPath, src.staged)
      }
      if (!diffMapRef.current) {
        diffMapRef.current = (
          src.diff === 'commit'
            ? window.bonsai.pr.commitDiff(cwd, src.ref).then((d) => d.diff)
            : window.bonsai.pr.diff(cwd, Number(src.ref))
        )
          .then(splitDiff)
          .catch(() => ({}))
      }
      return (await diffMapRef.current)[relPath] ?? ''
    },
    [cwd],
  )

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
      // Guard against losing in-progress edits when switching files.
      const dirty = useRefDirty.current
      if (dirty && !confirm('You have unsaved changes. Discard them?')) return
      const { content: c, truncated: t } = await window.bonsai.git.readFile(cwd, relPath)
      setFile(relPath)
      setContent(c)
      setSavedContent(c)
      setTruncated(t)
      setChange(EMPTY_CHANGE)
      void browse(dirOf(relPath))
      if (sourceRef.current) {
        try {
          setChange(computeChangeMap(await diffForFile(relPath)))
        } catch {
          setChange(EMPTY_CHANGE)
        }
      }
    },
    [cwd, browse, diffForFile],
  )

  useEffect(() => {
    void window.bonsai.config.get().then((c) => {
      applyConfigStyle(c)
      setShowHidden(c.modes.showHiddenFiles !== false)
      setLineNumbers(c.codeLineNumbers !== false)
    })
  }, [])

  // Compute + persist dirty state.
  const dirty = content !== savedContent
  useEffect(() => {
    useRefDirty.current = dirty
  }, [dirty])

  const save = useCallback(async () => {
    if (!file || !dirty || saving) return
    setSaving(true)
    try {
      await window.bonsai.git.writeFile(cwd, file, content)
      setSavedContent(content)
    } catch (err) {
      alert(`Save failed:\n${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }, [cwd, file, content, dirty, saving])

  // ⌘S / Ctrl+S anywhere in the window saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  // Warn before the user closes the window with unsaved edits.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (useRefDirty.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  // CodeMirror keymap: ⌘S inside the editor itself also saves (higher-prec so
  // it wins over default keymaps that some browsers attach to Cmd+S).
  const cmKeymap = useMemo(
    () =>
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              void save()
              return true
            },
          },
        ]),
      ),
    [save],
  )

  const cmLang = useMemo(() => (file ? languageFor(file) : null), [file])
  const cmExtensions = useMemo(() => {
    const ext = [cmKeymap, EditorView.lineWrapping]
    if (cmLang) ext.push(cmLang)
    return ext
  }, [cmKeymap, cmLang])

  useEffect(() => {
    if (initialFile) void open(initialFile)
    else void browse('')
    const off = window.bonsai.window.onNavigate(({ file: f, source }) => {
      // A re-opened window may switch diff sources; reset the per-file cache.
      sourceRef.current = source
      diffMapRef.current = null
      if (f) void open(f)
      else void browse('')
    })
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
              <span className="cv-file-name">
                {file}
                {dirty && <span className="cv-dot" title="Unsaved changes">●</span>}
              </span>
              {change.added.size > 0 && <span className="cv-change-add">+{change.added.size}</span>}
              {truncated && <span className="cv-trunc">truncated</span>}
              <button
                className="btn sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => void save()}
                disabled={!dirty || saving}
                title="Save (⌘S)"
              >
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </button>
            </header>
            <div className="cv-code">
              <CodeMirror
                className="cv-cm"
                value={content}
                height="100%"
                theme="dark"
                basicSetup={{
                  lineNumbers,
                  foldGutter: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  highlightSelectionMatches: true,
                  searchKeymap: true,
                  closeBrackets: true,
                  autocompletion: false,
                  bracketMatching: true,
                  indentOnInput: true,
                }}
                extensions={cmExtensions}
                onChange={(v) => setContent(v)}
              />
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
