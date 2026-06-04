import { useEffect, useState } from 'react'
import { applyConfigStyle } from '../themes'
import { DiffView } from './DiffView'
import { Icon } from './Icon'

function splitDiff(diff: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of diff.split(/(?=^diff --git )/m)) {
    if (!part.startsWith('diff --git')) continue
    const m = /^diff --git a\/.+ b\/(.+)$/m.exec(part)
    if (m) out[m[1].trim()] = part
  }
  return out
}

/** A single file's diff (with +/-) from a PR or commit, in its own window. */
export function DiffWindow({
  cwd,
  kind,
  gitRef,
  file,
}: {
  cwd: string
  kind: string
  gitRef: string
  file: string
}) {
  const [diff, setDiff] = useState<string | null>(null)

  useEffect(() => {
    void window.bonsai.config.get().then(applyConfigStyle)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const full =
          kind === 'commit'
            ? (await window.bonsai.pr.commitDiff(cwd, gitRef)).diff
            : await window.bonsai.pr.diff(cwd, Number(gitRef))
        setDiff(splitDiff(full)[file] ?? '')
      } catch {
        setDiff('')
      }
    })()
  }, [cwd, kind, gitRef, file])

  return (
    <div className="diff-window">
      <div className="win-drag" />
      <header className="diff-window-head">
        <Icon name="diff" size={14} />
        <span className="cv-file-name">{file}</span>
        <button
          className="btn ghost sm"
          style={{ marginLeft: 'auto' }}
          title="Open the full file with +/- markers"
          onClick={() =>
            void window.bonsai.window.openCode(
              cwd,
              file,
              kind === 'commit' ? { diff: 'commit', ref: gitRef } : { diff: 'pr', ref: gitRef },
            )
          }
        >
          <Icon name="file" size={13} /> Full file
        </button>
      </header>
      <div className="diff-window-body">
        {diff === null ? (
          <div className="cv-loading">Loading diff…</div>
        ) : diff === '' ? (
          <div className="diff-empty">No diff for this file.</div>
        ) : (
          <DiffView diff={diff} />
        )}
      </div>
    </div>
  )
}
