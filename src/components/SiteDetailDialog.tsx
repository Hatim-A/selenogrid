import { useState } from 'react'
import {
  ArrowUpRight,
  CalendarClock,
  ExternalLink,
  Mountain,
  Orbit,
  Radio,
  Sun,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HorizonPanorama } from '@/components/viz/HorizonPanorama'
import { Hillshade } from '@/components/viz/Hillshade'
import { TerrainPerspective } from '@/components/viz/TerrainPerspective'
import { RingGauge } from '@/components/viz/RingGauge'
import { SkyPlot } from '@/components/viz/SkyPlot'
import { CriterionBar } from '@/components/viz/CriterionBar'
import { fmtCoord, fmtDateTimeUtc, fmtElevation, fmtHours, fmtPct } from '@/lib/format'
import { normalizeWeights } from '@/lib/or'
import type { RankedSite, Site, SiteMetrics, Weights } from '@/types'

function eventList(metrics: SiteMetrics) {
  const rows = [
    {
      label: metrics.startSunVisible ? 'Next sunset' : 'Next sunrise',
      value: metrics.startSunVisible ? metrics.nextSunset : metrics.nextSunrise,
      icon: Sun,
    },
    {
      label: metrics.startEarthVisible ? 'Next Earthset' : 'Next Earthrise',
      value: metrics.startEarthVisible ? metrics.nextEarthset : metrics.nextEarthrise,
      icon: Radio,
    },
  ]
  return rows.map((r) => ({
    ...r,
    relative:
      r.value === null ? 'Beyond window' : `in ${fmtHours((r.value - metrics.start) / 3_600_000)}`,
    absolute: r.value === null ? '—' : fmtDateTimeUtc(r.value),
  }))
}

export function SiteDetailDialog({
  site,
  metrics,
  ranked,
  weights,
  theme,
  open,
  onOpenChange,
  onTimeline,
  onMoon,
  onAdd,
}: {
  site: Site | null
  metrics: SiteMetrics | null
  ranked: RankedSite | null
  weights: Weights
  theme: 'light' | 'dark'
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimeline: (id: string) => void
  onMoon: (id: string) => void
  onAdd: (id: string) => void
}) {
  const [terrainView, setTerrainView] = useState<'map' | '3d'>('map')
  if (!site || !metrics) return null
  const sample = metrics.samples[0]
  const isCustom = site.tags.includes('Custom coordinate')
  const nw = normalizeWeights(weights)
  const events = eventList(metrics)
  const sunHours = metrics.longestSunHours
  const earthHours = metrics.longestEarthHours
  const visibleTags = site.tags.slice(0, 5)
  const extraTags = site.tags.slice(5)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 p-0 max-sm:top-auto max-sm:bottom-2 max-sm:max-h-[calc(100dvh-1rem)] max-sm:translate-y-0 max-sm:rounded-b-2xl sm:max-h-[calc(100dvh-3rem)]">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/25"
              style={{ backgroundColor: site.color }}
            />
            <DialogTitle className="font-display text-[20px] leading-tight sm:text-[22px]">
              {site.name}
            </DialogTitle>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={site.kind === 'nasa' ? 'earth' : 'outline'}>
              {isCustom
                ? 'Custom · 640 m grid'
                : site.kind === 'nasa'
                  ? 'NASA candidate region'
                  : 'Reference site'}
            </Badge>
            {ranked && <Badge variant="terrain">Rank #{ranked.rank}</Badge>}
          </div>
          <DialogDescription className="tabular mt-1.5 font-mono text-[10.5px]">
            {fmtCoord(site.lat, site.lon)} · {fmtElevation(site.elevationM)} · slope{' '}
            {site.slopeDeg.toFixed(1)}° · {site.terrainClass} terrain
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <section
            aria-label="Terrain horizon panorama"
            className="overflow-hidden rounded-2xl border border-border bg-background/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
              <p className="font-mono text-[9px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                360° terrain horizon · start of window
              </p>
              <div className="flex items-center gap-1.5">
                <Badge variant={sample.sunVisible ? 'sun' : 'outline'}>
                  <Sun aria-hidden /> {sample.sunVisible ? 'Sun visible' : 'Sun hidden'}
                </Badge>
                <Badge variant={sample.earthVisible ? 'earth' : 'outline'}>
                  <Radio aria-hidden />{' '}
                  {sample.earthVisible ? 'Earth visible' : 'Earth hidden'}
                </Badge>
              </div>
            </div>
            <HorizonPanorama
              site={site}
              sunAz={sample.sunAz}
              sunEl={sample.sunEl}
              earthAz={sample.earthAz}
              earthEl={sample.earthEl}
              sunVisible={sample.sunVisible}
              earthVisible={sample.earthVisible}
              samples={metrics.samples}
              timeLabel={fmtDateTimeUtc(metrics.start)}
            />
          </section>

          <div className="mt-4 grid items-start gap-4 md:grid-cols-[1fr_1.15fr]">
            <section
              aria-label="Window statistics"
              className="rounded-2xl border border-border bg-background/30 p-4 sm:p-5"
            >
              <div className="flex items-start justify-around gap-2">
                <RingGauge
                  value={metrics.sunlightPct}
                  label="Sunlight"
                  color="var(--sun)"
                  hint={`${fmtPct(metrics.sunlightPct, 1)} of window`}
                />
                <RingGauge
                  value={metrics.earthPct}
                  label="Earth visibility"
                  color="var(--earth)"
                  hint={`${fmtPct(metrics.earthPct, 1)} of window`}
                />
                <RingGauge
                  value={ranked ? ranked.score : 0}
                  label="TOPSIS"
                  color={ranked ? 'var(--terrain)' : 'var(--muted-foreground)'}
                  hint={ranked ? 'relative score' : 'not in comparison'}
                />
              </div>
              <dl className="tabular mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-3.5 text-[11px]">
                <div>
                  <dt className="text-muted-foreground">Longest sun window</dt>
                  <dd className="mt-0.5 font-medium">{fmtHours(sunHours)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Longest Earth window</dt>
                  <dd className="mt-0.5 font-medium">{fmtHours(earthHours)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Solar flux proxy</dt>
                  <dd className="mt-0.5 font-medium">
                    {(metrics.fluxMean * 100).toFixed(1)} / 100
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Open sky</dt>
                  <dd className="mt-0.5 font-medium">
                    {(site.openSkyFrac * 100).toFixed(1)}%
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-label="Event clock"
              className="rounded-2xl border border-border bg-background/30 p-4 sm:p-5"
            >
              <h3 className="flex items-center gap-2 text-[12.5px] font-semibold tracking-[-0.01em]">
                <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
                Event clock
              </h3>
              <div className="mt-2 divide-y divide-border/60">
                {events.map((e) => {
                  const Icon = e.icon
                  return (
                    <div key={e.label} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Icon className="size-3" aria-hidden />
                        {e.label}
                      </span>
                      <span className="text-right">
                        <span className="tabular block font-mono text-[11px] font-medium">
                          {e.relative}
                        </span>
                        <span className="tabular block font-mono text-[9px] text-muted-foreground">
                          {e.absolute}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-1 border-t border-border/60 pt-2.5 text-[10px] leading-relaxed text-muted-foreground">
                Event times are refined by bisection from the {metrics.stepMs / 3_600_000} h
                sampling grid. Sun and Earth are visible when the upper limb clears the
                terrain.
              </p>
            </section>
          </div>

          <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
            <section
              aria-label="Sky tracks"
              className="rounded-2xl border border-border bg-background/30 p-3.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2 px-1">
                <div>
                  <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">
                    Sky tracks
                  </h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Horizon-to-zenith polar view · full window
                  </p>
                </div>
                <Badge variant="outline" className="font-mono">
                  az / el
                </Badge>
              </div>
              <SkyPlot site={site} metrics={metrics} sample={sample} />
            </section>
            <section
              aria-label="Terrain context"
              className="flex flex-col rounded-2xl border border-border bg-background/30 p-3.5"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">
                    Terrain context
                  </h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    LOLA tile · 12 km across · 60 m/px
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="tabular font-mono">
                    {site.reliefM.toFixed(0)} m relief
                  </Badge>
                  <div
                    role="group"
                    aria-label="Terrain view"
                    className="inline-flex rounded-full border border-border bg-secondary/40 p-0.5"
                  >
                    {(['map', '3d'] as const).map((viewMode) => (
                      <button
                        key={viewMode}
                        type="button"
                        aria-pressed={terrainView === viewMode}
                        onClick={() => setTerrainView(viewMode)}
                        className={
                          terrainView === viewMode
                            ? 'rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[9px] font-medium text-foreground shadow-sm'
                            : 'rounded-full px-2.5 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none'
                        }
                      >
                        {viewMode === 'map' ? 'MAP' : '3D'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {terrainView === 'map' ? (
                <Hillshade site={site} showScale />
              ) : (
                <TerrainPerspective site={site} theme={theme} />
              )}
              <dl className="tabular mt-3 grid grid-cols-2 gap-2 border-t border-border/60 px-1 pt-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mountain className="size-3" aria-hidden />
                  <span>Slope {site.slopeDeg.toFixed(1)}°</span>
                </div>
                <div className="text-right">Aspect {site.aspectDeg.toFixed(0)}°</div>
                <div>
                  Horizon {site.horizonMinDeg.toFixed(1)}° to {site.horizonMaxDeg.toFixed(1)}°
                </div>
                <div className="text-right">
                  Open sky {(site.openSkyFrac * 100).toFixed(0)}%
                </div>
              </dl>
            </section>
          </div>

          {ranked && (
            <section
              aria-label="Ranking rationale"
              className="mt-4 rounded-2xl border border-border bg-background/30 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">
                    Why it ranks #{ranked.rank}
                  </h3>
                  <p className="tabular mt-0.5 text-[10px] text-muted-foreground">
                    TOPSIS closeness {ranked.score.toFixed(1)} / 100 · weights normalised
                  </p>
                </div>
                <p className="tabular font-mono text-[9.5px] text-muted-foreground">
                  D⁺ {ranked.idealDistance.toFixed(3)} · D⁻ {ranked.worstDistance.toFixed(3)}
                </p>
              </div>
              <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                <CriterionBar
                  label="Sunlight"
                  value={ranked.criteria.sunlight}
                  display={fmtPct(ranked.criteria.sunlight)}
                  color="var(--sun)"
                  weight={nw.sunlight}
                />
                <CriterionBar
                  label="Earth visibility"
                  value={ranked.criteria.comm}
                  display={fmtPct(ranked.criteria.comm)}
                  color="var(--earth)"
                  weight={nw.comm}
                />
                <CriterionBar
                  label="Solar flux proxy"
                  value={ranked.criteria.flux}
                  display={`${ranked.criteria.flux.toFixed(1)} / 100`}
                  color="var(--terrain)"
                  weight={nw.flux}
                />
                <CriterionBar
                  label="Local slope"
                  value={ranked.criteria.slope}
                  display={`${ranked.criteria.slope.toFixed(1)}°`}
                  max={25}
                  color="var(--muted-foreground)"
                  weight={nw.slope}
                  cost
                />
              </div>
            </section>
          )}

          <section
            aria-label="About this point"
            className="mt-4 rounded-2xl border border-border bg-background/30 p-4 sm:p-5"
          >
            <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">
              About this point
            </h3>
            <p className="mt-1.5 max-w-prose text-[11.5px] leading-relaxed text-pretty text-muted-foreground">
              {site.summary}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            {extraTags.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-mono text-[9px] tracking-wide text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                  +{extraTags.length} MORE TAGS
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {extraTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </details>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[10px] text-muted-foreground">
              <span className="max-w-prose">{site.source}</span>
              {site.sourceUrl && (
                <a
                  href={site.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md text-earth outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Source <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </div>
            <p className="mt-2 max-w-prose text-[9.5px] leading-relaxed text-muted-foreground/80">
              {isCustom
                ? 'Sampled live in your browser from the 640 m LOLA south-polar grid. Lower resolution than the curated 20 m sites; use it for screening, not landing certification.'
                : 'Representative terrain point selected from LOLA topography. NASA has not published official region centres or landing ellipses; this is not a flight-certified site.'}
            </p>
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card/60 px-5 py-3.5 sm:px-7">
          <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
            {!ranked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAdd(site.id)}
                className="w-full sm:w-auto"
              >
                Add to comparison
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onTimeline(site.id)}
              className="w-full sm:w-auto"
            >
              Open in timeline
              <ArrowUpRight aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMoon(site.id)}
              className="w-full sm:w-auto"
            >
              <Orbit aria-hidden />
              Show on Moon
            </Button>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
