import type {
  ParetoPoint,
  RankedSite,
  Site,
  SiteMetrics,
  WeightKey,
  Weights,
} from '@/types'

export const DEFAULT_WEIGHTS: Weights = {
  sunlight: 0.35,
  comm: 0.3,
  flux: 0.15,
  slope: 0.2,
}

export const WEIGHT_PRESETS: { id: string; label: string; hint: string; weights: Weights }[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    hint: 'Default screening mix',
    weights: { ...DEFAULT_WEIGHTS },
  },
  {
    id: 'power',
    label: 'Power first',
    hint: 'Maximise sunlight and flux',
    weights: { sunlight: 0.55, comm: 0.15, flux: 0.25, slope: 0.05 },
  },
  {
    id: 'comms',
    label: 'Comms first',
    hint: 'Keep Earth in view',
    weights: { sunlight: 0.15, comm: 0.6, flux: 0.1, slope: 0.15 },
  },
  {
    id: 'terrain',
    label: 'Terrain safe',
    hint: 'Favour gentle, open ground',
    weights: { sunlight: 0.25, comm: 0.25, flux: 0.1, slope: 0.4 },
  },
]

export const WEIGHT_META: Record<WeightKey, { label: string; short: string; hint: string }> = {
  sunlight: {
    label: 'Sunlight',
    short: 'Sun',
    hint: 'Fraction of the scenario window with the solar disk above the terrain horizon.',
  },
  comm: {
    label: 'Earth visibility',
    short: 'Earth',
    hint: 'Fraction of the scenario window with the Earth disk above the terrain horizon.',
  },
  flux: {
    label: 'Solar flux',
    short: 'Flux',
    hint: 'Mean sin(Sun elevation) while lit, a proxy for available solar power.',
  },
  slope: {
    label: 'Terrain',
    short: 'Terrain',
    hint: 'Local 1 km slope. Lower is better, so this is a cost criterion.',
  },
}

export function normalizeWeights(w: Weights): Weights {
  const total = w.sunlight + w.comm + w.flux + w.slope
  if (total <= 0) return { ...DEFAULT_WEIGHTS }
  return {
    sunlight: w.sunlight / total,
    comm: w.comm / total,
    flux: w.flux / total,
    slope: w.slope / total,
  }
}

interface Row {
  site: Site
  metrics: SiteMetrics
  raw: [number, number, number, number]
}

/**
 * Transparent TOPSIS ranking.
 * Criteria order: sunlight %, Earth visibility %, mean solar flux, slope (cost).
 */
export function rankSites(
  sites: Site[],
  metricsById: Map<string, SiteMetrics>,
  weightsInput: Weights,
): RankedSite[] {
  const weights = normalizeWeights(weightsInput)
  const w = [weights.sunlight, weights.comm, weights.flux, weights.slope]

  const rows: Row[] = sites
    .map((site) => {
      const metrics = metricsById.get(site.id)
      if (!metrics) return null
      return {
        site,
        metrics,
        raw: [metrics.sunlightPct, metrics.earthPct, metrics.fluxMean * 100, site.slopeDeg] as [
          number,
          number,
          number,
          number,
        ],
      }
    })
    .filter((r): r is Row => r !== null)

  if (rows.length === 0) return []

  const norms = [0, 0, 0, 0].map((_, j) =>
    Math.sqrt(rows.reduce((sum, r) => sum + r.raw[j] * r.raw[j], 0)) || 1,
  )

  const weighted = rows.map((r) => r.raw.map((v, j) => (v / norms[j]) * w[j]))
  const best = [0, 1, 2, 3].map((j) =>
    j === 3 ? Math.min(...weighted.map((v) => v[j])) : Math.max(...weighted.map((v) => v[j])),
  )
  const worst = [0, 1, 2, 3].map((j) =>
    j === 3 ? Math.max(...weighted.map((v) => v[j])) : Math.min(...weighted.map((v) => v[j])),
  )

  const ranked = rows.map((r, i) => {
    const dBest = Math.hypot(...weighted[i].map((v, j) => v - best[j]))
    const dWorst = Math.hypot(...weighted[i].map((v, j) => v - worst[j]))
    const closeness = dBest + dWorst === 0 ? 0.5 : dWorst / (dBest + dWorst)
    return {
      site: r.site,
      metrics: r.metrics,
      score: closeness * 100,
      rank: 0,
      criteria: {
        sunlight: r.raw[0],
        comm: r.raw[1],
        flux: r.raw[2],
        slope: r.raw[3],
      },
      idealDistance: dBest,
      worstDistance: dWorst,
    }
  })

  ranked.sort((a, b) => b.score - a.score)
  ranked.forEach((r, i) => {
    r.rank = i + 1
  })
  return ranked
}

/** Non-dominated sites in the sunlight / Earth-visibility plane. */
export function paretoFrontier(
  sites: Site[],
  metricsById: Map<string, SiteMetrics>,
): ParetoPoint[] {
  const points: ParetoPoint[] = sites
    .map((site) => {
      const metrics = metricsById.get(site.id)
      if (!metrics) return null
      return { site, metrics, onFrontier: false }
    })
    .filter((p): p is ParetoPoint => p !== null)

  for (const p of points) {
    p.onFrontier = !points.some(
      (q) =>
        q !== p &&
        q.metrics.sunlightPct >= p.metrics.sunlightPct &&
        q.metrics.earthPct >= p.metrics.earthPct &&
        (q.metrics.sunlightPct > p.metrics.sunlightPct ||
          q.metrics.earthPct > p.metrics.earthPct),
    )
  }
  return points
}
