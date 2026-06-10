import { app, BrowserWindow, net } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import type { UpdaterState } from '../shared/types'

// GitHub repo to poll for releases. Tag format: `vMAJOR.MINOR.PATCH`.
const OWNER = 'andrewlau624'
const REPO = 'bonsai'
const LATEST_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`

// Unsigned-mac auto-update: download a .zip from a GitHub Release, then a
// detached helper script waits for the running app to exit, swaps the .app
// bundle in place, strips the quarantine xattr (so Gatekeeper doesn't re-warn),
// and relaunches. The standard `electron-updater` path requires a Developer ID
// because Squirrel.Mac rejects unsigned updates — this avoids that constraint.

interface UpdateInfo {
  version: string
  notes: string
  url: string
}

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'uptodate' }
  | { kind: 'available'; info: UpdateInfo }
  | { kind: 'downloading'; info: UpdateInfo; progress: number }
  | { kind: 'ready'; info: UpdateInfo; downloadedPath: string }
  | { kind: 'error'; message: string }

let state: State = { kind: 'idle' }

function toPublic(s: State): UpdaterState {
  switch (s.kind) {
    case 'available':
      return { kind: 'available', version: s.info.version, notes: s.info.notes }
    case 'downloading':
      return { kind: 'downloading', version: s.info.version, progress: s.progress }
    case 'ready':
      return { kind: 'ready', version: s.info.version }
    case 'error':
      return { kind: 'error', message: s.message }
    default:
      return { kind: s.kind }
  }
}

function broadcast(): void {
  const payload = toPublic(state)
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('updater:state', payload)
  }
}

function setState(next: State): void {
  state = next
  broadcast()
}

export function getState(): UpdaterState {
  return toPublic(state)
}

/** Compare dotted-int versions. Returns >0 if a is newer than b. */
function cmpVersion(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0)
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x - y
  }
  return 0
}

interface ReleaseAsset {
  name: string
  browser_download_url: string
}

interface ReleaseResponse {
  tag_name: string
  body?: string
  assets?: ReleaseAsset[]
}

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = net.request({ method: 'GET', url, redirect: 'follow' })
    req.setHeader('User-Agent', `Bonsai/${app.getVersion()}`)
    req.setHeader('Accept', 'application/vnd.github+json')
    const chunks: Buffer[] = []
    req.on('response', (res) => {
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        if (!res.statusCode || res.statusCode >= 400) {
          const err = new Error(`HTTP ${res.statusCode}`) as Error & { status?: number }
          err.status = res.statusCode
          return reject(err)
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T)
        } catch (e) {
          reject(e as Error)
        }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

/** Pick the right `.zip` asset for the running arch (arm64 vs x64). */
function pickAsset(assets: ReleaseAsset[]): ReleaseAsset | null {
  const zips = assets.filter((a) => a.name.toLowerCase().endsWith('.zip'))
  const archHint = process.arch === 'arm64' ? 'arm64' : 'x64'
  // Prefer arch-specific build, then the generic mac zip, then any zip.
  return (
    zips.find((a) => a.name.includes(archHint)) ??
    zips.find((a) => /-mac\.zip$/i.test(a.name)) ??
    zips[0] ??
    null
  )
}

function downloadTo(url: string, dest: string, onProgress: (frac: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const req = net.request({ method: 'GET', url, redirect: 'follow' })
    req.setHeader('User-Agent', `Bonsai/${app.getVersion()}`)
    req.on('response', (res) => {
      if (!res.statusCode || res.statusCode >= 400) {
        file.destroy()
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`))
      }
      const lenHeader = res.headers['content-length']
      const total = parseInt(
        Array.isArray(lenHeader) ? lenHeader[0] : String(lenHeader ?? '0'),
        10,
      )
      let received = 0
      res.on('data', (c) => {
        received += c.length
        file.write(c)
        if (total > 0) onProgress(received / total)
      })
      res.on('end', () => file.end(() => resolve()))
      res.on('error', (e: Error) => {
        file.destroy()
        reject(e)
      })
    })
    req.on('error', reject)
    req.end()
  })
}

/** Walk up from the executable to find the enclosing `.app` bundle. */
function findAppBundle(): string | null {
  let p = process.execPath
  while (p && p !== '/' && !p.endsWith('.app')) p = path.dirname(p)
  return p.endsWith('.app') ? p : null
}

export async function checkForUpdates(opts: { silent?: boolean } = {}): Promise<void> {
  if (!app.isPackaged) {
    if (!opts.silent) setState({ kind: 'error', message: 'Updates disabled in dev mode.' })
    else console.log('[updater] skipped: dev mode')
    return
  }
  if (process.platform !== 'darwin') {
    if (!opts.silent) setState({ kind: 'error', message: 'Auto-update only supported on macOS.' })
    return
  }
  if (state.kind === 'checking' || state.kind === 'downloading') return
  setState({ kind: 'checking' })
  try {
    const body = await fetchJson<ReleaseResponse>(LATEST_URL)
    const latest = body.tag_name.replace(/^v/, '')
    console.log(`[updater] latest=${latest} current=${app.getVersion()}`)
    if (cmpVersion(latest, app.getVersion()) <= 0) {
      setState({ kind: 'uptodate' })
      return
    }
    const asset = pickAsset(body.assets ?? [])
    if (!asset) {
      const msg = `Release ${latest} has no .zip asset for ${process.arch}.`
      if (opts.silent) {
        console.warn(`[updater] ${msg}`)
        setState({ kind: 'idle' })
      } else {
        setState({ kind: 'error', message: msg })
      }
      return
    }
    console.log(`[updater] new release available v${latest} (${asset.name})`)
    setState({
      kind: 'available',
      info: { version: latest, notes: body.body ?? '', url: asset.browser_download_url },
    })
  } catch (e) {
    const err = e as Error & { status?: number }
    // 404 from GitHub means "no releases published yet" — perfectly fine for a
    // fresh repo, not an error worth alarming the user about.
    if (err.status === 404) {
      console.log('[updater] no releases published yet — treating as up-to-date')
      setState({ kind: 'uptodate' })
      return
    }
    // Silent background checks should never surface transient network errors
    // (offline, rate-limited, DNS flake). Log and return to idle.
    if (opts.silent) {
      console.warn(`[updater] silent check failed: ${err.message}`)
      setState({ kind: 'idle' })
      return
    }
    setState({ kind: 'error', message: err.message })
  }
}

async function downloadCurrent(): Promise<void> {
  if (state.kind !== 'available') return
  const info = state.info
  const dest = path.join(app.getPath('temp'), `bonsai-update-${info.version}.zip`)
  setState({ kind: 'downloading', info, progress: 0 })
  try {
    let lastBroadcast = 0
    await downloadTo(info.url, dest, (frac) => {
      // Throttle broadcasts to ~1% steps to avoid IPC flood.
      if (state.kind !== 'downloading') return
      if (frac - lastBroadcast >= 0.01 || frac >= 1) {
        lastBroadcast = frac
        setState({ kind: 'downloading', info, progress: frac })
      }
    })
    setState({ kind: 'ready', info, downloadedPath: dest })
  } catch (e) {
    setState({ kind: 'error', message: (e as Error).message })
  }
}

function relaunchViaHelper(zipPath: string, bundle: string, version: string): Error | null {
  const helperPath = path.join(app.getPath('temp'), `bonsai-installer-${version}.sh`)
  const logPath = path.join(app.getPath('temp'), `bonsai-installer-${version}.log`)
  const pid = process.pid
  // The helper waits for our process to exit, replaces the .app bundle from
  // the unzipped contents, strips the quarantine xattr, then `open`s the new
  // bundle. Logs go to /tmp/bonsai-installer-VERSION.log for debugging.
  const script = `#!/bin/bash
set -e
exec >> "${logPath}" 2>&1
echo "[bonsai-update] start $(date)"
for i in $(seq 1 60); do
  if ! kill -0 ${pid} 2>/dev/null; then break; fi
  sleep 0.5
done
WORK="$(mktemp -d -t bonsai-update)"
echo "[bonsai-update] unzip ${zipPath} -> $WORK"
/usr/bin/unzip -q "${zipPath}" -d "$WORK"
NEW_APP="$(find "$WORK" -maxdepth 3 -type d -name '*.app' -print -quit)"
if [ -z "$NEW_APP" ]; then echo "[bonsai-update] no .app inside zip"; exit 1; fi
echo "[bonsai-update] new=$NEW_APP target=${bundle}"
/bin/rm -rf "${bundle}"
/bin/mv "$NEW_APP" "${bundle}"
/usr/bin/xattr -dr com.apple.quarantine "${bundle}" || true
/bin/rm -rf "$WORK" "${zipPath}"
/usr/bin/open "${bundle}"
echo "[bonsai-update] done"
`
  try {
    fs.writeFileSync(helperPath, script, { mode: 0o755 })
    const child = spawn('/bin/bash', [helperPath], { detached: true, stdio: 'ignore' })
    child.unref()
    return null
  } catch (e) {
    return e as Error
  }
}

/**
 * Renderer entry point: downloads if needed, then runs the in-place swap and
 * quits. The detached helper relaunches us once the process is gone.
 */
export async function installUpdate(): Promise<void> {
  if (state.kind === 'available') {
    await downloadCurrent()
  }
  if (state.kind !== 'ready') return
  const bundle = findAppBundle()
  if (!bundle) {
    setState({ kind: 'error', message: 'Cannot locate installed app bundle.' })
    return
  }
  const { downloadedPath, info } = state
  const err = relaunchViaHelper(downloadedPath, bundle, info.version)
  if (err) {
    setState({ kind: 'error', message: err.message })
    return
  }
  // Give the helper a beat to spawn before we exit.
  setTimeout(() => app.quit(), 200)
}

/** Silent background check shortly after launch. */
export function scheduleStartupCheck(delayMs = 4000): void {
  setTimeout(() => {
    void checkForUpdates({ silent: true })
  }, delayMs)
}
