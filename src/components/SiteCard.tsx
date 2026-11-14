import { ArrowUpRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { HorizonPanorama } from '@/components/viz/HorizonPanorama'
import { fmtDateTimeUtc, fmtElevation, fmtHours, fmtPct } from '@/lib/format'
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

function kindMeta(site: Site) {
  if (site.tags.includes('Custom coordinate'))
    return {
      label: 'Custom',
      title:
        'Custom coordinate sampled on the 640 m LOLA grid. Screening resolution, not flight certification.',
    }
  if (site.kind === 'nasa')
    return {
      label: 'NASA',
      title:
        'NASA Artemis candidate region announced 28 Oct 2024. Representative coordinates, not an official landing ellipse.',
    }
  if (site.terrainClass === 'psr')
    return {
      label: 'PSR',
      title: 'Permanently shadowed region benchmark, a volatile and lighting reference site.',
    }
  return {
    label: 'Ref',
    title: 'Reference site from the literature, science or terrain benchmark set.',
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
  const kind = kindMeta(site)
  const sunTitle =
    sunEvent.value === null
      ? `No ${sunEvent.label.toLowerCase()} inside this window`
      : `Next ${sunEvent.label.toLowerCase()} at ${fmtDateTimeUtc(sunEvent.value)} UTC`
  const earthTitle =
    earthEvent.value === null
      ? `No ${earthEvent.label.toLowerCase()} inside this window`
      : `Next ${earthEvent.label.toLowerCase()} at ${fmtDateTimeUtc(earthEvent.value)} UTC`

  return (
    <article
      className={cn(
        'group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[var(--shadow-card)] transition-all duration-300',
        'hover:-translate-y-1 active:translate-y-0 active:scale-[0.99]',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${site.color} 38%, transparent)`
        e.currentTarget.style.boxShadow = `0 0 0 1px color-mix(in srgb, ${site.color} 26%, transparent), 0 22px 55px -26px color-mix(in srgb, ${site.color} 55%, transparent)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = ''
        e.currentTarget.style.boxShadow = ''
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${site.color} 38%, transparent)`
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = ''
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open analysis for ${site.name}`}
    >
      <div
        aria-hidden
        className="absolute inset-x-6 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${site.color}, transparent)` }}
      />

      <div className="flex items-start gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase"
            title={site.region}
          >
            {site.region}
          </p>
          <div className="mt-1.5 flex items-start gap-2.5">
            {ranked && (
              <span
                className="font-display shrink-0 text-[32px] leading-[0.9] text-foreground/85 italic tabular"
                title={`Rank #${ranked.rank} of the current weighted fit (score ${ranked.score.toFixed(1)} of 100)`}
              >
                {String(ranked.rank).padStart(2, '0')}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold tracking-[-0.02em]">
                {site.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <Badge
                  variant={site.kind === 'nasa' ? 'earth' : 'outline'}
                  className="px-1.5 py-0 text-[8.5px] font-semibold tracking-[0.08em] uppercase"
                  title={kind.title}
                >
                  {kind.label}
                </Badge>
                {ranked && (
                  <span
                    className="font-mono text-[8.5px] tracking-wide text-muted-foreground"
                    title="Relative TOPSIS fit score under the current weights, from 0 to 100. Not a probability or a mission recommendation."
                  >
                    fit {ranked.score.toFixed(1)} / 100
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Remove ${site.name} from comparison`}
            title={`Remove ${site.name} from comparison`}
            className="ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
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
          samples={metrics.samples}
        />
        <div className="pointer-events-none absolute top-1.5 left-2 flex items-center gap-1">
          <span
            title={
              sample.sunVisible
                ? 'The Sun is above the local terrain horizon at the window start'
                : 'The Sun is below the local terrain horizon at the window start'
            }
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em] uppercase backdrop-blur',
              sample.sunVisible
                ? 'border-transparent bg-[var(--sun-soft)] text-sun'
                : 'border-border/60 bg-black/25 text-muted-foreground',
            )}
          >
            <span className={cn('size-1 rounded-full', sample.sunVisible ? 'bg-sun' : 'bg-muted-foreground')} />
            Sun {sample.sunVisible ? 'up' : 'down'} @ start
          </span>
          <span
            title={
              sample.earthVisible
                ? 'Earth is above the local terrain horizon at the window start'
                : 'Earth is below the local terrain horizon at the window start'
            }
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em] uppercase backdrop-blur',
              sample.earthVisible
                ? 'border-transparent bg-[var(--earth-soft)] text-earth'
                : 'border-border/60 bg-black/25 text-muted-foreground',
            )}
          >
            <span className={cn('size-1 rounded-full', sample.earthVisible ? 'bg-earth' : 'bg-muted-foreground')} />
            Earth {sample.earthVisible ? 'up' : 'down'} @ start
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3.5">
        <div className="grid grid-cols-2 gap-2">
          <div title="Share of window samples with the Sun above the local terrain horizon">
            <div className="tabular text-[24px] leading-none font-semibold tracking-[-0.04em] text-sun">
              {fmtPct(metrics.sunlightPct)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Sun in view</div>
          </div>
          <div title="Share of window samples with Earth above the local terrain horizon (line of sight, not a link budget)">
            <div className="tabular text-[24px] leading-none font-semibold tracking-[-0.04em] text-earth">
              {fmtPct(metrics.earthPct)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Earth in view</div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5 text-[11px]">
          <div className="flex items-center justify-between gap-2" title={sunTitle}>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-1 rounded-full bg-sun" aria-hidden />
              {sunEvent.label}
            </span>
            <span className="tabular font-medium">{sunEvent.text}</span>
          </div>
          <div className="flex items-center justify-between gap-2" title={earthTitle}>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-1 rounded-full bg-earth" aria-hidden />
              {earthEvent.label}
            </span>
            <span className="tabular font-medium">{earthEvent.text}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2">
            <div
              className="flex items-center justify-between gap-1"
              title="Local LOLA slope at this point: lower is gentler terrain"
            >
              <span className="text-muted-foreground">Slope</span>
              <span className="tabular font-medium">{site.slopeDeg.toFixed(1)}°</span>
            </div>
            <div
              className="flex items-center justify-between gap-1"
              title="LOLA elevation above the lunar reference radius"
            >
              <span className="text-muted-foreground">Elevation</span>
              <span className="tabular font-medium">{fmtElevation(site.elevationM)}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
          <span
            className="truncate font-mono text-[9px] text-muted-foreground"
            title={`Latitude ${site.lat.toFixed(3)}°, longitude ${site.lon.toFixed(3)}°`}
          >
            {site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10.5px] font-medium text-foreground/80 transition group-hover:border-transparent group-hover:bg-foreground group-hover:text-background group-active:scale-95">
            Open analysis
            <ArrowUpRight className="size-3 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </article>
  )
}
