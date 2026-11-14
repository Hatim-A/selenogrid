import { Radio, Sun } from 'lucide-react'
import { fmtPct } from '@/lib/format'
import { normalizeWeights, WEIGHT_META } from '@/lib/or'
import type { RankedSite, Site, SiteMetrics, WeightKey, Weights } from '@/types'

type Candidate = { site: Site; metrics: SiteMetrics }

export function ScenarioVerdict({
  ranked,
  sites,
  metricsById,
  weights,
}: {
  ranked: RankedSite[]
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  weights: Weights
}) {
  if (ranked.length === 0) return null

  const top = ranked[0]
  const runnerUp = ranked.length > 1 ? ranked[1] : null

  // Leader callouts should only consider sites in the current weighted comparison.
  const rankedIds = new Set(ranked.map((entry) => entry.site.id))
  const candidates = sites
    .filter((site) => rankedIds.has(site.id))
    .map((site) => ({ site, metrics: metricsById.get(site.id) }))
    .filter((x): x is Candidate => Boolean(x.metrics))

  const strongestSun = candidates.reduce<Candidate | null>(
    (best, candidate) =>
      !best || candidate.metrics.sunlightPct > best.metrics.sunlightPct ? candidate : best,
    null,
  )
  const strongestEarth = candidates.reduce<Candidate | null>(
    (best, candidate) =>
      !best || candidate.metrics.earthPct > best.metrics.earthPct ? candidate : best,
    null,
  )

  const sunLeader = strongestSun && strongestSun.site.id !== top.site.id ? strongestSun : null
  const earthLeader = strongestEarth && strongestEarth.site.id !== top.site.id ? strongestEarth : null

  const scoreGap = runnerUp ? top.score - runnerUp.score : 0
  const tied = scoreGap < 0.05

  let runnerUpNote = ''
  if (runnerUp) {
    const relation = tied ? 'is level on score' : `is ${scoreGap.toFixed(1)} points behind`
    const topSun = fmtPct(top.metrics.sunlightPct)
    const runnerSun = fmtPct(runnerUp.metrics.sunlightPct)
    const topEarth = fmtPct(top.metrics.earthPct)
    const runnerEarth = fmtPct(runnerUp.metrics.earthPct)
    const topSlope = top.site.slopeDeg.toFixed(1)
    const runnerSlope = runnerUp.site.slopeDeg.toFixed(1)

    let strength: string | null = null
    if (runnerUp.metrics.sunlightPct > top.metrics.sunlightPct && runnerSun !== topSun) {
      strength = `with more sunlight (${runnerSun})`
    } else if (runnerUp.metrics.earthPct > top.metrics.earthPct && runnerEarth !== topEarth) {
      strength = `with Earth in view more often (${runnerEarth})`
    } else if (runnerUp.site.slopeDeg < top.site.slopeDeg && runnerSlope !== topSlope) {
      strength = `with a gentler ${runnerSlope}° slope`
    }

    runnerUpNote = `${relation}${strength ? `${tied ? ',' : ''} ${strength}` : ''}.`
  }

  const normalized = normalizeWeights(weights)
  const weightKeys: WeightKey[] = ['sunlight', 'comm', 'flux', 'slope']
  const weightSummary = weightKeys
    .map((key) => `${WEIGHT_META[key].short} ${fmtPct(normalized[key] * 100)}`)
    .join(' / ')

  return (
    <section
      aria-labelledby="verdict-heading"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/50 p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-earth/40 to-transparent"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2
            id="verdict-heading"
            className="flex items-center gap-1.5 font-mono text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-gradient-to-br from-sun via-earth to-terrain"
            />
            In plain English
          </h2>
          <span className="font-mono text-[8.5px] tracking-[0.08em] text-muted-foreground/75 uppercase">
            TOPSIS · current weights
          </span>
        </div>

        <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed">
          Under the current weights,{' '}
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: top.site.color }}
            />
            <strong className="font-semibold">{top.site.name}</strong>
          </span>{' '}
          is the best overall compromise.
        </p>

        <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
          It keeps the Sun above the horizon{' '}
          <span className="tabular font-medium text-sun">{fmtPct(top.metrics.sunlightPct)}</span> of
          the mission window and Earth in view{' '}
          <span className="tabular font-medium text-earth">{fmtPct(top.metrics.earthPct)}</span> of
          the time, at a{' '}
          <span className="tabular font-medium text-terrain">{top.site.slopeDeg.toFixed(1)}°</span>{' '}
          local slope.
        </p>

        {runnerUp && (
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: runnerUp.site.color }}
              />
              <span className="font-medium text-foreground">{runnerUp.site.name}</span>
            </span>{' '}
            {runnerUpNote}
          </p>
        )}

        {(sunLeader || earthLeader) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {sunLeader && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2 py-1 text-[10px]">
                <Sun aria-hidden className="size-3 text-sun" />
                <span className="text-muted-foreground">Most sunlight</span>
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: sunLeader.site.color }}
                />
                <span className="font-medium">{sunLeader.site.shortName}</span>
                <span className="tabular font-mono text-[9px] font-semibold text-sun">
                  {fmtPct(sunLeader.metrics.sunlightPct)}
                </span>
              </span>
            )}
            {earthLeader && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2 py-1 text-[10px]">
                <Radio aria-hidden className="size-3 text-earth" />
                <span className="text-muted-foreground">Most Earth visibility</span>
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: earthLeader.site.color }}
                />
                <span className="font-medium">{earthLeader.site.shortName}</span>
                <span className="tabular font-mono text-[9px] font-semibold text-earth">
                  {fmtPct(earthLeader.metrics.earthPct)}
                </span>
              </span>
            )}
          </div>
        )}

        <p className="mt-3 max-w-3xl border-t border-border/60 pt-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
          {ranked.length > 1
            ? 'This is a preference-dependent screening result, not a mission decision. Change the weights below to test it.'
            : 'Add a second site to make the relative fit score meaningful. A score of 100 against one site is not evidence of mission fit.'}
        </p>
        <p className="mt-1 font-mono text-[8px] leading-relaxed text-muted-foreground/70">
          Representative points, not official ellipses. Current mix: {weightSummary}.
        </p>
      </div>
    </section>
  )
}
