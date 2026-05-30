import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'

// react-markdown + plugins are dynamically imported so they form their own
// chunk (markdown is only ever needed inside the PR view). Raw HTML embedded in
// PR bodies/comments is rendered via rehype-raw, then run through
// rehype-sanitize so a malicious PR can't inject scripts into the renderer.
type MarkdownComponent = ComponentType<{
  remarkPlugins?: unknown[]
  rehypePlugins?: unknown[]
  children: string
}>

let cached: { Md: MarkdownComponent; remark: unknown[]; rehype: unknown[] } | null = null

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
      <Md remarkPlugins={remark} rehypePlugins={rehype}>
        {children}
      </Md>
    </div>
  )
}
