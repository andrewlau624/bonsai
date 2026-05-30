import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'

/** Renders whichever modal the store currently has open (new branch / delete). */
export function Modal() {
  const { modal, closeModal, createBranch, deleteBranch, repos } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    setName('')
    if (modal?.type === 'newBranch') setTimeout(() => inputRef.current?.focus(), 30)
  }, [modal])

  if (!modal) return null
  const repo = repos.find((r) => r.id === modal.repoId)

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeModal()
  }

  return (
    <div className="modal-scrim" onMouseDown={closeModal} onKeyDown={onKey}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        {modal.type === 'newBranch' && (
          <>
            <header className="modal-head">
              <Icon name="branch" size={18} />
              <h3>New branch</h3>
            </header>
            <p className="modal-sub">in {repo?.name}</p>
            <input
              ref={inputRef}
              className="modal-input"
              placeholder="feature/my-branch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) createBranch(modal.repoId, name.trim())
                if (e.key === 'Escape') closeModal()
              }}
            />
            <div className="modal-actions">
              <button className="btn ghost" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn primary"
                disabled={!name.trim()}
                onClick={() => createBranch(modal.repoId, name.trim())}
              >
                Create branch
              </button>
            </div>
          </>
        )}

        {modal.type === 'confirmDelete' && (
          <>
            <header className="modal-head danger">
              <Icon name="trash" size={18} />
              <h3>Delete branch</h3>
            </header>
            <p className="modal-sub">
              Delete <strong>{modal.branch}</strong> from {repo?.name}? Any worktree for it will be
              removed too. This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => deleteBranch(modal.repoId, modal.branch)}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
