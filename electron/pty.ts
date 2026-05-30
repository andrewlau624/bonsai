import * as pty from 'node-pty'
import type { WebContents } from 'electron'
import type { SessionOptions } from '../shared/types'

// Manages real PTY-backed shell sessions. Each terminal tab in the renderer
// maps 1:1 to an IPty here. Output is streamed back to the renderer over IPC.

interface Session {
  id: string
  proc: pty.IPty
  sender: WebContents
  lastProcess: string
}

const sessions = new Map<string, Session>()
let counter = 0
let processPoll: ReturnType<typeof setInterval> | null = null

// Poll each PTY's foreground process name (node-pty's `process` reflects the
// active foreground program — `claude`, `vim`, `node`, the shell when idle).
// Renderer uses it to title tabs and flag which ones are busy.
function ensureProcessPoll(): void {
  if (processPoll) return
  processPoll = setInterval(() => {
    if (sessions.size === 0) {
      clearInterval(processPoll!)
      processPoll = null
      return
    }
    for (const s of sessions.values()) {
      let name = ''
      try {
        name = s.proc.process || ''
      } catch {
        /* pty gone */
      }
      if (name && name !== s.lastProcess) {
        s.lastProcess = name
        if (!s.sender.isDestroyed()) s.sender.send('session:process', s.id, name)
      }
    }
  }, 1000)
}

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

  sessions.set(id, { id, proc, sender, lastProcess: '' })
  ensureProcessPoll()
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
  const pid = s.proc.pid
  try {
    s.proc.kill()
  } catch {
    /* already gone */
  }
  // Also kill the whole process group so child processes (dev servers holding
  // ports, etc.) don't get orphaned. node-pty makes the shell a session leader,
  // so the negative pid targets the group.
  if (process.platform !== 'win32' && pid) {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      /* group already gone */
    }
  }
  sessions.delete(id)
}

export function killAll(): void {
  for (const id of [...sessions.keys()]) killSession(id)
}
