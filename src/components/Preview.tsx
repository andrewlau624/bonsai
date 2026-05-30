import { useRef, useState } from 'react'
import { useApp } from '../store'
import { Icon } from './Icon'

// One embedded localhost preview (a single port/URL). Uses an Electron
// <webview> so dev servers that block iframing still load. Kept mounted so it
// preserves its page when you switch tabs.
export function Preview({ id, url }: { id: string; url: string }) {
  const { setPreviewTabUrl, openPreviewWindow } = useApp()
  const [draft, setDraft] = useState(url)
  const viewRef = useRef<HTMLElement & { reload: () => void; src: string }>(null)

  const go = (next: string) => {
    const u = next.match(/^https?:\/\//) ? next : `http://${next}`
    setPreviewTabUrl(id, u)
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
        <button className="icon-btn" title="Open in separate window" onClick={() => openPreviewWindow(id)}>
          <Icon name="external" size={14} />
        </button>
      </div>
      <webview ref={viewRef as never} className="preview-web" src={url} />
    </div>
  )
}
