import { useCallback, useId, useRef } from 'react'
import { Crown, MoonStar } from 'lucide-react'
import { atlasPosition } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

function ringRadius(latAbs: number): number {
  const colat = 90 - latAbs
  const edge = Math.tan((10 * Math.PI) / 180 / 2)
  return 50 * (Math.tan((colat * Math.PI) / 180 / 2) / edge)
}

function canTilt(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return false
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function HeroMoon({
  sites,
  selectedIds,
  topSiteId,
  theme,
  onOpen,
}: {
  sites: Site[]
  selectedIds: string[]
  topSiteId?: string
  theme: 'light' | 'dark'
  onOpen: (id: string) => void
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const isDark = theme === 'dark'
  const selectedCount = sites.filter((site) => selectedIds.includes(site.id)).length
  const topSite = sites.find((site) => site.id === topSiteId) ?? null
  const tiltRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((event: React.PointerEvent) => {
    const el = tiltRef.current
    if (!el || event.pointerType === 'touch' || !canTilt()) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(1000px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`
  }, [])

  const handleLeave = useCallback(() => {
    const el = tiltRef.current
    if (!el) return
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  }, [])

  return (
    <div
      className="relative mx-auto aspect-square w-full select-none"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div
        ref={tiltRef}
        className="absolute inset-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out will-change-transform"
      >
        <div
          aria-hidden
          className="orbit-breathe absolute inset-[12%] rounded-full bg-[var(--earth)]/10 blur-3xl"
        />
        <div
          aria-hidden
          className="orbit-slow absolute inset-[0.5%] rounded-full border border-dashed border-foreground/10"
        >
          <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-earth/80" />
        </div>
        <div
          aria-hidden
          className="orbit-reverse absolute inset-[-3.5%] rounded-full border border-dashed border-earth/15"
        >
          <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-sun/70" />
        </div>
        <div className="absolute inset-[6.5%] overflow-hidden rounded-full border border-border/80 bg-[#08090c] shadow-[0_40px_110px_-40px_rgba(0,0,0,0.8)]">
          <img
            src={`${import.meta.env.BASE_URL}data/${
              theme === 'dark' ? 'hero-moon.webp' : 'hero-moon-light.webp'
            }`}
            alt="LOLA south-polar hillshade with the curated lunar sites"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_32%,transparent_32%,rgba(0,0,0,0.5)_100%)]" />

          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
            <defs>
              <radialGradient id={`hero-edge-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="78%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.68)" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="49.8" fill={`url(#hero-edge-${uid})`} />
            {[85, 88, 89.5].map((lat) => (
              <circle
                key={lat}
                cx="50"
                cy="50"
                r={ringRadius(lat)}
                fill="none"
                stroke={isDark ? 'white' : 'rgba(0,0,0,0.65)'}
                strokeOpacity="0.2"
                strokeDasharray="0.5 1.2"
                strokeWidth="0.16"
              />
            ))}
            {[0, 90, 180, 270].map((az) => (
              <line
                key={az}
                x1={50 + 49 * Math.sin((az * Math.PI) / 180)}
                y1={50 - 49 * Math.cos((az * Math.PI) / 180)}
                x2={50 + 49 * Math.sin(((az + 180) * Math.PI) / 180)}
                y2={50 - 49 * Math.cos(((az + 180) * Math.PI) / 180)}
                stroke={isDark ? 'white' : 'rgba(0,0,0,0.5)'}
                strokeOpacity="0.09"
                strokeWidth="0.12"
              />
            ))}
            <circle
              cx="50"
              cy="50"
              r="0.55"
              fill={isDark ? 'white' : 'rgba(0,0,0,0.6)'}
              fillOpacity="0.55"
            />
          </svg>

          {sites.map((site) => {
            const pos = atlasPosition(site)
            const selected = selectedIds.includes(site.id)
            const isTop = site.id === topSiteId
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => onOpen(site.id)}
                aria-label={`Open ${site.name}`}
                title={site.name}
                className="absolute z-10 min-h-[32px] min-w-[32px] -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring grid place-items-center"
                style={{ left: `${7 + pos.xPct * 0.86}%`, top: `${7 + pos.yPct * 0.86}%` }}
              >
                <span
                  className={cn(
                    'block rounded-full border transition-transform duration-200 hover:scale-125',
                    isTop
                      ? isDark
                        ? 'size-3 border-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)]'
                        : 'size-3 border-black/70 shadow-[0_0_0_3px_rgba(0,0,0,0.18)]'
                      : selected
                        ? isDark
                          ? 'size-2.5 border-white/90'
                          : 'size-2.5 border-black/70'
                        : isDark
                          ? 'size-[7px] border-white/50 opacity-80'
                          : 'size-[7px] border-black/50 opacity-80',
                  )}
                  style={{
                    backgroundColor: site.color,
                    boxShadow: isTop
                      ? `0 0 0 5px color-mix(in srgb, ${site.color} 28%, transparent), 0 0 18px 2px color-mix(in srgb, ${site.color} 55%, transparent)`
                      : undefined,
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>

      {topSite && (
        <button
          type="button"
          onClick={() => onOpen(topSite.id)}
          className="absolute top-0 left-1/2 z-20 flex max-w-[220px] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/85 py-1.5 pr-3 pl-2 shadow-[var(--shadow-card)] backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="grid size-5 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: topSite.color }}
          >
            <Crown className="size-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
          </span>
          <span className="text-left leading-none">
            <span className="block font-mono text-[7px] tracking-[0.16em] text-muted-foreground uppercase">
              Top ranked
            </span>
            <span className="mt-0.5 block max-w-[140px] truncate text-[11.5px] font-semibold tracking-[-0.01em]">
              {topSite.name}
            </span>
          </span>
        </button>
      )}

      <div className="absolute top-[16%] -right-1 z-20 hidden rounded-2xl border border-border bg-card/90 px-3 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-md min-[480px]:block">
        <div className="font-mono text-[7px] tracking-[0.14em] text-muted-foreground uppercase">
          Terrain horizon
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="tabular font-display text-[17px] leading-none tracking-[-0.02em]">
            1,440
          </span>
          <span className="font-mono text-[8px] text-muted-foreground">bins/site</span>
        </div>
      </div>

      <div className="absolute top-[46%] -left-1 z-20 hidden rounded-2xl border border-border bg-card/90 px-3 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-md min-[480px]:block">
        <div className="font-mono text-[7px] tracking-[0.14em] text-muted-foreground uppercase">
          Elevation
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="tabular font-display text-[17px] leading-none tracking-[-0.02em]">
            20 m
          </span>
          <span className="font-mono text-[8px] text-muted-foreground">LOLA grid</span>
        </div>
      </div>

      <div className="absolute top-1/2 left-0 hidden -translate-y-1/2 -rotate-90 font-mono text-[8px] tracking-[0.18em] text-muted-foreground/55 uppercase xl:block">
        South polar stereographic
      </div>

      {sites.length > 0 && (
        <div className="absolute bottom-[1%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/85 px-3.5 py-2 shadow-[var(--shadow-card)] backdrop-blur-md">
          <MoonStar className="size-3 shrink-0 text-earth" />
          <span className="tabular font-mono text-[8.5px] tracking-wide whitespace-nowrap text-muted-foreground">
            {sites.length} sites · {selectedCount} in comparison
          </span>
        </div>
      )}
    </div>
  )
}
