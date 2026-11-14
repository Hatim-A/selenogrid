import { lazy, Suspense, useState } from 'react'
import { Check, Crosshair, Globe2, Info, Loader2, Map, MapPin, MapPinPlus, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtCoord, fmtPct } from '@/lib/format'
import { atlasPosition } from '@/lib/data'
import { atlasPctToLatLon } from '@/lib/polarDem'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/ui/Reveal'
import type { Site, SiteMetrics } from '@/types'

const MoonGlobe = lazy(() =>
  import('@/components/viz/MoonGlobe').then((module) => ({ default: module.MoonGlobe })),
)

const CLASS_LABEL: Record<Site['terrainClass'], string> = {
  massif: 'Massif',
  rim: 'Rim',
  ridge: 'Ridge',
  plain: 'Plain',
  psr: 'Permanently shadowed',
}

const RINGS = [85, 88, 89.5]
function ringRadius(latAbs: number): number {
  const colat = 90 - latAbs
  const edge = Math.tan((10 * Math.PI) / 180 / 2)
  return 50 * (Math.tan((colat * Math.PI) / 180 / 2) / edge)
}

function AtlasPointRow({
  site,
  metric,
  selected,
  hovered,
  onHover,
  onOpen,
  onAdd,
}: {
  site: Site
  metric?: SiteMetrics
  selected: boolean
  hovered: boolean
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
  onAdd: (id: string) => void
}) {
  return (
    <div
      onMouseEnter={() => onHover(site.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'group flex w-full items-center gap-1 rounded-xl px-1 py-0.5 transition-colors duration-150 motion-reduce:transition-none',
        hovered ? 'bg-secondary/80' : 'hover:bg-secondary/50',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(site.id)}
        aria-label={`Open analysis for ${site.name}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span
          className="size-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
          style={{ backgroundColor: site.color }}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate text-[12px] font-medium tracking-[-0.01em]">
              {site.shortName}
            </span>
            <span className="shrink-0 font-mono text-[9px] tracking-wide text-muted-foreground">
              {CLASS_LABEL[site.terrainClass]}
            </span>
          </span>
          <span className="tabular mt-0.5 block font-mono text-[9.5px] text-muted-foreground">
            {fmtCoord(site.lat, site.lon)}
          </span>
        </span>
        {metric && (
          <span className="tabular flex shrink-0 items-center gap-2.5 font-mono text-[10px]">
            <span className="text-sun">{fmtPct(metric.sunlightPct)}</span>
            <span className="text-earth">{fmtPct(metric.earthPct)}</span>
          </span>
        )}
      </button>
      {selected ? (
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-success"
          title="Already in the comparison"
          aria-label="Already in comparison"
        >
          <Check className="size-3.5" />
        </span>
      ) : (
        <button
          type="button"
          aria-label={`Add ${site.shortName} to comparison`}
          onClick={() => onAdd(site.id)}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/55 transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
          title="Add to comparison"
        >
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function AtlasView({
  sites,
  metricsById,
  selectedIds,
  theme,
  focusId,
  scenarioStartIso,
  onOpen,
  onAdd,
  onCustomOpen,
  onCustomCoord,
}: {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  selectedIds: string[]
  theme: 'light' | 'dark'
  focusId?: string | null
  scenarioStartIso: string
  onOpen: (id: string) => void
  onAdd: (id: string) => void
  onCustomOpen: () => void
  onCustomCoord: (lat: number, lon: number) => void
}) {
  const [mode, setMode] = useState<'globe' | 'map'>('globe')
  const [pinMode, setPinMode] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(focusId ?? null)
  const [imageOk, setImageOk] = useState(true)
  const hovered = sites.find((s) => s.id === hoverId)
  const inView = sites.filter((s) => selectedIds.includes(s.id)).length
  const handleCustomCoord = (lat: number, lon: number) => {
    setPinMode(false)
    onCustomCoord(lat, lon)
  }
  const customSites = sites.filter((site) => site.tags.includes('Custom coordinate'))
  const curatedSites = sites.filter((site) => !site.tags.includes('Custom coordinate'))
  const groups = [
    {
      id: 'nasa',
      label: 'NASA candidate regions',
      sites: curatedSites.filter((site) => site.kind === 'nasa'),
    },
    {
      id: 'reference',
      label: 'Reference sites',
      sites: curatedSites.filter(
        (site) => site.kind === 'reference' && site.terrainClass !== 'psr',
      ),
    },
    {
      id: 'psr',
      label: 'PSR / volatile benchmarks',
      sites: curatedSites.filter(
        (site) => site.kind === 'reference' && site.terrainClass === 'psr',
      ),
    },
    { id: 'custom', label: 'Your custom pins', sites: customSites },
  ].filter((group) => group.sites.length > 0)

  return (
    <div className="space-y-5">
      {/* Editorial header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Atlas · South pole
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[30px] leading-[1.02] tracking-[-0.02em] text-balance sm:text-[36px]">
              South-pole globe and atlas
            </h1>
            <Badge variant="earth" className="gap-1">
              <Globe2 className="size-2.5" />
              Interactive 3D
            </Badge>
          </div>
          <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-pretty text-muted-foreground">
            {pinMode
              ? 'Pin mode is on. Click anywhere south of 80.15°S on the globe or map to sample a custom LOLA point.'
              : mode === 'globe'
                ? `${sites.length} curated points on a real lunar globe. Drag to rotate, scroll to zoom, and click a marker to open its analysis.`
                : `The south-polar LOLA hillshade with the same ${sites.length} points. The globe gives global context; the atlas gives the polar terrain detail.`}
          </p>
        </div>

        {/* One calm toolbar: view switch + pin actions */}
        <div
          role="toolbar"
          aria-label="Atlas view and pin controls"
          className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card/60 p-1 shadow-[var(--shadow-card)] sm:rounded-full"
        >
          <div
            role="group"
            aria-label="View mode"
            className="inline-flex rounded-full bg-secondary/50 p-0.5"
          >
            {(
              [
                ['globe', '3D Moon', Globe2],
                ['map', '2D Atlas', Map],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-mono text-[9.5px] font-medium tracking-[0.08em] uppercase transition-colors duration-150 motion-reduce:transition-none',
                  mode === id
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
          <Button
            variant={pinMode ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => setPinMode((value) => !value)}
            aria-pressed={pinMode}
          >
            <Crosshair className="size-3.5" aria-hidden />
            {pinMode ? 'Pin mode on' : 'Pin mode'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => {
              setPinMode(false)
              onCustomOpen()
            }}
          >
            <MapPinPlus className="size-3.5" aria-hidden />
            Custom point
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        {mode === 'globe' ? (
          <Reveal className="min-w-0">
            <section aria-label="3D Moon globe" className="min-w-0">
              <Suspense
                fallback={
                  <div className="flex aspect-square flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_center,#171c26,#06070a)] text-white/60">
                    <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
                    <div className="font-mono text-[10px] tracking-[0.18em]">
                      LOADING THE MOON
                    </div>
                    <div className="text-[10.5px] text-white/35">
                      NASA LROC color map · 2K texture
                    </div>
                  </div>
                }
              >
                <MoonGlobe
                  sites={sites}
                  metricsById={metricsById}
                  selectedIds={selectedIds}
                  hoverId={hoverId}
                  focusId={focusId}
                  scenarioStartIso={scenarioStartIso}
                  pinMode={pinMode}
                  theme={theme}
                  onHover={setHoverId}
                  onOpen={onOpen}
                  onPickCoord={handleCustomCoord}
                />
              </Suspense>
              <p className="mt-2 flex items-center justify-between font-mono text-[9px] tracking-wide text-muted-foreground">
                <span>LOLA 80 m base · 20 m curated · 640 m custom</span>
                <span className="tabular">{sites.length} sites</span>
              </p>
            </section>
          </Reveal>
        ) : (
          <Reveal className="min-w-0">
            <section
              aria-label="2D south-polar atlas"
              className="overflow-hidden rounded-2xl border border-border bg-[#08090c] shadow-[var(--shadow-card)]"
            >
              <div
                className="relative aspect-square w-full select-none"
                onClick={(event) => {
                  if (!pinMode) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  const xPct = ((event.clientX - rect.left) / rect.width) * 100
                  const yPct = ((event.clientY - rect.top) / rect.height) * 100
                  const coord = atlasPctToLatLon(xPct, yPct)
                  if (coord) handleCustomCoord(coord.lat, coord.lon)
                }}
                style={{ cursor: pinMode ? 'crosshair' : undefined }}
              >
                {imageOk ? (
                  <img
                    src={`${import.meta.env.BASE_URL}data/${
                      theme === 'dark' ? 'atlas.webp' : 'atlas-light.webp'
                    }`}
                    alt="LOLA south polar hillshade centered on the lunar south pole"
                    className="absolute inset-0 size-full object-cover"
                    onError={() => setImageOk(false)}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#1b2029,#08090c)] text-[10.5px] text-white/50">
                    Atlas image pending
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.32))]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

                <svg
                  viewBox="0 0 100 100"
                  aria-hidden
                  className="pointer-events-none absolute inset-0 size-full text-white/70"
                >
                  {RINGS.map((lat) => (
                    <g key={lat}>
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius(lat)}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.16"
                        strokeDasharray="0.5 1.2"
                        strokeWidth="0.16"
                      />
                      <text
                        x="50"
                        y={50 - ringRadius(lat) - 0.7}
                        textAnchor="middle"
                        fontSize="1.5"
                        fill="currentColor"
                        fillOpacity="0.55"
                        fontFamily="var(--font-mono)"
                      >
                        {lat}°S
                      </text>
                    </g>
                  ))}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => (
                    <line
                      key={az}
                      x1={50 + 49.2 * Math.sin((az * Math.PI) / 180)}
                      y1={50 - 49.2 * Math.cos((az * Math.PI) / 180)}
                      x2={50 + 49.2 * Math.sin(((az + 180) * Math.PI) / 180)}
                      y2={50 - 49.2 * Math.cos(((az + 180) * Math.PI) / 180)}
                      stroke="currentColor"
                      strokeOpacity="0.09"
                      strokeWidth="0.13"
                      strokeDasharray="0.4 1.4"
                    />
                  ))}
                  {[
                    ['0°', 50, 2.8],
                    ['90°E', 97, 50],
                    ['180°', 50, 98],
                    ['270°E', 3.1, 50],
                  ].map(([label, x, y]) => (
                    <text
                      key={label as string}
                      x={x as number}
                      y={y as number}
                      textAnchor="middle"
                      fontSize="1.5"
                      fill="currentColor"
                      fillOpacity="0.55"
                      fontFamily="var(--font-mono)"
                    >
                      {label}
                    </text>
                  ))}
                  <circle cx="50" cy="50" r="0.5" fill="currentColor" fillOpacity="0.55" />
                </svg>

                {sites.map((site) => {
                  const pos = atlasPosition(site)
                  const selected = selectedIds.includes(site.id)
                  const isHover = site.id === hoverId
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (pinMode) handleCustomCoord(site.lat, site.lon)
                        else onOpen(site.id)
                      }}
                      onMouseEnter={() => setHoverId(site.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onFocus={() => setHoverId(site.id)}
                      onBlur={() => setHoverId(null)}
                      aria-label={`${site.name}, ${fmtCoord(site.lat, site.lon)}`}
                      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 outline-none focus-visible:ring-2 focus-visible:ring-white"
                      style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
                    >
                      <span
                        className={cn(
                          'block rounded-full border transition-transform duration-150 motion-reduce:transition-none',
                          selected
                            ? 'size-3.5 border-white'
                            : 'size-2.5 border-white/55',
                          isHover && 'scale-125',
                        )}
                        style={{
                          backgroundColor: site.color,
                          boxShadow: selected
                            ? `0 0 0 3px color-mix(in srgb, ${site.color} 35%, transparent)`
                            : undefined,
                        }}
                      />
                    </button>
                  )
                })}

                {hovered && (
                  <div
                    className="pointer-events-none absolute z-20 w-44 rounded-xl border border-white/12 bg-[#0d0f14]/94 p-2.5 text-white shadow-xl backdrop-blur-md"
                    style={{
                      left: `${Math.min(70, Math.max(2, atlasPosition(hovered).xPct + 2))}%`,
                      top: `${Math.min(78, Math.max(2, atlasPosition(hovered).yPct - 8))}%`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em]">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: hovered.color }}
                      />
                      <span className="truncate">{hovered.shortName}</span>
                    </div>
                    <div className="tabular mt-0.5 font-mono text-[8px] tracking-wide text-white/50">
                      {fmtCoord(hovered.lat, hovered.lon)}
                    </div>
                    <div className="tabular mt-1.5 flex gap-3 border-t border-white/10 pt-1.5 font-mono text-[9px]">
                      <span className="text-[var(--sun)]">
                        ☀ {fmtPct(metricsById.get(hovered.id)?.sunlightPct ?? 0)}
                      </span>
                      <span className="text-[var(--earth)]">
                        ◉ {fmtPct(metricsById.get(hovered.id)?.earthPct ?? 0)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pointer-events-none absolute top-3 left-3.5 font-mono text-[9px] font-medium tracking-[0.16em] text-white/50">
                  POLAR STEREOGRAPHIC · 0°E UP
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3.5 flex items-center gap-1.5">
                  <span className="h-px w-14 bg-white/60" />
                  <span className="font-mono text-[9px] text-white/60">100 km</span>
                </div>
                <div className="tabular pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/55 px-2 py-1 font-mono text-[8px] tracking-wide text-white/55 backdrop-blur">
                  {sites.length} sites · NASA + refs
                </div>
                {pinMode && (
                  <div className="pointer-events-none absolute top-3 right-3 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 font-mono text-[9px] tracking-wide text-white/85 backdrop-blur">
                    CLICK TO PIN · SOUTH OF 80.15°S
                  </div>
                )}
              </div>
            </section>
          </Reveal>
        )}

        <div className="flex min-w-0 flex-col gap-3">
          <Reveal delay={60}>
            <section
              aria-label="Curated points"
              className="rounded-2xl border border-border bg-card/55 p-3.5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <div>
                  <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
                    Curated points
                  </h2>
                  <p className="tabular mt-0.5 text-[10.5px] text-muted-foreground">
                    {inView} in comparison · hover to locate · click to analyze
                  </p>
                </div>
                <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
              </div>
              <div className="mt-2 space-y-1 pr-1">
                {groups.map((group, index) => (
                  <div key={group.id}>
                    <div
                      className={cn(
                        'flex items-center justify-between gap-2 px-1 pt-1 pb-1.5',
                        index > 0 && 'mt-2 border-t border-border/60 pt-2.5',
                      )}
                    >
                      <span className="font-mono text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                        {group.label}
                      </span>
                      <span className="tabular rounded-full bg-secondary px-1.5 py-px font-mono text-[9px] text-muted-foreground">
                        {group.sites.length}
                      </span>
                    </div>
                    {group.sites.map((site) => (
                      <AtlasPointRow
                        key={site.id}
                        site={site}
                        metric={metricsById.get(site.id)}
                        selected={selectedIds.includes(site.id)}
                        hovered={site.id === hoverId}
                        onHover={setHoverId}
                        onOpen={onOpen}
                        onAdd={onAdd}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal delay={120}>
            <details className="group rounded-2xl border border-border bg-card/55 shadow-[var(--shadow-card)]">
              <summary className="flex cursor-pointer list-none items-center gap-2 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <Info
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-[11px] font-semibold">
                  {mode === 'globe' ? 'How to read the globe' : 'How to read the map'}
                </span>
                <span className="ml-auto font-mono text-[9px] tracking-wide text-muted-foreground group-open:hidden">
                  SHOW +
                </span>
                <span className="ml-auto hidden font-mono text-[9px] tracking-wide text-muted-foreground group-open:inline">
                  HIDE −
                </span>
              </summary>
              <div className="px-4 pb-4">
                {mode === 'globe' ? (
                  <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <p>
                      Drag to rotate and scroll or pinch to zoom. A white ring marks a site
                      that is in the current comparison; click any marker for its full
                      analysis.
                    </p>
                    <p>
                      The surface texture is NASA&apos;s CGI Moon Kit (LROC WAC color
                      map), provided for global context. Curated sites use the 20 m LOLA
                      model; custom pins are sampled live from a 640 m browser grid. Turn
                      on <strong className="font-medium text-foreground/80">Pin mode</strong> and
                      click the globe, or use <strong className="font-medium text-foreground/80">Custom point</strong> to
                      type coordinates.
                    </p>
                    <p className="text-muted-foreground/75">
                      Markers are representative terrain points, not official landing
                      ellipses. The globe is a locator, not a hazard map.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <p>
                      The pole is at the center. Longitude 0° points up; 90°E points
                      right. Dashed rings mark 85°S, 88°S and 89.5°S.
                    </p>
                    <p>
                      Large markers with a white ring are in the current comparison.
                      Hover for the scenario&apos;s sunlight and Earth-visibility
                      percentages; click to open the full analysis.
                    </p>
                    <p className="text-muted-foreground/75">
                      Base hillshade: LOLA 80 m south polar DEM. Analysis horizons: 20 m
                      DEM. Dark patches are terrain shadows in the rendered lighting, not
                      permanently shadowed regions.
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
                  {(['massif', 'rim', 'ridge', 'plain', 'psr'] as const).map((c) => (
                    <Badge key={c} variant="outline">
                      {CLASS_LABEL[c]}
                    </Badge>
                  ))}
                </div>
              </div>
            </details>
          </Reveal>

          <p className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
            NASA has not published official region centers or ellipses. Marker positions
            are representative terrain points chosen from LOLA topography for comparative
            analysis.
          </p>
        </div>
      </div>
    </div>
  )
}
