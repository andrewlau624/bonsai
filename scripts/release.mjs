#!/usr/bin/env node
// Cuts a release: bumps version in package.json, creates a git tag, pushes.
// The `Release` GitHub Action picks it up from there, builds the mac DMG +
// ZIP, and uploads them as assets on a new GitHub Release. Installed copies
// of Bonsai poll `/releases/latest` on launch and swap in the new build.
//
//   npm run release patch   # 0.1.0 -> 0.1.1
//   npm run release minor   # 0.1.0 -> 0.2.0
//   npm run release major   # 0.1.0 -> 1.0.0
import { execSync } from 'node:child_process'

const bump = process.argv[2]
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: npm run release <patch|minor|major>')
  process.exit(1)
}

const status = execSync('git status --porcelain').toString().trim()
if (status) {
  console.error('Working tree not clean. Commit or stash first.')
  console.error(status)
  process.exit(1)
}

const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
if (branch !== 'main') {
  console.error(`Refusing to release from "${branch}". Switch to main first.`)
  process.exit(1)
}

// `npm version` bumps package.json, commits, and creates the matching `vX.Y.Z`
// tag. We push both at once so the Action picks up the tag.
execSync(`npm version ${bump}`, { stdio: 'inherit' })
execSync('git push --follow-tags', { stdio: 'inherit' })

console.log('\nRelease pushed. Build status:')
console.log('  https://github.com/andrewlau624/bonsai/actions')
