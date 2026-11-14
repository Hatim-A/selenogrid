import type { Site, SiteDataset } from '@/types'

let datasetPromise: Promise<SiteDataset> | null = null

export function loadSiteDataset(): Promise<SiteDataset> {
  if (!datasetPromise) {
    datasetPromise = fetch(`${import.meta.env.BASE_URL}data/sites.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load site data (${r.status})`)
      return r.json() as Promise<SiteDataset>
    })
  }
  return datasetPromise
}

export function siteMap(dataset: SiteDataset): Map<string, Site> {
  return new Map(dataset.sites.map((s) => [s.id, s]))
}

/**
 * Position of a site on the 7600x7600 / 80 m south-polar DEM tile, as CSS
 * percentages. Matches the LOLA polar stereographic projection exactly.
 */
export function atlasPosition(site: Site): { xPct: number; yPct: number } {
  const R = 1_737_400
  const pix = 80
  const n = 7600
  const off = (n - 1) / 2
  const r = 2 * R * Math.tan((((site.lat + 90) * Math.PI) / 180) / 2)
  const x = r * Math.sin((site.lon * Math.PI) / 180)
  const y = r * Math.cos((site.lon * Math.PI) / 180)
  const col = off + x / pix
  const row = off - y / pix
  return { xPct: (col / (n - 1)) * 100, yPct: (row / (n - 1)) * 100 }
}
