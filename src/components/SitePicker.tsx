import { useMemo, useState } from 'react'
import { Check, Info, MapPinPlus, Search, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

const isCustomSite = (site: Site) => site.tags.includes('Custom coordinate')

export function SitePicker({
  sites,
  selected,
  onChange,
  onCustom,
}: {
  sites: Site[]
  selected: string[]
  onChange: (ids: string[]) => void
  onCustom?: () => void
}) {
  const [query, setQuery] = useState('')
  const nasa = sites.filter((s) => s.kind === 'nasa')
  const reference = sites.filter((s) => s.kind === 'reference')
  const all = sites.map((s) => s.id)

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (s: Site) =>
      q.length === 0 ||
      s.name.toLowerCase().includes(q) ||
      s.shortName.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q)
    const curated = sites.filter((s) => !isCustomSite(s))
    const defs = [
      {
        id: 'nasa',
        label: 'NASA candidate regions',
        hint: 'Artemis shortlist',
        sites: curated.filter((s) => s.kind === 'nasa'),
      },
      {
        id: 'reference',
        label: 'Reference sites',
        hint: 'Science benchmarks',
        sites: curated.filter((s) => s.kind === 'reference' && s.terrainClass !== 'psr'),
      },
      {
        id: 'psr',
        label: 'PSR · volatile benchmarks',
        hint: 'Shadowed terrain',
        sites: curated.filter((s) => s.kind === 'reference' && s.terrainClass === 'psr'),
      },
      {
        id: 'custom',
        label: 'Custom pins',
        hint: 'Your coordinates',
        sites: sites.filter(isCustomSite),
      },
    ]
    return defs
      .map((g) => ({
        ...g,
        total: g.sites.length,
        picked: g.sites.filter((s) => selected.includes(s.id)).length,
        sites: g.sites.filter(match),
      }))
      .filter((g) => (q ? g.sites.length > 0 : g.id !== 'custom' || g.total > 0))
  }, [sites, selected, query])

  const searching = query.trim().length > 0
  const matchCount = groups.reduce((n, g) => n + g.sites.length, 0)

  return (
    <section
      id="site-picker"
      aria-labelledby="site-picker-heading"
      className="scroll-mt-20 rounded-2xl border border-border bg-card/45 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
            02 · Sites
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 id="site-picker-heading" className="text-[15px] font-semibold tracking-[-0.02em]">
              Sites in comparison
            </h2>
            <Badge variant="outline" className="font-mono" aria-live="polite">
              {selected.length} / {sites.length}
            </Badge>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Nine NASA candidate regions plus nine literature, science and PSR reference sites.
            Coordinates are representative LOLA terrain points, not official landing ellipses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => onChange(nasa.map((s) => s.id))}>
            NASA nine
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange(reference.map((s) => s.id))}>
            References
          </Button>
          <Button variant="outline" size="sm" onClick={() => onChange(all)}>
            All {sites.length}
          </Button>
        </div>
      </div>

      <div className="relative mt-3.5" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="site-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or region…"
          aria-label="Search sites by name or region"
          autoComplete="off"
          className="h-9 w-full rounded-full border border-border bg-background/60 pr-8 pl-9 text-[12.5px] text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {searching && (
        <p className="mt-2 font-mono text-[9.5px] text-muted-foreground" aria-live="polite">
          {matchCount === 0
            ? `No sites match “${query.trim()}”`
            : `${matchCount} of ${sites.length} sites match “${query.trim()}”`}
        </p>
      )}

      <div className="mt-2 space-y-4">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
                {group.label}
                <span className="ml-1.5 text-muted-foreground/60 normal-case">· {group.hint}</span>
              </h3>
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground tabular" aria-live="polite">
                {group.picked}/{group.total} picked
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {group.sites.map((site) => {
                const active = selected.includes(site.id)
                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => toggle(site.id)}
                    aria-pressed={active}
                    title={site.summary}
                    style={
                      active
                        ? {
                            borderColor: 'transparent',
                            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${site.color} 45%, transparent)`,
                          }
                        : undefined
                    }
                    className={cn(
                      'group inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] transition-all',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      'active:scale-[0.97]',
                      active
                        ? 'bg-secondary text-foreground shadow-sm'
                        : 'border-border bg-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn('size-2 shrink-0 rounded-full transition-transform', active && 'scale-110')}
                      style={{ backgroundColor: site.color, opacity: active ? 1 : 0.55 }}
                    />
                    {site.shortName}
                    {active && <Check className="size-3 text-muted-foreground" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {searching && matchCount === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <p className="text-[11.5px] text-muted-foreground">
              Nothing in the library matches that search.
            </p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setQuery('')}>
              Clear search
            </Button>
          </div>
        )}
      </div>

      {onCustom && (
        <button
          type="button"
          onClick={onCustom}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-3.5 py-3 text-left transition hover:border-foreground/25 hover:bg-background/70 active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            <MapPinPlus className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-foreground">
              Plot a custom point
            </span>
            <span className="block truncate text-[10.5px] text-muted-foreground">
              Sample any south-polar LOLA coordinate
            </span>
          </span>
          <span className="shrink-0 font-mono text-[9px] tracking-wide text-muted-foreground">
            + ADD
          </span>
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2.5 text-[9.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-3" />
          NASA candidate regions announced 28 Oct 2024
        </span>
        <span className="inline-flex items-center gap-1">
          <Info className="size-3" />
          Representative coordinates · not flight-certified
        </span>
      </div>
    </section>
  )
}
