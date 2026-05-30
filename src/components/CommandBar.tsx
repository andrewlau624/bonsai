import { useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'
import type { SavedCommand, RunnableGroup } from '../../shared/types'

const GROUP_ICON: Record<RunnableGroup['kind'], Parameters<typeof Icon>[0]['name']> = {
  npm: 'play',
  make: 'play',
  md: 'file',
}

function Editor({ repoId, list, onClose }: { repoId: string; list: SavedCommand[]; onClose: () => void }) {
  const { saveCommands } = useApp()
  const [items, setItems] = useState<SavedCommand[]>(list)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [action, setAction] = useState<'run' | 'paste'>('run')
  const [editingId, setEditingId] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setBody('')
    setAction('run')
    setEditingId(null)
  }
  const commit = () => {
    const commands = body.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim())
    if (!name.trim() || commands.length === 0) return
    const next = editingId
      ? items.map((it) => (it.id === editingId ? { ...it, name: name.trim(), commands, action } : it))
      : [...items, { id: `c${Date.now()}`, name: name.trim(), commands, action }]
    setItems(next)
    void saveCommands(repoId, next)
    reset()
  }
  const remove = (id: string) => {
    const next = items.filter((it) => it.id !== id)
    setItems(next)
    void saveCommands(repoId, next)
    if (editingId === id) reset()
  }
  const edit = (it: SavedCommand) => {
    setEditingId(it.id)
    setName(it.name)
    setBody(it.commands.join('\n'))
    setAction(it.action)
  }

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal cmd-editor" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <Icon name="terminal" size={18} />
          <h3>Saved commands</h3>
        </header>
        <p className="modal-sub">
          Bookmark a command, a sequence, or a reusable prompt. <strong>Run</strong> executes it in
          the active terminal; <strong>Paste</strong> drops it at the prompt to edit first.
        </p>
        <div className="cmd-list">
          {items.length === 0 && <div className="set-empty">No saved commands yet.</div>}
          {items.map((it) => (
            <div className="cmd-item" key={it.id}>
              <span className={`cmd-tag ${it.action}`}>{it.action}</span>
              <div className="cmd-item-info">
                <span className="cmd-item-name">{it.name}</span>
                <span className="cmd-item-cmds ellipsis">{it.commands.join(' ; ')}</span>
              </div>
              <button className="icon-btn" title="Edit" onClick={() => edit(it)}>
                <Icon name="diff" size={14} />
              </button>
              <button className="icon-btn danger-hover" title="Delete" onClick={() => remove(it.id)}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="cmd-form">
          <input
            className="modal-input"
            placeholder="Name (e.g. Dev server)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="pr-textarea"
            rows={3}
            placeholder={'One line per command, e.g.\nnpm install\nnpm run dev'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="cmd-form-row">
            <div className="segmented">
              <button className={action === 'run' ? 'active' : ''} onClick={() => setAction('run')}>
                Run
              </button>
              <button className={action === 'paste' ? 'active' : ''} onClick={() => setAction('paste')}>
                Paste
              </button>
            </div>
            <div className="modal-actions" style={{ flex: 1 }}>
              <button className="btn ghost" onClick={onClose}>
                Done
              </button>
              <button className="btn primary" disabled={!name.trim() || !body.trim()} onClick={commit}>
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function groupLabel(g: RunnableGroup): string {
  if (g.kind === 'npm') return 'npm'
  if (g.kind === 'make') return 'make'
  return g.source.split('/').pop() ?? g.source
}

function TaskGroup({ group }: { group: RunnableGroup }) {
  const { runCommandText, toggleBookmark, isBookmarked } = useApp()
  const [open, setOpen] = useState(false) // all groups collapsed by default
  return (
    <div className="cmd-group">
      <button
        className={`cmd-group-head ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title={`${group.source} — ${group.items.length} commands`}
      >
        <Icon name={GROUP_ICON[group.kind]} size={11} />
        {groupLabel(group)}
        <span className="cmd-group-n">{group.items.length}</span>
        <Icon name="chevron" size={11} className={`chevron ${open ? 'open' : ''}`} />
      </button>
      {open &&
        group.items.map((it, i) => (
          <span key={i} className="cmd-chip task-chip" title={it.command} onClick={() => runCommandText(it.command)}>
            <span className="ellipsis">{it.label}</span>
            <span
              className={`task-bm ${isBookmarked(it.command) ? 'on' : ''}`}
              title={isBookmarked(it.command) ? 'Remove bookmark' : 'Bookmark'}
              onClick={(e) => {
                e.stopPropagation()
                toggleBookmark(it.label, it.command)
              }}
            >
              <Icon name="star" size={11} />
            </span>
          </span>
        ))}
    </div>
  )
}

export function CommandBar() {
  const { activeTab, commandsByRepo, runnablesByCwd, usageByRepo, runSaved, runCommandText, toggleBookmark, isBookmarked } =
    useApp()
  const [editing, setEditing] = useState(false)
  const tab = activeTab()
  if (!tab) return null
  const list = commandsByRepo[tab.repoId] ?? []
  const groups = runnablesByCwd[tab.cwd] ?? []

  // Commands run often (and not already bookmarked) surface as quick chips.
  const usage = usageByRepo[tab.repoId] ?? {}
  const frequent = Object.entries(usage)
    .filter(([cmd, n]) => n >= 3 && !isBookmarked(cmd))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cmd]) => cmd)

  return (
    <div className="command-bar">
      <div className="cmd-chips">
        {frequent.length > 0 && (
          <div className="cmd-group">
            <span className="cmd-group-head frequent" title="Frequently used">
              <Icon name="star" size={11} /> Frequent
            </span>
            {frequent.map((cmd, i) => (
              <span key={i} className="cmd-chip task-chip" title={cmd} onClick={() => runCommandText(cmd)}>
                <span className="ellipsis">{cmd}</span>
                <span
                  className="task-bm"
                  title="Bookmark"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBookmark(cmd, cmd)
                  }}
                >
                  <Icon name="star" size={11} />
                </span>
              </span>
            ))}
            <span className="cmd-divider" />
          </div>
        )}
        {groups.map((g) => (
          <TaskGroup key={g.source} group={g} />
        ))}
        {groups.length > 0 && list.length > 0 && <span className="cmd-divider" />}
        {groups.length === 0 && list.length === 0 && (
          <span className="cmd-empty">No tasks or saved commands yet</span>
        )}
        {list.map((c) => (
          <button
            key={c.id}
            className="cmd-chip"
            title={`${c.action === 'paste' ? 'Paste' : 'Run'}: ${c.commands.join('\n')}`}
            onClick={() => runSaved(c)}
          >
            <Icon name={c.action === 'paste' ? 'config' : 'terminal'} size={11} />
            {c.commands.length > 1 && <span className="cmd-count">{c.commands.length}</span>}
            {c.name}
          </button>
        ))}
      </div>
      <button className="icon-btn" title="Manage saved commands" onClick={() => setEditing(true)}>
        <Icon name="plus" size={15} />
      </button>
      {editing && <Editor repoId={tab.repoId} list={list} onClose={() => setEditing(false)} />}
    </div>
  )
}
