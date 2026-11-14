import { ArrowUpRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { HorizonPanorama } from '@/components/viz/HorizonPanorama'
import { fmtElevation, fmtHours, fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RankedSite, Site, SiteMetrics } from '@/types'

function nextEvent(metrics: SiteMetrics, kind: 'sun' | 'earth') {
  const isSun = kind === 'sun'
  const visible = isSun ? metrics.startSunVisible : metrics.startEarthVisible
  const value = visible
    ? isSun
      ? metrics.nextSunset
      : metrics.nextEarthset
    : isSun
      ? metrics.nextSunrise
      : metrics.nextEarthrise
  const label = visible ? (isSun ? 'Sunset' : 'Earthset') : isSun ? 'Sunrise' : 'Earthrise'
  return {
    label,
    value,
    text: value === null ? 'None in window' : `in ${fmtHours((value - metrics.start) / 3_600_000)}`,
  }
}

export function SiteCard({
  site,
  metrics,
  ranked,
  onOpen,
  onRemove,
}: {
  site: Site
  metrics: SiteMetrics
  ranked?: RankedSite
  onOpen: () => void
  onRemove?: () => void
}) {
  const sample = metrics.samples[0]
  const sunEvent = nextEvent(metrics, 'sun')
  const earthEvent = nextEvent(metrics, 'earth')

  return (
    <article
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[var(--shadow-card)] transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]',
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open analysis for ${site.name}`}
    >
      <div className="flex items-start gap-2 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {ranked && (
              <span className="inline-flex h-4 items-center rounded-full bg-foreground px-1.5 font-mono text-[8.5px] font-semibold text-background">
                #{ranked.rank}
              </span>
            )}
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: site.color }} />
            <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.015em]">
              {site.name}
            </h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
            <Badge
              variant={site.kind === 'nasa' ? 'earth' : 'outline'}
              className="px-1.5 py-0 text-[8.5px]"
            >
              {site.kind === 'nasa' ? 'NASA' : 'REF'}
            </Badge>
            <span className="truncate">{site.region}</span>
          </div>
        </div>
        {ranked && (
          <div className="text-right">
            <div className="tabular text-[15px] font-semibold leading-none text-foreground">
              {ranked.score.toFixed(1)}
            </div>
            <div
              className="mt-0.5 font-mono text-[8px] tracking-wide text-muted-foreground"
              title="Relative TOPSIS fit score under the current weights, from 0 to 100. Not a probability or mission recommendation."
            >
              fit / 100
            </div>
          </div>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Remove ${site.name} from comparison`}
            className="ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-100 transition hover:bg-secondary hover:text-foreground focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="relative mt-3 border-y border-border/60 bg-background/30">
        <HorizonPanorama
          site={site}
          sunAz={sample.sunAz}
          sunEl={sample.sunEl}
          earthAz={sample.earthAz}
          earthEl={sample.earthEl}
          sunVisible={sample.sunVisible}
          earthVisible={sample.earthVisible}
        />
        <div className="pointer-events-none absolute top-1.5 left-2 flex items-center gap-1">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] backdrop-blur',
              sample.sunVisible
                ? 'bg-[var(--sun-soft)] text-sun'
                : 'bg-black/25 text-muted-foreground',
            )}
          >
            <span className={cn('size-1 rounded-full', sample.sunVisible ? 'bg-sun' : 'bg-muted-foreground')} />
            SUN {sample.sunVisible ? 'UP' : 'DOWN'} @ START
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] backdrop-blur',
              sample.earthVisible
                ? 'bg-[var(--earth-soft)] text-earth'
                : 'bg-black/25 text-muted-foreground',
            )}
          >
            <span className={cn('size-1 rounded-full', sample.earthVisible ? 'bg-earth' : 'bg-muted-foreground')} />
            EARTH {sample.earthVisible ? 'UP' : 'DOWN'} @ START
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="tabular text-[22px] font-semibold leading-none tracking-[-0.04em] text-sun">
              {fmtPct(metrics.sunlightPct)}
            </div>
            <div className="mt-1 text-[10.5px] text-muted-foreground">Sun visible in window</div>
          </div>
          <div>
            <div className="tabular text-[22px] font-semibold leading-none tracking-[-0.04em] text-earth">
              {fmtPct(metrics.earthPct)}
            </div>
            <div className="mt-1 text-[10.5px] text-muted-foreground">Earth visible in window</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border/60 pt-2.5 text-[10px]">
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground">{sunEvent.label}</span>
            <span className="tabular truncate font-medium">{sunEvent.text}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground">{earthEvent.label}</span>
            <span className="tabular truncate font-medium">{earthEvent.text}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground">Slope</span>
            <span className="tabular font-medium">{site.slopeDeg.toFixed(1)}°</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground">Elevation</span>
            <span className="tabular font-medium">{fmtElevation(site.elevationM)}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="truncate font-mono text-[9px] text-muted-foreground">
            {site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground/80 transition group-hover:text-foreground">
            Open analysis
            <ArrowUpRight className="size-3 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </article>
  )
}
