import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { TabState } from '../../shared/types'
import { useApp } from '../store'
import { getTheme } from '../themes'

const FONT_FAMILY = 'Menlo, "SF Mono", "JetBrains Mono", "Fira Code", Consolas, monospace'

/**
 * One xterm.js instance bound to one PTY session for the lifetime of a tab.
 * Inactive tabs stay mounted (hidden via CSS) so their shell state survives
 * tab switches.
 */
export function TerminalView({ tab, active }: { tab: TabState; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const config = useApp((s) => s.config)
  const themeId = config?.theme ?? 'modern'
  const fontSize = config?.fontSize ?? 13
  const cursorBlink = config?.cursorBlink ?? true

  useEffect(() => {
    const term = new XTerm({
      fontFamily: FONT_FAMILY,
      fontSize,
      cursorBlink,
      allowProposedApi: true,
      theme: getTheme(themeId).terminal,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current!)
    try {
      fit.fit()
    } catch {
      /* container not sized yet */
    }
    termRef.current = term
    fitRef.current = fit

    let disposed = false
    let offData = () => {}
    let offExit = () => {}

    void (async () => {
      const id = await window.bonsai.session.create({
        repoId: tab.repoId,
        branch: tab.branch,
        cwd: tab.cwd,
        cols: term.cols,
        rows: term.rows,
      })
      if (disposed) {
        window.bonsai.session.kill(id)
        return
      }
      sessionIdRef.current = id
      offData = window.bonsai.session.onData((sid, data) => {
        if (sid === id) term.write(data)
      })
      offExit = window.bonsai.session.onExit((sid) => {
        if (sid === id) term.writeln('\r\n\x1b[90m[process exited]\x1b[0m')
      })
      term.onData((d) => window.bonsai.session.write(id, d))
    })()

    const refit = () => {
      const el = containerRef.current
      if (!el || el.clientWidth === 0 || el.clientHeight === 0) return
      try {
        fit.fit()
      } catch {
        return
      }
      const id = sessionIdRef.current
      if (id) window.bonsai.session.resize(id, term.cols, term.rows)
    }
    const ro = new ResizeObserver(refit)
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      disposed = true
      ro.disconnect()
      offData()
      offExit()
      if (sessionIdRef.current) window.bonsai.session.kill(sessionIdRef.current)
      term.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live-apply theme / font / cursor changes from Settings.
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.theme = getTheme(themeId).terminal
    term.options.fontSize = fontSize
    term.options.cursorBlink = cursorBlink
    try {
      fitRef.current?.fit()
      const id = sessionIdRef.current
      if (id) window.bonsai.session.resize(id, term.cols, term.rows)
    } catch {
      /* not visible yet */
    }
  }, [themeId, fontSize, cursorBlink])

  useEffect(() => {
    if (!active) return
    requestAnimationFrame(() => {
      const term = termRef.current
      const el = containerRef.current
      if (!term || !el || el.clientWidth === 0) return
      try {
        fitRef.current?.fit()
      } catch {
        /* noop */
      }
      const id = sessionIdRef.current
      if (id) window.bonsai.session.resize(id, term.cols, term.rows)
      term.focus()
    })
  }, [active])

  return (
    <div
      className="term-pane"
      style={{ display: active ? 'block' : 'none' }}
      onClick={() => termRef.current?.focus()}
    >
      <div className="term-surface" ref={containerRef} />
    </div>
  )
}
