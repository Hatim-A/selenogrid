import { ArrowDown, Compass, Sparkles } from 'lucide-react'
import { HeroMoon } from '@/components/HeroMoon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Site } from '@/types'

export function Hero({
  siteCount,
  sites,
  selectedIds,
  topSiteId,
  theme,
  onOpen,
  onGuide,
  onCompare,
}: {
  siteCount: number
  sites: Site[]
  selectedIds: string[]
  topSiteId?: string
  theme: 'light' | 'dark'
  onOpen: (id: string) => void
  onGuide: () => void
  onCompare: () => void
}) {
  const stats = [
    { value: String(siteCount), label: 'terrain points: 9 NASA regions + references' },
    { value: '360°', label: 'horizon per site at 0.25° bins' },
    { value: '20 m', label: 'LRO LOLA elevation data + 640 m custom grid' },
    { value: '<0.02°', label: 'Sun/Earth pointing vs JPL Horizons' },
  ]

  return (
    <section className="relative overflow-hidden pt-9 pb-7 sm:pt-13 sm:pb-9">
      <div className="grid-fade pointer-events-none absolute inset-x-0 -top-16 h-64 opacity-50" />
      <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div>
          <div className="animate-fade-up flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono tracking-[0.12em]">
              <span className="sm:hidden">NASA SPACE APPS 2026</span>
              <span className="hidden sm:inline">
                NASA SPACE APPS 2026 · LUNAR LANDING SITE NAVIGATOR
              </span>
            </Badge>
            <Badge variant="earth" className="gap-1">
              <Sparkles className="size-2.5" />
              Transparent physics, no black box
            </Badge>
          </div>

          <h1
            className="animate-fade-up mt-5 max-w-[760px] font-display text-[44px] leading-[0.97] tracking-[-0.025em] sm:text-[62px] lg:text-[74px]"
            style={{ animationDelay: '80ms' }}
          >
            Find the landing site that can see the{' '}
            <span className="text-sun">Sun</span> and hear{' '}
            <span className="text-earth">Earth</span>.
          </h1>

          <p
            className="animate-fade-up mt-5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]"
            style={{ animationDelay: '150ms' }}
          >
            SelenoGrid compares real LOLA terrain, sunlight and direct-to-Earth line of sight across
            the Artemis candidate regions, then ranks them with an explainable decision model you
            can inspect, reweight and challenge.
          </p>

          <div
            className="animate-fade-up mt-5 flex flex-wrap items-center gap-2"
            style={{ animationDelay: '220ms' }}
          >
            <Button size="sm" onClick={onCompare}>
              See the ranking
              <ArrowDown />
            </Button>
            <Button variant="secondary" size="sm" onClick={onGuide}>
              <Compass />
              60-second guide
            </Button>
          </div>
          <p
            className="animate-fade-up mt-2 font-mono text-[9px] tracking-wide text-muted-foreground/80"
            style={{ animationDelay: '280ms' }}
          >
            Preloaded: nine NASA sites · 180-day window · 3-hour step · live Sun/Earth computation
          </p>
        </div>

        <div
          className="animate-fade-up relative mx-auto w-full max-w-[370px] lg:max-w-none"
          style={{ animationDelay: '120ms' }}
        >
          <HeroMoon
            sites={sites}
            selectedIds={selectedIds}
            topSiteId={topSiteId}
            theme={theme}
            onOpen={onOpen}
          />
        </div>
      </div>

      <div className="relative mt-8 grid grid-cols-2 gap-y-5 border-y border-border py-4 sm:grid-cols-4 sm:divide-x sm:divide-border">
        {stats.map((s) => (
          <div key={s.label} className="px-0 sm:px-5 sm:first:pl-0">
            <div className="tabular font-display text-[28px] leading-none tracking-[-0.02em]">
              {s.value}
            </div>
            <div className="mt-0.5 max-w-[190px] text-[11px] leading-snug text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
