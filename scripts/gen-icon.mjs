// Rasterize build/icon.svg -> build/icon.png (1024px) for electron-builder,
// which derives the mac .icns / win .ico from it. Run: npm run gen:icon
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'build', 'icon.svg'))
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } }).render().asPng()
writeFileSync(join(root, 'build', 'icon.png'), png)
console.log('wrote build/icon.png (1024x1024)')
