# Configuring Bonsai

Bonsai is configured from **Settings** (the gear in the sidebar, the macOS menu
bar → *Settings…*, or `⌘,`). Everything you set there is written to a plain JSON
file on disk, so you can also edit it by hand or check it into your dotfiles.

> This doc explains the config *in general* — it is not tied to any one tool.
> Anything you can toggle in the UI you can also write directly in the file.

## Where the config lives

Open **Settings → Config** and click **Reveal** to jump to the file, or read the
path shown there. It's the standard Electron user-data location:

- **macOS:** `~/Library/Application Support/bonsai/bonsai.json`
- **Linux:** `~/.config/bonsai/bonsai.json`
- **Windows:** `%APPDATA%\bonsai\bonsai.json`

Bonsai reads the file at launch and writes it whenever you change a setting.
If you edit by hand, **relaunch** to pick up the changes.

## The `config` object

```jsonc
{
  "config": {
    "theme": "modern",          // id of any built-in theme (see below)
    "density": "comfortable",   // "comfortable" | "compact"
    "fontSize": 13,             // terminal font size in px (9–24)
    "cursorBlink": true,        // blink the terminal cursor
    "modes": {                  // behavior toggles — see "Modes"
      "autoFetchOnOpen": true
    },
    "profiles": [               // saved bundles you can switch between
      {
        "id": "p1700000000000",
        "name": "Hacker",
        "theme": "hacker",
        "density": "compact",
        "fontSize": 14,
        "cursorBlink": false,
        "modes": { "showHiddenFiles": true }
      }
    ]
  }
}
```

Only the keys you set need to be present; anything missing falls back to the
defaults above.

## Themes

Pick from the gallery in **Settings → Appearance**, or set `theme` to one of the
built-in ids:

| id | name | look |
|----|------|------|
| `modern` | Modern | slate + green (default) |
| `midnight` | Midnight | near-black + blue |
| `light` | Daylight | light mode |
| `boxy` | Boxy | sharp corners, mono UI, amber |
| `claude` | Claude | warm terracotta on dark |
| `hacker` | Hacker | green-on-black, monospace |
| `synthwave` | Synthwave | neon purple/magenta/cyan |

Each theme also restyles the terminal palette to match.

## Modes

**Modes** are individual on/off behaviors. Toggle them in **Settings →
Behavior**, or set them under `config.modes`. A mode that isn't present uses its
default.

| key | default | what it does |
|-----|---------|--------------|
| `autoCarryEnv` | `true` | Symlink `.env*` from the primary checkout into every new worktree. |
| `autoFetchOnOpen` | `false` | Run `git fetch` for the repo each time you open one of its branches. |
| `confirmBeforeDelete` | `true` | Confirm before a branch (and its worktree) is removed. |
| `confirmBeforePush` | `false` | Ask before `git push`. |
| `stageAllOnCommit` | `true` | If nothing is staged, stage everything when you commit. |
| `showHiddenFiles` | `true` | Show dotfiles when browsing a file's directory. |

To turn a mode off by hand:

```jsonc
"modes": { "stageAllOnCommit": false }
```

## Profiles (make your own modes/presets)

A **profile** is a named bundle of `theme + density + fontSize + cursorBlink +
modes`. Configure Bonsai exactly how you like, then **Settings → Profiles → Save
current** to capture it. Switching profiles applies the whole bundle at once.

This is the "make your own modes" workflow: build a setup (say, a locked-down
"review" profile with `confirmBeforePush` on and a calm theme, or a fast
"hacking" profile with confirms off), save it, and flip to it whenever you want.

You can also author a profile directly in the JSON — give it a unique `id` and
`name` and list any subset of settings; missing keys inherit the defaults when
applied.

## Resetting

Delete `bonsai.json` (or just the `config` key inside it) and relaunch — Bonsai
recreates it with defaults.
