import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { THEMES } from '../themes'

interface Action {
  id: string
  label: string
  hint?: string
  icon: IconName
  run: () => void
}

export function CommandPalette() {
  const store = useApp()
  const { paletteOpen, closePalette } = store
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [paletteOpen])

  const actions = useMemo<Action[]>(() => {
    if (!paletteOpen) return []
    const list: Action[] = []
    const tab = store.tabs.find((t) => t.id === store.activeTabId)

    // Branches across loaded repos
    for (const repo of store.repos) {
      for (const b of store.branchesByRepo[repo.id] ?? []) {
        list.push({
          id: `b:${repo.id}:${b.name}`,
          label: b.name,
          hint: `branch · ${repo.name}`,
          icon: 'branch',
          run: () => store.openBranch(repo.id, b.name),
        })
      }
    }
    // Saved commands for the active repo
    if (tab) {
      for (const c of store.commandsByRepo[tab.repoId] ?? []) {
        list.push({
          id: `c:${c.id}`,
          label: c.name,
          hint: c.action === 'paste' ? 'paste command' : 'run command',
          icon: 'terminal',
          run: () => store.runSaved(c),
        })
      }
    }
    // Themes
    for (const t of THEMES) {
      list.push({
        id: `t:${t.id}`,
        label: `Theme: ${t.name}`,
        hint: 'appearance',
        icon: 'palette',
        run: () => store.updateConfig({ theme: t.id }),
      })
    }
    // Global actions
    list.push(
      { id: 'a:settings', label: 'Open Settings', hint: '⌘,', icon: 'settings', run: () => store.setSettingsOpen(true) },
      { id: 'a:sc', label: 'Toggle Source Control', hint: '⌘B', icon: 'diff', run: store.toggleSourceControl },
      { id: 'a:sidebar', label: 'Toggle Sidebar', hint: '', icon: 'panel', run: store.toggleSidebar },
      { id: 'a:newtab', label: 'New terminal tab', hint: '⌘T', icon: 'plus', run: store.newTabOnActive },
      { id: 'a:reveal', label: 'Reveal in Finder', hint: '', icon: 'reveal', run: store.revealActive },
      { id: 'a:editor', label: 'Open in editor', hint: '', icon: 'external', run: store.openActiveInEditor },
    )
    return list
  }, [paletteOpen, store])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions.slice(0, 50)
    return actions
      .filter((a) => (a.label + ' ' + (a.hint ?? '')).toLowerCase().includes(q))
      .slice(0, 50)
  }, [actions, query])

  if (!paletteOpen) return null

  const choose = (a?: Action) => {
    if (!a) return
    a.run()
    closePalette()
  }

  return (
    <div className="palette-scrim" onMouseDown={closePalette}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            placeholder="Jump to a branch, command, theme, or action…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, filtered.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                choose(filtered[active])
              } else if (e.key === 'Escape') {
                closePalette()
              }
            }}
          />
        </div>
        <div className="palette-list">
          {filtered.length === 0 && <div className="palette-empty">No matches</div>}
          {filtered.map((a, i) => (
            <button
              key={a.id}
              className={`palette-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(a)}
            >
              <Icon name={a.icon} size={15} />
              <span className="ellipsis palette-label">{a.label}</span>
              {a.hint && <span className="palette-hint">{a.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
