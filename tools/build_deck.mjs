// Inlines screenshots into the standalone submission deck so the published
// copy (public/deck.html) is a single public file with no external assets.
// Source: docs/deck/index.html. Run: node tools/build_deck.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const src = readFileSync('docs/deck/index.html', 'utf8')
const html = src.replace(/src="(\.\.\/screenshots\/[^"]+)"/g, (_m, rel) => {
  const file = join('docs/screenshots', basename(rel))
  const b64 = readFileSync(file).toString('base64')
  return `src="data:image/webp;base64,${b64}"`
})
writeFileSync('public/deck.html', html)
console.log(`public/deck.html written (${(html.length / 1024 / 1024).toFixed(2)} MB)`)
