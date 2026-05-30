import { useRef, useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'

// Embedded localhost preview for web apps. Uses an Electron <webview> so dev
// servers that block iframing still load. Mounted whenever the Preview tab
// exists; visibility is controlled by the parent (so it keeps its page state
// when you switch back to the terminal).
export function Preview() {
  const { previewUrl, setPreviewUrl, openPreviewWindow } = useApp()
  const [draft, setDraft] = useState(previewUrl)
  const viewRef = useRef<HTMLElement & { reload: () => void; src: string }>(null)

  const go = (url: string) => {
    const u = url.match(/^https?:\/\//) ? url : `http://${url}`
    setPreviewUrl(u)
    setDraft(u)
    if (viewRef.current) viewRef.current.src = u
  }

  return (
    <div className="preview">
      <div className="preview-bar">
        <button className="icon-btn" title="Reload" onClick={() => viewRef.current?.reload()}>
          <Icon name="fetch" size={14} />
        </button>
        <input
          className="preview-url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go(draft)}
          spellCheck={false}
        />
        <button className="icon-btn" title="Open in separate window" onClick={openPreviewWindow}>
          <Icon name="external" size={14} />
        </button>
      </div>
      <webview ref={viewRef as never} className="preview-web" src={previewUrl} />
    </div>
  )
}
