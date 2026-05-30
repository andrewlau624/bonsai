import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'

// react-markdown + remark-gfm are dynamically imported so they form their own
// chunk (markdown is only ever needed inside the PR view).
type MarkdownComponent = ComponentType<{ remarkPlugins?: unknown[]; children: string }>

let cached: { Md: MarkdownComponent; gfm: unknown } | null = null

export function Markdown({ children }: { children: string }) {
  const [mod, setMod] = useState(cached)

  useEffect(() => {
    if (cached) return
    let alive = true
    void Promise.all([import('react-markdown'), import('remark-gfm')]).then(([rm, gfm]) => {
      cached = { Md: rm.default as MarkdownComponent, gfm: gfm.default }
      if (alive) setMod(cached)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!mod) return <pre className="md-raw">{children}</pre>
  const { Md, gfm } = mod
  return (
    <div className="md">
      <Md remarkPlugins={[gfm]}>{children}</Md>
    </div>
  )
}
