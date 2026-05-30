import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { Mermaid } from './Mermaid'

// react-markdown + plugins are dynamically imported so they form their own
// chunk. Raw HTML in PR bodies is rendered via rehype-raw then sanitized.
// ```mermaid fenced blocks render as diagrams (sequenceDiagram, flowchart, …).
type MarkdownComponent = ComponentType<{
  remarkPlugins?: unknown[]
  rehypePlugins?: unknown[]
  components?: Record<string, unknown>
  children: string
}>

let cached: { Md: MarkdownComponent; remark: unknown[]; rehype: unknown[] } | null = null

const components = {
  code({ className, children, ...props }: { className?: string; children?: unknown }) {
    const text = String(children ?? '').replace(/\n$/, '')
    if (/\blanguage-mermaid\b/.test(className ?? '')) return <Mermaid chart={text} />
    return (
      <code className={className} {...props}>
        {children as never}
      </code>
    )
  },
}

export function Markdown({ children }: { children: string }) {
  const [mod, setMod] = useState(cached)

  useEffect(() => {
    if (cached) return
    let alive = true
    void Promise.all([
      import('react-markdown'),
      import('remark-gfm'),
      import('rehype-raw'),
      import('rehype-sanitize'),
    ]).then(([rm, gfm, raw, sanitize]) => {
      cached = {
        Md: rm.default as MarkdownComponent,
        remark: [gfm.default],
        rehype: [raw.default, sanitize.default],
      }
      if (alive) setMod(cached)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!mod) return <pre className="md-raw">{children}</pre>
  const { Md, remark, rehype } = mod
  return (
    <div className="md">
      <Md remarkPlugins={remark} rehypePlugins={rehype} components={components}>
        {children}
      </Md>
    </div>
  )
}
