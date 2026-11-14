import { useId } from 'react'
import { MoonStar } from 'lucide-react'
import { atlasPosition } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

function ringRadius(latAbs: number): number {
  const colat = 90 - latAbs
  const edge = Math.tan((10 * Math.PI) / 180 / 2)
  return 50 * (Math.tan((colat * Math.PI) / 180 / 2) / edge)
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

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[430px] select-none">
      <div
        aria-hidden
        className="orbit-breathe absolute inset-[13%] rounded-full bg-[var(--earth)]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="orbit-slow absolute inset-[1%] rounded-full border border-dashed border-foreground/10"
      >
        <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-earth/80" />
      </div>
      <div
        aria-hidden
        className="orbit-reverse absolute inset-[-3%] rounded-full border border-dashed border-earth/12"
      >
        <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-sun/70" />
      </div>
      <div className="absolute inset-[7%] overflow-hidden rounded-full border border-border/80 bg-[#08090c] shadow-[0_35px_100px_-35px_rgba(0,0,0,0.8)]">
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
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: `${7 + pos.xPct * 0.86}%`, top: `${7 + pos.yPct * 0.86}%` }}
            >
              {isTop && (
                <span className="absolute inset-0 animate-ping rounded-full border border-white/30" />
              )}
              <span
                className={cn(
                  'block rounded-full border transition-transform duration-200 hover:scale-125',
                  selected
                    ? isDark
                      ? 'size-2.5 border-white'
                      : 'size-2.5 border-black/70'
                    : isDark
                      ? 'size-1.5 border-white/40'
                      : 'size-1.5 border-black/40',
                  isTop && (isDark ? 'ring-2 ring-white/40' : 'ring-2 ring-black/30'),
                )}
                style={{
                  backgroundColor: site.color,
                  boxShadow: isTop ? `0 0 0 4px color-mix(in srgb, ${site.color} 30%, transparent)` : undefined,
                }}
              />
            </button>
          )
        })}

      </div>

      <div className="absolute top-1/2 left-0 hidden -translate-y-1/2 -rotate-90 font-mono text-[8px] tracking-[0.18em] text-muted-foreground/55 uppercase sm:block">
        South polar stereographic
      </div>

      {sites.length > 0 && (
        <div className="absolute bottom-[2%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 shadow-[var(--shadow-card)] backdrop-blur-md">
          <MoonStar className="size-3 text-earth" />
          <span className="font-mono text-[8px] tracking-wide text-muted-foreground">
            {sites.length} sites · {selectedCount} in comparison
          </span>
        </div>
      )}

      <div className="absolute -top-2 -right-1 z-20 hidden rounded-xl border border-border bg-card/90 px-2.5 py-2 shadow-[var(--shadow-card)] backdrop-blur sm:block">
        <div className="font-mono text-[7px] tracking-[0.12em] text-muted-foreground uppercase">
          Terrain horizon
        </div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[16px] font-semibold">1,440</span>
          <span className="font-mono text-[8px] text-muted-foreground">bins/site</span>
        </div>
      </div>
    </div>
  )
}
