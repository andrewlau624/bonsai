import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
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

const params = new URLSearchParams(window.location.search)
const view = params.get('view')

function Root() {
  if (view === 'code') {
    return (
      <Suspense fallback={<div className="cv-loading">Loading…</div>}>
        <CodeViewer cwd={params.get('cwd') ?? ''} initialFile={params.get('file') ?? ''} />
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
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
