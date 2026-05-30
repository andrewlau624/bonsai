import { useEffect, useRef, useState } from 'react'

// Mermaid is heavy, so it's dynamically imported on first use. Renders any
// ```mermaid fenced block (sequenceDiagram, flowchart, etc.) to SVG.
type MermaidApi = {
  initialize: (cfg: Record<string, unknown>) => void
  render: (id: string, text: string) => Promise<{ svg: string }>
}

let api: MermaidApi | null = null
let seq = 0

export function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const idRef = useRef(`mmd-${++seq}`)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        if (!api) {
          api = ((await import('mermaid')) as { default: MermaidApi }).default
          const light = document.documentElement.dataset.group === 'light'
          api.initialize({
            startOnLoad: false,
            theme: light ? 'default' : 'dark',
            securityLevel: 'strict',
            fontFamily: 'inherit',
          })
        }
        const { svg } = await api.render(idRef.current, chart)
        if (alive) {
          setSvg(svg)
          setError('')
        }
      } catch (e) {
        if (alive) setError(String((e as Error)?.message ?? e))
      }
    })()
    return () => {
      alive = false
    }
  }, [chart])

  if (error) {
    return (
      <pre className="mermaid-err" title={error}>
        {chart}
      </pre>
    )
  }
  if (!svg) return <div className="mermaid-loading">Rendering diagram…</div>
  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}
