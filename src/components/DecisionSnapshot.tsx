import { ArrowUpRight, Mountain, Radio, Sun, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RankedSite, Site, SiteMetrics } from '@/types'

export function DecisionSnapshot({
  ranked,
  sites,
  metricsById,
  onOpen,
}: {
  ranked: RankedSite[]
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  onOpen: (id: string) => void
}) {
  if (ranked.length === 0) return null

  const candidates = sites
    .map((site) => ({ site, metrics: metricsById.get(site.id) }))
    .filter((x): x is { site: Site; metrics: SiteMetrics } => Boolean(x.metrics))

  const mostSun = candidates.reduce((a, b) =>
    b.metrics.sunlightPct > a.metrics.sunlightPct ? b : a,
  )
  const mostEarth = candidates.reduce((a, b) =>
    b.metrics.earthPct > a.metrics.earthPct ? b : a,
  )
  const gentlest = candidates.reduce((a, b) => (b.site.slopeDeg < a.site.slopeDeg ? b : a))

  const items = [
    {
      label: 'Best overall',
      site: ranked[0].site,
      value: ranked[0].score.toFixed(1),
      unit: 'score',
      sub: 'TOPSIS · current weights',
      icon: Trophy,
      accent: 'var(--foreground)',
      featured: true,
    },
    {
      label: 'Most sunlight',
      site: mostSun.site,
      value: fmtPct(mostSun.metrics.sunlightPct),
      unit: '',
      sub: 'of the mission window',
      icon: Sun,
      accent: 'var(--sun)',
    },
    {
      label: 'Best Earth link',
      site: mostEarth.site,
      value: fmtPct(mostEarth.metrics.earthPct),
      unit: '',
      sub: 'direct-to-Earth visibility',
      icon: Radio,
      accent: 'var(--earth)',
    },
    {
      label: 'Gentlest terrain',
      site: gentlest.site,
      value: `${gentlest.site.slopeDeg.toFixed(1)}°`,
      unit: '',
      sub: '1 km local slope',
      icon: Mountain,
      accent: 'var(--terrain)',
    },
  ]

  return (
    <section aria-labelledby="snapshot-heading">
      <div className="mb-2.5 flex items-end justify-between gap-2">
        <div>
          <h2 id="snapshot-heading" className="text-[13px] font-semibold">
            Decision snapshot
          </h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            What the current scenario is telling you, before the tables.
          </p>
        </div>
        <Badge variant="outline" className="hidden font-mono sm:inline-flex">
          {ranked.length} sites evaluated
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onOpen(item.site.id)}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/15',
                item.featured && 'bg-gradient-to-br from-card to-secondary/60',
              )}
            >
              <div
                className="absolute inset-y-0 left-0 w-[2px]"
                style={{ backgroundColor: item.accent, opacity: 0.85 }}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.08em] text-muted-foreground uppercase">
                  <Icon className="size-3" style={{ color: item.accent }} />
                  {item.label}
                </span>
                <ArrowUpRight className="size-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className="tabular text-[21px] font-semibold leading-none tracking-[-0.04em]"
                  style={{ color: item.accent }}
                >
                  {item.value}
                </span>
                {item.unit && (
                  <span className="font-mono text-[9px] text-muted-foreground">{item.unit}</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.site.color }}
                />
                <span className="truncate text-[10.5px] font-medium">{item.site.shortName}</span>
              </div>
              <div className="mt-0.5 truncate text-[9px] text-muted-foreground">{item.sub}</div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
