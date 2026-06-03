import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Rebuild node-pty against the installed Electron version. Failures are
// non-fatal — devs without Electron installed (e.g. CI lint jobs) still get a
// working tree.
// Invoke the @electron/rebuild CLI via the current node binary. Avoids
// PATH/shim differences between POSIX and Windows and sidesteps the shell:true
// deprecation warning.
const cli = join('node_modules', '@electron', 'rebuild', 'lib', 'cli.js')
const rebuild = existsSync(cli)
  ? spawnSync(process.execPath, [cli, '-f', '-w', 'node-pty'], { stdio: 'inherit' })
  : { status: -1 }
if (rebuild.status !== 0) {
  console.warn('[postinstall] electron-rebuild skipped or failed (continuing)')
}

// node-pty's macOS prebuilds ship a `spawn-helper` binary that must be
// executable. iCloud Drive (and some tarball extractors) strip the +x bit,
// causing `posix_spawnp failed` at runtime. Restore it on every install.
for (const arch of ['darwin-arm64', 'darwin-x64']) {
  const helper = join('node_modules', 'node-pty', 'prebuilds', arch, 'spawn-helper')
  if (existsSync(helper)) {
    try {
      chmodSync(helper, 0o755)
    } catch (err) {
      console.warn(`[postinstall] could not chmod ${helper}:`, err.message)
    }
  }
}
