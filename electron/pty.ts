import * as pty from 'node-pty'
import type { WebContents } from 'electron'
import type { SessionOptions } from '../shared/types'

// Manages real PTY-backed shell sessions. Each terminal tab in the renderer
// maps 1:1 to an IPty here. Output is streamed back to the renderer over IPC.

interface Session {
  id: string
  proc: pty.IPty
}

const sessions = new Map<string, Session>()
let counter = 0

function defaultShell(): string {
  if (process.platform === 'win32') return process.env.COMSPEC || 'powershell.exe'
  return process.env.SHELL || '/bin/zsh'
}

export function createSession(opts: SessionOptions, sender: WebContents): string {
  const id = `s${++counter}`
  const shell = defaultShell()

  const proc = pty.spawn(shell, ['-l'], {
    name: 'xterm-256color',
    cols: opts.cols || 80,
    rows: opts.rows || 24,
    cwd: opts.cwd,
    env: {
      ...process.env,
      // Make it obvious inside the shell which worktree this is.
      BONSAI_BRANCH: opts.branch,
      BONSAI_CWD: opts.cwd,
      TERM: 'xterm-256color',
    } as Record<string, string>,
  })

  proc.onData((data) => {
    if (!sender.isDestroyed()) sender.send('session:data', id, data)
  })
  proc.onExit(({ exitCode }) => {
    if (!sender.isDestroyed()) sender.send('session:exit', id, exitCode)
    sessions.delete(id)
  })

  sessions.set(id, { id, proc })
  return id
}

export function writeSession(id: string, data: string): void {
  sessions.get(id)?.proc.write(data)
}

export function resizeSession(id: string, cols: number, rows: number): void {
  const s = sessions.get(id)
  if (s && cols > 0 && rows > 0) s.proc.resize(cols, rows)
}

export function killSession(id: string): void {
  const s = sessions.get(id)
  if (!s) return
  try {
    s.proc.kill()
  } catch {
    /* already gone */
  }
  sessions.delete(id)
}

export function killAll(): void {
  for (const id of [...sessions.keys()]) killSession(id)
}
