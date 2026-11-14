import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { HeroMoon } from '@/components/HeroMoon'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/Reveal'
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
    <section className="relative overflow-hidden pt-10 pb-8 sm:pt-16 sm:pb-10">
      <div className="grid-fade pointer-events-none absolute inset-x-0 -top-16 h-64 opacity-50" />
      <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-6">
        <div>
          <Reveal>
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-px w-8 shrink-0 bg-gradient-to-r from-sun to-earth"
              />
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                <span className="sm:hidden">NASA Space Apps 2026</span>
                <span className="hidden sm:inline">
                  NASA Space Apps 2026 · Lunar landing-site navigator
                </span>
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-5 max-w-[16ch] font-display text-[42px] leading-[1.02] font-bold tracking-[-0.02em] text-balance sm:text-[60px] lg:text-[68px]">
              Find the landing site that can see the{' '}
              <em className="text-sun italic">Sun</em> and hear{' '}
              <em className="text-earth italic">Earth</em>.
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mt-5 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground sm:text-[15.5px]">
              SelenoGrid compares real LOLA terrain, sunlight and direct-to-Earth
              line of sight across the Artemis candidate regions, then ranks them
              with an explainable decision model you can inspect, reweight and
              challenge.
            </p>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3">
              <Button size="lg" onClick={onCompare} className="h-11 px-6 text-[13.5px]">
                See the ranking
                <ArrowDown />
              </Button>
              <button
                type="button"
                onClick={onGuide}
                className="group inline-flex h-11 min-h-[44px] items-center gap-1 px-3 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full"
              >
                60-second guide
                <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px" />
              </button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-4 font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground/75 uppercase">
              Preloaded · Nine NASA sites · 180-day window · 3-hour steps
            </p>
          </Reveal>
        </div>

        <Reveal delay={140} className="relative">
          <div className="relative mx-auto w-full max-w-[330px] sm:max-w-[440px] lg:mr-[-1rem] lg:max-w-[560px]">
            <HeroMoon
              sites={sites}
              selectedIds={selectedIds}
              topSiteId={topSiteId}
              theme={theme}
              onOpen={onOpen}
            />
          </div>
        </Reveal>
      </div>

      <Reveal delay={120}>
        <div className="relative mt-10 grid grid-cols-2 gap-y-6 border-y border-border py-5 sm:grid-cols-4 sm:divide-x sm:divide-border">
          {stats.map((s) => (
            <div key={s.label} className="px-0 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <div className="tabular font-display text-[30px] leading-none tracking-[-0.02em]">
                {s.value}
              </div>
              <div className="mt-1.5 max-w-[190px] text-[11px] leading-snug text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
