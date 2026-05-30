import { useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'

/** Searchable checklist to choose which branches of a repo show in the tree. */
export function BranchPicker() {
  const { branchPicker, closeBranchPicker, repos, branchesByRepo, branchPrefsByRepo, setIncludedBranches } =
    useApp()
  const [q, setQ] = useState('')
  if (!branchPicker) return null

  const repo = repos.find((r) => r.id === branchPicker)
  const all = branchesByRepo[branchPicker] ?? []
  const prefs = branchPrefsByRepo[branchPicker]
  // Uncurated => everything is included by default.
  const included = new Set(prefs ?? all.map((b) => b.name))
  const filter = q.trim().toLowerCase()
  const list = filter ? all.filter((b) => b.name.toLowerCase().includes(filter)) : all

  const setAll = (names: string[]) => setIncludedBranches(branchPicker, names)
  const toggle = (name: string) => {
    const next = new Set(included)
    next.has(name) ? next.delete(name) : next.add(name)
    setAll([...next])
  }

  return (
    <div className="modal-scrim" onMouseDown={closeBranchPicker}>
      <div className="modal branch-picker" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <Icon name="branch" size={18} />
          <h3>Branches to show</h3>
        </header>
        <p className="modal-sub">
          Choose which branches appear under {repo?.name}. Hidden ones stay out of the way so you
          don’t open them by accident.
        </p>

        <div className="bp-search">
          <Icon name="search" size={14} />
          <input autoFocus placeholder="Filter branches…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="bp-actions">
          <button className="text-btn" onClick={() => setAll(all.map((b) => b.name))}>
            Select all
          </button>
          <button className="text-btn" onClick={() => setAll([])}>
            Select none
          </button>
          <span className="bp-count">
            {included.size}/{all.length}
          </span>
        </div>

        <div className="bp-list">
          {list.length === 0 && <div className="set-empty">No matching branches.</div>}
          {list.map((b) => (
            <label key={b.name} className="bp-item">
              <input
                type="checkbox"
                checked={included.has(b.name)}
                disabled={b.current}
                onChange={() => toggle(b.name)}
              />
              <Icon name="branch" size={13} className="i-branch" />
              <span className="ellipsis">{b.name}</span>
              {b.current && <span className="badge current">HEAD</span>}
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn primary" onClick={closeBranchPicker}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
