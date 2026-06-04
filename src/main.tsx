import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import type { CodeDiffSource } from '../shared/types'
import App from './App'
import '@xterm/xterm/css/xterm.css'
import './index.css'

// The same renderer bundle powers two window types: the main app, and the
// standalone code-viewer window (opened with ?view=code). The viewer is lazy
// so it never weighs down the main window.
const CodeViewer = lazy(() =>
  import('./components/CodeViewer').then((m) => ({ default: m.CodeViewer })),
)
const PrWindow = lazy(() => import('./components/PrWindow').then((m) => ({ default: m.PrWindow })))
const DiffWindow = lazy(() =>
  import('./components/DiffWindow').then((m) => ({ default: m.DiffWindow })),
)

const params = new URLSearchParams(window.location.search)
const view = params.get('view')

function Root() {
  if (view === 'code') {
    const diff = params.get('diff')
    let source: CodeDiffSource | undefined
    if (diff === 'worktree') source = { diff: 'worktree', staged: params.get('staged') === '1' }
    else if (diff === 'pr' || diff === 'commit')
      source = { diff, ref: params.get('ref') ?? '' }
    return (
      <Suspense fallback={<div className="cv-loading">Loading…</div>}>
        <CodeViewer
          cwd={params.get('cwd') ?? ''}
          initialFile={params.get('file') ?? ''}
          initialSource={source}
        />
      </Suspense>
    )
  }
  if (view === 'pr') {
    return (
      <Suspense fallback={<div className="cv-loading">Loading…</div>}>
        <PrWindow cwd={params.get('cwd') ?? ''} num={Number(params.get('num') ?? 0)} />
      </Suspense>
    )
  }
  if (view === 'diff') {
    return (
      <Suspense fallback={<div className="cv-loading">Loading…</div>}>
        <DiffWindow
          cwd={params.get('cwd') ?? ''}
          kind={params.get('kind') ?? 'pr'}
          gitRef={params.get('ref') ?? ''}
          file={params.get('file') ?? ''}
        />
      </Suspense>
    )
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
