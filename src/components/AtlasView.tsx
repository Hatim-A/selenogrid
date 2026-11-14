import { lazy, Suspense, useState } from 'react'
import { Check, Globe2, Info, Loader2, Map, MapPin, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fmtCoord, fmtPct } from '@/lib/format'
import { atlasPosition } from '@/lib/data'
import { cn } from '@/lib/utils'
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

export function AtlasView({
  sites,
  metricsById,
  selectedIds,
  theme,
  focusId,
  onOpen,
  onAdd,
}: {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  selectedIds: string[]
  theme: 'light' | 'dark'
  focusId?: string | null
  onOpen: (id: string) => void
  onAdd: (id: string) => void
}) {
  const [mode, setMode] = useState<'globe' | 'map'>('globe')
  const [hoverId, setHoverId] = useState<string | null>(focusId ?? null)
  const [imageOk, setImageOk] = useState(true)
  const hovered = sites.find((s) => s.id === hoverId)
  const inView = sites.filter((s) => selectedIds.includes(s.id)).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-[-0.035em]">Moon explorer</h1>
            <Badge variant="earth" className="gap-1">
              <Globe2 className="size-2.5" />
              Interactive 3D
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-muted-foreground">
            {mode === 'globe'
              ? 'All twelve curated points on a real lunar globe. Drag to rotate, scroll to zoom, and click a marker to open its analysis. Use the 2D atlas for the south-polar hillshade.'
              : 'The south-polar LOLA hillshade with the same twelve points. The globe gives global context; the atlas gives the polar terrain detail.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-full border border-border bg-card/60 p-0.5">
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
                  'inline-flex h-6 items-center gap-1 rounded-full px-2.5 font-mono text-[8.5px] font-medium tracking-wide uppercase transition-colors',
                  mode === id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-2.5" />
                {label}
              </button>
            ))}
          </div>
          <Badge variant="outline">LOLA · 80 m base</Badge>
          <Badge variant="outline">20 m analysis</Badge>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        {mode === 'globe' ? (
          <section className="min-w-0">
            <Suspense
              fallback={
                <div className="flex aspect-square flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_center,#171c26,#06070a)] text-white/60">
                  <Loader2 className="size-5 animate-spin" />
                  <div className="font-mono text-[9px] tracking-wide">LOADING THE MOON…</div>
                  <div className="text-[10px] text-white/35">NASA LROC color map · 2K texture</div>
                </div>
              }
            >
              <MoonGlobe
                sites={sites}
                metricsById={metricsById}
                selectedIds={selectedIds}
                hoverId={hoverId}
                theme={theme}
                onHover={setHoverId}
                onOpen={onOpen}
              />
            </Suspense>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-[#08090c] shadow-[var(--shadow-card)]">
            <div className="relative aspect-square w-full select-none">
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
                <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#1b2029,#08090c)] text-[10px] text-white/50">
                  Atlas image pending
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.28))]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/35" />

              <svg
                viewBox="0 0 100 100"
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
                      strokeOpacity="0.14"
                      strokeDasharray="0.5 1.2"
                      strokeWidth="0.16"
                    />
                    <text
                      x="50"
                      y={50 - ringRadius(lat) - 0.6}
                      textAnchor="middle"
                      fontSize="1.5"
                      fill="currentColor"
                      fillOpacity="0.5"
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
                    strokeOpacity="0.08"
                    strokeWidth="0.13"
                    strokeDasharray="0.4 1.4"
                  />
                ))}
                {[
                  ['0°', 50, 2.6],
                  ['90°E', 97.2, 50],
                  ['180°', 50, 98.2],
                  ['270°E', 2.9, 50],
                ].map(([label, x, y]) => (
                  <text
                    key={label as string}
                    x={x as number}
                    y={y as number}
                    textAnchor="middle"
                    fontSize="1.5"
                    fill="currentColor"
                    fillOpacity="0.5"
                    fontFamily="var(--font-mono)"
                  >
                    {label}
                  </text>
                ))}
                <circle cx="50" cy="50" r="0.5" fill="currentColor" fillOpacity="0.5" />
              </svg>

              {sites.map((site) => {
                const pos = atlasPosition(site)
                const selected = selectedIds.includes(site.id)
                const isHover = site.id === hoverId
                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => onOpen(site.id)}
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
                        'block rounded-full border transition-all duration-200',
                        selected ? 'size-3.5 border-white' : 'size-2.5 border-white/55',
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
                  className="pointer-events-none absolute z-20 w-40 rounded-lg border border-white/15 bg-[#0d0f14]/92 p-2.5 text-white shadow-xl backdrop-blur"
                  style={{
                    left: `${Math.min(72, Math.max(2, atlasPosition(hovered).xPct + 2))}%`,
                    top: `${Math.min(80, Math.max(2, atlasPosition(hovered).yPct - 8))}%`,
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[9.5px] font-semibold">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: hovered.color }}
                    />
                    {hovered.shortName}
                  </div>
                  <div className="mt-0.5 font-mono text-[7.5px] text-white/50">
                    {fmtCoord(hovered.lat, hovered.lon)}
                  </div>
                  <div className="mt-1.5 flex gap-2 font-mono text-[8px]">
                    <span className="text-[var(--sun)]">
                      ☀ {fmtPct(metricsById.get(hovered.id)?.sunlightPct ?? 0)}
                    </span>
                    <span className="text-[var(--earth)]">
                      ◉ {fmtPct(metricsById.get(hovered.id)?.earthPct ?? 0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute top-2.5 left-3 font-mono text-[8px] tracking-wide text-white/45">
                POLAR STEREOGRAPHIC · 0°E UP
              </div>
              <div className="pointer-events-none absolute bottom-2.5 left-3 flex items-center gap-1.5">
                <span className="h-px w-[16.4%] bg-white/60" />
                <span className="font-mono text-[8px] text-white/60">100 km</span>
              </div>
              <div className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-full bg-black/50 px-2 py-1 font-mono text-[7.5px] text-white/50 backdrop-blur">
                {sites.length} sites · NASA + refs
              </div>
            </div>
          </section>
        )}

        <div className="flex min-w-0 flex-col gap-3">
          <section className="rounded-2xl border border-border bg-card/55 p-3.5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <div className="text-[12px] font-semibold">Curated points</div>
                <div className="text-[10px] text-muted-foreground">
                  {inView} in comparison · hover to locate · click to analyze
                </div>
              </div>
              <MapPin className="size-3.5 text-muted-foreground" />
            </div>
            <div className="mt-2 space-y-0.5 pr-1">
              {sites.map((site) => {
                const m = metricsById.get(site.id)
                const inComparison = selectedIds.includes(site.id)
                return (
                  <div
                    key={site.id}
                    onMouseEnter={() => setHoverId(site.id)}
                    onMouseLeave={() => setHoverId(null)}
                    className={cn(
                      'group flex w-full items-center gap-1 rounded-lg px-1 py-0.5 transition-colors',
                      site.id === hoverId ? 'bg-secondary/80' : 'hover:bg-secondary/50',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(site.id)}
                      aria-label={`Open analysis for ${site.name}`}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: site.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[11.5px] font-medium">
                            {site.shortName}
                          </span>
                          <span className="font-mono text-[8px] text-muted-foreground">
                            {CLASS_LABEL[site.terrainClass]}
                          </span>
                        </span>
                        <span className="block font-mono text-[8.5px] text-muted-foreground">
                          {fmtCoord(site.lat, site.lon)}
                        </span>
                      </span>
                      {m && (
                        <span className="flex shrink-0 items-center gap-2 font-mono text-[9px]">
                          <span className="text-sun">{fmtPct(m.sunlightPct)}</span>
                          <span className="text-earth">{fmtPct(m.earthPct)}</span>
                        </span>
                      )}
                    </button>
                    {inComparison ? (
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
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/55 transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        title="Add to comparison"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <Info className="size-3.5 text-muted-foreground" />
              <div className="text-[10.5px] font-semibold">
                {mode === 'globe' ? 'How to read the globe' : 'How to read the map'}
              </div>
            </div>
            {mode === 'globe' ? (
              <div className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed text-muted-foreground">
                <p>
                  Drag to rotate and scroll or pinch to zoom. A white ring marks a site that is in
                  the current comparison; click any marker for its full analysis.
                </p>
                <p>
                  The surface texture is NASA&apos;s CGI Moon Kit (LROC WAC color map), provided for
                  global context. All sunlight, Earth-link, horizon and slope values still come
                  from the 20 m LOLA terrain model.
                </p>
                <p className="text-muted-foreground/75">
                  Markers are representative terrain points, not official landing ellipses. The
                  globe is a locator, not a hazard map.
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed text-muted-foreground">
                <p>
                  The pole is at the center. Longitude 0° points up; 90°E points right. Dashed rings
                  mark 85°S, 88°S and 89.5°S.
                </p>
                <p>
                  Large markers with a white ring are in the current comparison. Hover for the
                  scenario&apos;s sunlight and Earth-visibility percentages; click to open the full
                  analysis.
                </p>
                <p className="text-muted-foreground/75">
                  Base hillshade: LOLA 80 m south polar DEM. Analysis horizons: 20 m DEM. Dark
                  patches are terrain shadows in the rendered lighting, not permanently shadowed
                  regions.
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
          </section>

          <div className="rounded-xl border border-dashed border-border px-3 py-2 text-[8.5px] leading-relaxed text-muted-foreground">
            NASA has not published official region centers or ellipses. Marker positions are
            representative terrain points chosen from LOLA topography for comparative analysis.
          </div>
        </div>
      </div>
    </div>
  )
}
