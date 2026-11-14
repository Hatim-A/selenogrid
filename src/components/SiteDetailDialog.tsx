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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: site.color }} />
            <DialogTitle>{site.name}</DialogTitle>
            <Badge variant={site.kind === 'nasa' ? 'earth' : 'outline'}>
              {isCustom ? 'Custom · 640 m grid' : site.kind === 'nasa' ? 'NASA candidate region' : 'Reference site'}
            </Badge>
            {ranked && <Badge variant="terrain">Rank #{ranked.rank}</Badge>}
          </div>
          <DialogDescription>
            {fmtCoord(site.lat, site.lon)} · {fmtElevation(site.elevationM)} · slope{' '}
            {site.slopeDeg.toFixed(1)}° · {site.terrainClass} terrain
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="overflow-hidden rounded-xl border border-border bg-background/40">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2">
              <div className="font-mono text-[8.5px] tracking-[0.1em] text-muted-foreground">
                360° TERRAIN HORIZON · START OF WINDOW
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={sample.sunVisible ? 'sun' : 'outline'}>
                  <Sun /> {sample.sunVisible ? 'Sun visible' : 'Sun hidden'}
                </Badge>
                <Badge variant={sample.earthVisible ? 'earth' : 'outline'}>
                  <Radio /> {sample.earthVisible ? 'Earth visible' : 'Earth hidden'}
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
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.15fr]">
            <div className="rounded-xl border border-border bg-background/30 p-4">
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
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-[10px]">
                <div>
                  <div className="text-muted-foreground">Longest sun window</div>
                  <div className="mt-0.5 font-medium">{fmtHours(sunHours)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Longest Earth window</div>
                  <div className="mt-0.5 font-medium">{fmtHours(earthHours)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Solar flux proxy</div>
                  <div className="mt-0.5 font-medium">
                    {(metrics.fluxMean * 100).toFixed(1)} / 100
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Open sky</div>
                  <div className="mt-0.5 font-medium">{(site.openSkyFrac * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                Event clock
              </div>
              <div className="mt-3 space-y-2.5">
                {events.map((e) => {
                  const Icon = e.icon
                  return (
                    <div key={e.label} className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Icon className="size-3" />
                        {e.label}
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-[10px] font-medium">{e.relative}</span>
                        <span className="block font-mono text-[8px] text-muted-foreground">
                          {e.absolute}
                        </span>
                      </span>
                    </div>
                  )
                })}
                <div className="border-t border-border/60 pt-2 text-[9px] leading-relaxed text-muted-foreground">
                  Event times are refined by bisection from the {metrics.stepMs / 3_600_000} h
                  sampling grid. Sun and Earth are visible when the upper limb clears the terrain.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/30 p-3">
              <div className="mb-1 flex items-center justify-between px-1">
                <div>
                  <div className="text-[11px] font-semibold">Sky tracks</div>
                  <div className="text-[9px] text-muted-foreground">
                    Horizon-to-zenith polar view · full window
                  </div>
                </div>
                <Badge variant="outline" className="font-mono">
                  az / el
                </Badge>
              </div>
              <SkyPlot site={site} metrics={metrics} sample={sample} />
            </div>
            <div className="flex flex-col rounded-xl border border-border bg-background/30 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <div className="text-[11px] font-semibold">Terrain context</div>
                  <div className="text-[9px] text-muted-foreground">
                    LOLA tile · 12 km across · 60 m/px
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono">
                    {site.reliefM.toFixed(0)} m relief
                  </Badge>
                  <div className="inline-flex rounded-full border border-border p-0.5">
                    {(['map', '3d'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={terrainView === mode}
                        onClick={() => setTerrainView(mode)}
                        className={
                          terrainView === mode
                            ? 'rounded-full bg-secondary px-2 py-0.5 font-mono text-[8px] font-medium text-foreground'
                            : 'rounded-full px-2 py-0.5 font-mono text-[8px] text-muted-foreground hover:text-foreground'
                        }
                      >
                        {mode === 'map' ? 'MAP' : '3D'}
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
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mountain className="size-3" />
                  Slope {site.slopeDeg.toFixed(1)}°
                </div>
                <div className="text-right text-muted-foreground">
                  Aspect {site.aspectDeg.toFixed(0)}°
                </div>
                <div className="text-muted-foreground">
                  Horizon {site.horizonMinDeg.toFixed(1)}° to {site.horizonMaxDeg.toFixed(1)}°
                </div>
                <div className="text-right text-muted-foreground">
                  Open sky {(site.openSkyFrac * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {ranked && (
            <div className="mt-4 rounded-xl border border-border bg-background/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold">Why it ranks #{ranked.rank}</div>
                  <div className="text-[9px] text-muted-foreground">
                    TOPSIS closeness {ranked.score.toFixed(1)} / 100 · weights normalised
                  </div>
                </div>
                <div className="font-mono text-[8.5px] text-muted-foreground">
                  D⁺ {ranked.idealDistance.toFixed(3)} · D⁻ {ranked.worstDistance.toFixed(3)}
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
            </div>
          )}

          <div className="mt-4 rounded-xl border border-border bg-background/30 p-4">
            <div className="text-[11px] font-semibold">About this point</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">{site.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {site.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[9px] text-muted-foreground">
              <span>{site.source}</span>
              {site.sourceUrl && (
                <a
                  href={site.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-earth hover:underline"
                >
                  Source <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <p className="mt-2 text-[8.5px] leading-relaxed text-muted-foreground/80">
              {isCustom
                ? 'Sampled live in your browser from the 640 m LOLA south-polar grid. Lower resolution than the curated 20 m sites; use it for screening, not landing certification.'
                : 'Representative terrain point selected from LOLA topography. NASA has not published official region centres or landing ellipses; this is not a flight-certified site.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/60 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {!ranked && (
              <Button variant="outline" size="sm" onClick={() => onAdd(site.id)}>
                Add to comparison
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => onTimeline(site.id)}>
              Open in timeline
              <ArrowUpRight />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMoon(site.id)}>
              <Orbit />
              Show on Moon
            </Button>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
