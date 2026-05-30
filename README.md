# 🌳 Bonsai

A **worktree-aware terminal**. The left sidebar is a tree of your work:

```
repo  →  branch  →  tab (a real terminal)
```

Each branch runs in its own **git worktree**, and Bonsai automatically carries
your `.env*` files into every worktree — so switching branches never means
re-creating secrets or guessing which checkout you're standing in.

Built because juggling worktrees in a plain terminal (Ghostty, iTerm, …) means
your `.env` files vanish in fresh worktrees and you lose track of which
repo/branch a tab is actually in. Bonsai makes the git topology the UI.

---

## Why it exists

- **Git worktrees lose your `.env`.** Worktrees only check out tracked files;
  gitignored secrets like `.env`, `.env.local` don't come along. Bonsai
  symlinks them in from the primary checkout, so the file stays one source of
  truth across every branch.
- **"Which branch am I in?"** A permanent breadcrumb shows
  `repo • branch • worktree path` for the focused tab, and every shell gets
  `BONSAI_BRANCH` / `BONSAI_CWD` exported.
- **Real terminals.** Genuine PTY-backed `zsh` (via `node-pty` + `xterm.js`) —
  not a fake REPL. Full color, resize, your prompt, your tools.

## Features

- Sidebar tree: **repos → branches → tabs**, expand/collapse, persisted across launches.
- One click on a branch creates (or reuses) its git worktree and opens a terminal in it.
- Multiple tabs per branch; tab/branch state survives restarts.
- Automatic `.env*` carry-over (symlink, with copy fallback). An `env N` badge
  shows how many files were carried.
- **Branch management without the terminal:** create a branch (modal), delete a
  branch (worktree is cleaned up for you), and a tucked-away **branch search**
  that filters the tree only when you open it.
- **One-click git:** a Source Control drawer with stage / unstage / stage-all,
  a commit box (`⌘↵` to commit — stages everything if nothing is staged), and
  Fetch / Pull / Push buttons with live ahead/behind counts.
- **Changes → diff → full file** drill-in: see what changed, open a clean unified
  diff, then "Full file" to open it in a **dedicated code-viewer window** with a
  file-tree to browse the worktree and see how it all connects.
- **Pull requests** (via the `gh` CLI): list, view, create from the current
  branch, and edit title/body — without leaving the app.
- **Saved commands**: bookmark a command or a sequence per repo in the bottom
  bar; one click runs it in the active terminal.
- **Themes & deep customization** — 7 themes (Modern, Midnight, Daylight, Boxy,
  Claude, Hacker, Synthwave) plus interface font, corner style, density,
  animations, cursor shape, and font size. Bundle any setup into a **Profile**
  and switch in one click. Opened from the macOS menu bar (`⌘,`) or the gear.
- **Modes**: toggleable behaviors (auto-carry `.env`, auto-fetch, confirm before
  delete/push, …) — see [`CONFIG.md`](./CONFIG.md).
- A permanent breadcrumb (`repo • branch • path`) so you always know where you are.
- Clean, modern UI with a real icon set (lucide), macOS-native window chrome.

## Stack

| Layer | Tool |
|---|---|
| Desktop shell | Electron 30 |
| Terminal UI | xterm.js (`@xterm/*`) + fit / web-links addons |
| Real shell | node-pty |
| Git / worktrees | simple-git |
| Renderer | React + TypeScript + Vite |
| State | Zustand |
| Persistence | electron-store |
| Build tooling | vite-plugin-electron, electron-builder |

## Architecture

```
electron/                 main process (Node, full filesystem + git + PTY access)
  main.ts                 app/window lifecycle
  ipc.ts                  IPC handlers (repos, worktrees, sessions, layout)
  pty.ts                  node-pty session manager (1 PTY per tab)
  git.ts                  branch listing + `git worktree` create/reuse
  env-vault.ts            finds .env* and symlinks them into worktrees
  store.ts                electron-store persistence
  preload.ts              contextBridge → window.bonsai (the only renderer↔main door)

src/                      renderer (React)
  store.ts                Zustand app state + actions
  components/
    Sidebar.tsx           repo→branch→tab tree
    TerminalView.tsx      xterm.js instance bound to a PTY session
    Breadcrumb.tsx        "where am I" bar

shared/types.ts           types shared by main + renderer
```

The renderer never touches Node directly — all repo/git/PTY operations go
through the `window.bonsai` bridge defined in `preload.ts`, with
`contextIsolation` on and `nodeIntegration` off.

### Where worktrees live

Managed worktrees are created under:

```
~/.bonsai/worktrees/<repo>/<branch>
```

The branch currently checked out in the primary repo uses the repo directory
itself (no extra worktree). Existing worktrees that git already knows about are
reused rather than recreated.

## Development

```bash
npm install        # also rebuilds node-pty for Electron (postinstall)
npm run dev        # Vite + Electron with hot reload + devtools
```

If the native module ever gets out of sync with your Electron version:

```bash
npm run rebuild    # electron-rebuild node-pty
```

## Build a distributable

```bash
npm run build      # typecheck + bundle main/preload/renderer
npm run dist:mac   # produce a .dmg in release/
```

## Roadmap

- Split panes within a tab
- Remote-branch checkout (`-b` from `origin/*`)
- Per-repo env overrides and a secrets editor
- Configurable worktree location
- Cross-platform polish (Linux/Windows shells)

## License

MIT
