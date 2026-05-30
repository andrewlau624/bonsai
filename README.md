<div align="center">

<img width="140" height="140" alt="Bonsai" src="https://github.com/user-attachments/assets/f020cea3-a370-41ec-9887-7fdd20f1f660" />

# Bonsai

**A worktree-aware terminal.** Your sidebar is a living tree of your work:

`repo → branch → tab (a real terminal)`

Each branch runs in its own **git worktree**, and Bonsai automatically carries your
`.env*` files into every one — so switching branches never means re-creating secrets
or guessing which checkout you're standing in.

<br/>

![Electron](https://img.shields.io/badge/Electron-30-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-TypeScript-3178C6?logo=react&logoColor=white)
![macOS](https://img.shields.io/badge/macOS-native-000000?logo=apple&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## Why it exists

Juggling worktrees in a plain terminal (Ghostty, iTerm, …) has two recurring pains.
Bonsai fixes both by making the git topology *the UI*.

| Pain | Bonsai's fix |
|---|---|
| **Worktrees lose your `.env`.** Git only checks out *tracked* files, so gitignored secrets like `.env` and `.env.local` never follow you into a fresh worktree. | Symlinks them in from the primary checkout — one source of truth across every branch (copy fallback when symlinks aren't possible). |
| **"Which branch am I even in?"** Easy to lose track across a dozen checkouts. | A permanent breadcrumb shows `repo • branch • worktree path` for the focused tab, and every shell gets `BONSAI_BRANCH` / `BONSAI_CWD` exported. |
| **Fake REPLs aren't real shells.** | Genuine PTY-backed `zsh` (`node-pty` + `xterm.js`): full color, resize, your prompt, your tools. |

## Features

**🌳 The tree**
- Sidebar of **repos → branches → tabs** — expand/collapse, persisted across launches.
- One click on a branch creates (or reuses) its git worktree and opens a terminal in it.
- Multiple tabs per branch; tab and branch state survive restarts.
- A permanent breadcrumb (`repo • branch • path`) so you always know where you are.

**🔐 Env carry-over**
- Automatic `.env*` carry-over on every worktree (symlink, with copy fallback).
- An `env N` badge shows how many files were carried.

**🌿 Branch management — without the terminal**
- Create a branch from a modal, or delete one (the worktree is cleaned up for you).
- A tucked-away **branch search** that filters the tree only when you open it.

**🔀 One-click git**
- A Source Control drawer with stage / unstage / stage-all.
- A commit box (`⌘↵` to commit — stages everything if nothing is staged).
- Fetch / Pull / Push buttons with live ahead/behind counts.
- **Changes → diff → full file** drill-in: see what changed, open a clean unified diff,
  then "Full file" to open it in a dedicated **code-viewer window** with a file-tree
  to browse the worktree and see how it all connects.

**📤 Pull requests** (via the `gh` CLI)
- List, view, create from the current branch, and edit title/body — without leaving the app.

**⚡ Saved commands**
- Bookmark a command or a sequence per repo in the bottom bar; one click runs it in the active terminal.

**🎨 Themes & deep customization**
- 7 themes — Modern, Midnight, Daylight, Boxy, Claude, Hacker, Synthwave.
- Plus interface font, corner style, density, animations, cursor shape, and font size.
- Bundle any setup into a **Profile** and switch in one click. Open from the macOS menu bar (`⌘,`) or the gear.

**🎛️ Modes**
- Toggleable behaviors (auto-carry `.env`, auto-fetch, confirm before delete/push, …) — see [`CONFIG.md`](./CONFIG.md).

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
electron/                 main process (Node — full filesystem + git + PTY access)
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
    Sidebar.tsx           repo → branch → tab tree
    TerminalView.tsx      xterm.js instance bound to a PTY session
    Breadcrumb.tsx        "where am I" bar

shared/types.ts           types shared by main + renderer
```

The renderer never touches Node directly — all repo/git/PTY operations go through the
`window.bonsai` bridge defined in `preload.ts`, with `contextIsolation` on and
`nodeIntegration` off.

### Where worktrees live

Managed worktrees are created under:

```
~/.bonsai/worktrees/<repo>/<branch>
```

The branch currently checked out in the primary repo uses the repo directory itself
(no extra worktree). Existing worktrees that git already knows about are reused rather
than recreated.

## Getting started

```bash
npm install        # also rebuilds node-pty for Electron (postinstall)
npm run dev        # Vite + Electron with hot reload + devtools
```

If the native module ever gets out of sync with your Electron version:

```bash
npm run rebuild    # electron-rebuild node-pty
```

### Build a distributable

```bash
npm run build      # typecheck + bundle main/preload/renderer
npm run dist:mac   # produce a .dmg in release/
```

## Roadmap

- [ ] Split panes within a tab
- [ ] Remote-branch checkout (`-b` from `origin/*`)
- [ ] Per-repo env overrides and a secrets editor
- [ ] Configurable worktree location
- [ ] Cross-platform polish (Linux / Windows shells)

## License

MIT
