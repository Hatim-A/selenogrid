#!/usr/bin/env node
/**
 * Merge the 20 m LOLA horizon extraction with human-written site metadata.
 *
 *   tools/sites.raw.json   machine output from tools/horizon
 *   tools/sites-meta.json  names, summaries, sources, colours
 *   public/data/sites.json shipped to the browser
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const raw = JSON.parse(readFileSync(resolve(here, 'sites.raw.json'), 'utf8'))
const meta = JSON.parse(readFileSync(resolve(here, 'sites-meta.json'), 'utf8'))

const rawById = new Map(raw.sites.map((s) => [s.id, s]))
const seen = new Set()
const round = (v, n) => Number(v.toFixed(n))

const sites = meta.map((m) => {
  const s = rawById.get(m.id)
  if (!s) throw new Error(`No raw extraction for ${m.id}`)
  seen.add(m.id)

  const horizon = s.horizonDeg.map((v) => round(v, 2))
  const distances = s.horizonDistKm.map((v) => round(v, 1))
  const min = Math.min(...horizon)
  const max = Math.max(...horizon)
  const mean = horizon.reduce((a, b) => a + b, 0) / horizon.length

  return {
    ...m,
    lat: round(s.lat, 5),
    lon: round(s.lon, 5),
    elevationM: round(s.elevationM, 1),
    slopeDeg: round(s.slopeDeg, 2),
    aspectDeg: round(s.aspectDeg, 1),
    openSkyFrac: round(s.openSkyFrac, 4),
    horizonMinDeg: round(min, 2),
    horizonMaxDeg: round(max, 2),
    horizonMeanDeg: round(mean, 2),
    reliefM: round(s.tile.maxM - s.tile.minM, 0),
    horizonDeg: horizon,
    horizonDistKm: distances,
    tile: s.tile,
  }
})

for (const id of rawById.keys()) {
  if (!seen.has(id)) throw new Error(`Raw site ${id} is missing metadata`)
}

const out = {
  generatedAt: new Date().toISOString(),
  dem: {
    product: 'LOLA south polar digital elevation model, 20 m/px',
    resolutionM: 20,
    size: raw.dem.n,
    source: 'NASA / GSFC LOLA (LRO); PDS Geosciences Node, ldem_80s_20m',
    sourceUrl:
      'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/',
    verticalDatum: '1737.4 km reference sphere; 0.5 m DN scaling',
  },
  sites,
}

mkdirSync(resolve(root, 'public/data'), { recursive: true })
const json = JSON.stringify(out)
writeFileSync(resolve(root, 'public/data/sites.json'), json)
console.log(
  `wrote public/data/sites.json — ${sites.length} sites, ${(json.length / 1024).toFixed(0)} KB`,
)
