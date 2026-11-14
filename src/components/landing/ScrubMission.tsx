import { useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useScrub } from '@/hooks/useScrub'
import { fmtDateUtc, fmtHours, fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RankedSite, Site, SiteMetrics } from '@/types'

interface ScrubMissionProps {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  ranked: RankedSite[]
  onOpenSite: (id: string) => void
}

function pad3(n: number): string {
  return String(n).padStart(3, '0')
}

interface HorizonModel {
  d: string
  yAt: (x: number) => number
}

/**
 * Sampled silhouette path + altitude lookup from a site's 360° horizon
 * profile, mapped into a 100×32 viewBox. Flat baseline when data is absent.
 */
function horizonModel(horizon: number[] | undefined): HorizonModel {
  const W = 100
  const H = 32
  const TOP = 7
  const BOT = 27
  if (!horizon || horizon.length === 0) {
    const y = (TOP + BOT) / 2
    return { d: `M0 ${y}L${W} ${y}L${W} ${H}L0 ${H}Z`, yAt: () => y }
  }
  let min = Infinity
  let max = -Infinity
  for (const v of horizon) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = Math.max(0.5, max - min)
  const last = horizon.length - 1
  const yAtIdx = (idx: number) => {
    const v = horizon[Math.min(last, Math.max(0, idx))] ?? min
    return BOT - ((v - min) / span) * (BOT - TOP)
  }
  const n = 110
  let d = ''
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W
    const y = yAtIdx(Math.round((i / n) * last))
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  d += `L${W} ${H}L0 ${H}Z`
  return {
    d,
    yAt: (x: number) => {
      const t = Math.min(1, Math.max(0, x / W))
      return yAtIdx(Math.round(t * last))
    },
  }
}

/**
 * The signature "film" moment: a ~300vh section with a sticky viewport stage
 * scrubbing a REAL 180-day mission for the current #1 ranked site (falling
 * back to the first site that has day-level metrics). Everything on stage —
 * day counter, date, Sun/Earth bars, horizon sun dot — derives from
 * `metrics.days[day]`. Graceful standby panel when no data exists yet.
 */
export function ScrubMission({ sites, metricsById, ranked, onOpenSite }: ScrubMissionProps) {
  const wrapRef = useRef<HTMLElement>(null)

  const first = ranked.length > 0 ? ranked[0] : undefined
  const primarySite = first?.site
  const primaryMetrics = primarySite ? metricsById.get(primarySite.id) : undefined
  const primaryOk = (primaryMetrics?.days.length ?? 0) > 0
  const fallbackSite = sites.find((s) => (metricsById.get(s.id)?.days.length ?? 0) > 0)
  const focusSite: Site | undefined =
    (primaryOk ? primarySite : undefined) ??
    fallbackSite ??
    (sites.length > 0 ? sites[0] : undefined)
  const metrics = focusSite ? metricsById.get(focusSite.id) : undefined
  const days = metrics?.days ?? []

  // Hook stays above the early return so hook order is stable.
  const progress = useScrub(wrapRef)

  if (!focusSite || days.length === 0) {
    return (
      <section
        aria-label="Mission film standby"
        className="relative px-5 py-24 sm:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">The window · scroll to scrub time</p>
          <h2 className="lp-display mt-4 text-3xl text-balance sm:text-4xl">
            Mission film standby
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            The 180-day scrub appears here once trajectory data arrives — pick
            the top-ranked site and scroll to fly its mission day by day.
          </p>
        </div>
      </section>
    )
  }

  const count = days.length
  const dayIndex = Math.min(count - 1, Math.max(0, Math.round(progress * (count - 1))))
  const day = days[dayIndex]
  const sunHours = day.sunHours ?? 0
  const earthHours = day.earthHours ?? 0
  const sunFrac = Math.min(1, Math.max(0, sunHours / 24))
  const earthFrac = Math.min(1, Math.max(0, earthHours / 24))

  const model = horizonModel(focusSite.horizonDeg)
  const dotX = 3 + progress * 94
  const dotY = model.yAt(dotX) - 1.5 - sunFrac * 15

  const seasonSun = metrics ? fmtPct(metrics.sunlightPct, 0) : '—'
  const seasonEarth = metrics ? fmtPct(metrics.earthPct, 0) : '—'

  return (
    <section
      ref={wrapRef}
      aria-label={`180-day mission scrub for ${focusSite.name}`}
      className="lp-scrub-wrap relative"
      style={{ height: '300vh' }}
    >
      <div className="lp-sticky-stage flex items-center">
        <div className="lp-vignette" aria-hidden="true" />
        <div className="lp-grain" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0 bg-gradient-to-r from-sun to-earth"
            />
            <p className="eyebrow">The window · scroll to scrub time</p>
          </div>

          <div className="mt-6 grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            {/* Left: giant day counter + mission identity */}
            <div className="min-w-0">
              <div key={dayIndex} className="lp-day-tick">
                <p className="lp-display lp-day-giant tabular">
                  Day {pad3(dayIndex + 1)}
                </p>
              </div>
              <p className="mt-3 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase tabular">
                {fmtDateUtc(day.t)} · Day {dayIndex + 1} of {count}
              </p>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{focusSite.name}</span>
                {' · '}
                {focusSite.region}
                {primaryOk && first && ranked.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    · Ranked #1 of {ranked.length}
                  </span>
                )}
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Season mean · Sun {seasonSun} · Earth {seasonEarth}
              </p>
              <button
                type="button"
                onClick={() => onOpenSite(focusSite.id)}
                className={cn(
                  'press mt-6 inline-flex items-center gap-1.5 rounded-full border px-4 py-2',
                  'text-xs font-medium tracking-wide text-foreground',
                  'border-[var(--border-strong)] bg-transparent',
                  'transition-colors duration-300 hover:border-current',
                )}
              >
                Open {focusSite.shortName} analysis
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Right: per-day bars + horizon panorama */}
            <div className="min-w-0">
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span className="font-mono tracking-[0.14em] text-muted-foreground uppercase">
                      Sunlight
                    </span>
                    <span className="font-medium text-sun tabular">
                      {fmtHours(sunHours)}
                    </span>
                  </div>
                  <div className="lp-scrub-track">
                    <div
                      className="lp-scrub-fill lp-fill-sun"
                      style={{ transform: `scaleX(${sunFrac})` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span className="font-mono tracking-[0.14em] text-muted-foreground uppercase">
                      Earth contact
                    </span>
                    <span className="font-medium text-earth tabular">
                      {fmtHours(earthHours)}
                    </span>
                  </div>
                  <div className="lp-scrub-track">
                    <div
                      className="lp-scrub-fill lp-fill-earth"
                      style={{ transform: `scaleX(${earthFrac})` }}
                    />
                  </div>
                </div>
              </div>

              <figure className="mt-5 overflow-hidden rounded-xl border hairline">
                <svg
                  viewBox="0 0 100 32"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Horizon silhouette for ${focusSite.name}, mission day ${dayIndex + 1}`}
                  className="block aspect-[25/8] w-full"
                >
                  <path d={model.d} className="lp-ridge" />
                  <circle cx={dotX} cy={dotY} r={2.4} className="lp-sun-dot" />
                </svg>
                <figcaption className="flex items-center justify-between border-t px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase hairline">
                  <span>Horizon · {focusSite.shortName}</span>
                  <span className="tabular">
                    Day 001 – {pad3(count)}
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>

        {/* Mission scrub rail */}
        <div className="absolute inset-x-0 bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div
              className="lp-scrub-track"
              role="progressbar"
              aria-label="Mission day scrub"
              aria-valuemin={1}
              aria-valuemax={count}
              aria-valuenow={dayIndex + 1}
              aria-valuetext={`Day ${dayIndex + 1} of ${count}`}
            >
              <div
                className="lp-scrub-fill"
                style={{ transform: `scaleX(${progress})` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScrubMission
