import { useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'
import type { SavedCommand } from '../../shared/types'

function Editor({
  repoId,
  list,
  onClose,
}: {
  repoId: string
  list: SavedCommand[]
  onClose: () => void
}) {
  const { saveCommands } = useApp()
  const [items, setItems] = useState<SavedCommand[]>(list)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const commit = () => {
    const commands = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (!name.trim() || commands.length === 0) return
    let next: SavedCommand[]
    if (editingId) {
      next = items.map((it) => (it.id === editingId ? { ...it, name: name.trim(), commands } : it))
    } else {
      next = [...items, { id: `c${Date.now()}`, name: name.trim(), commands }]
    }
    setItems(next)
    void saveCommands(repoId, next)
    setName('')
    setBody('')
    setEditingId(null)
  }

  const remove = (id: string) => {
    const next = items.filter((it) => it.id !== id)
    setItems(next)
    void saveCommands(repoId, next)
    if (editingId === id) {
      setEditingId(null)
      setName('')
      setBody('')
    }
  }

  const edit = (it: SavedCommand) => {
    setEditingId(it.id)
    setName(it.name)
    setBody(it.commands.join('\n'))
  }

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal cmd-editor" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <Icon name="terminal" size={18} />
          <h3>Saved commands</h3>
        </header>
        <p className="modal-sub">
          Bookmark a command or a sequence. Clicking it runs the lines in your active terminal.
        </p>

        <div className="cmd-list">
          {items.length === 0 && <div className="set-empty">No saved commands yet.</div>}
          {items.map((it) => (
            <div className="cmd-item" key={it.id}>
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
            placeholder={'One command per line, e.g.\nnpm install\nnpm run dev'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="modal-actions">
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
  )
}

export function CommandBar() {
  const { activeTab, commandsByRepo, runCommands } = useApp()
  const [editing, setEditing] = useState(false)
  const tab = activeTab()
  if (!tab) return null
  const list = commandsByRepo[tab.repoId] ?? []

  return (
    <div className="command-bar">
      <Icon name="terminal" size={13} className="cmd-bar-icon" />
      <div className="cmd-chips">
        {list.length === 0 && <span className="cmd-empty">No saved commands — bookmark one →</span>}
        {list.map((c) => (
          <button
            key={c.id}
            className="cmd-chip"
            title={c.commands.join('\n')}
            onClick={() => runCommands(c.commands)}
          >
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
