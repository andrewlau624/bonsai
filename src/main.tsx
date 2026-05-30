import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CodeViewer } from './components/CodeViewer'
import '@xterm/xterm/css/xterm.css'
import './index.css'

// The same renderer bundle powers two window types: the main app, and the
// standalone code-viewer window (opened with ?view=code).
const params = new URLSearchParams(window.location.search)
const isCodeWindow = params.get('view') === 'code'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isCodeWindow ? (
      <CodeViewer cwd={params.get('cwd') ?? ''} initialFile={params.get('file') ?? ''} />
    ) : (
      <App />
    )}
  </React.StrictMode>,
)
