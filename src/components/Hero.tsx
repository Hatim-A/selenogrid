import { ArrowDown, BookOpen, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STATS = [
  { value: '12', label: 'sites, incl. all nine NASA regions' },
  { value: '1,440', label: 'terrain-horizon bins per site' },
  { value: '20 m', label: 'LRO LOLA elevation data' },
  { value: '<0.02°', label: 'ephemeris error vs JPL Horizons' },
]

export function Hero({
  onMethod,
  onCompare,
}: {
  onMethod: () => void
  onCompare: () => void
}) {
  return (
    <section className="relative overflow-hidden pt-9 pb-7 sm:pt-14 sm:pb-9">
      <div className="grid-fade pointer-events-none absolute inset-x-0 -top-16 h-64 opacity-50" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono tracking-[0.12em]">
            NASA SPACE APPS 2026 · LUNAR LANDING SITE NAVIGATOR
          </Badge>
          <Badge variant="earth" className="gap-1">
            <Sparkles className="size-2.5" />
            Transparent physics, no black box
          </Badge>
        </div>

        <h1 className="mt-5 max-w-4xl text-[34px] leading-[1.04] font-semibold tracking-[-0.04em] sm:text-[48px] lg:text-[58px]">
          Find the landing site that can see the{' '}
          <span className="text-sun">Sun</span> and hear{' '}
          <span className="text-earth">Earth</span>.
        </h1>

        <div className="mt-5 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground sm:text-[14.5px]">
            SelenoGrid compares real LOLA terrain, sunlight and direct-to-Earth links across the
            Artemis candidate regions, then ranks them with an explainable decision model you can
            inspect, reweight and challenge.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onMethod}>
              <BookOpen />
              How it works
            </Button>
            <Button size="sm" onClick={onCompare}>
              Compare sites
              <ArrowDown />
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-y-5 border-y border-border py-4 sm:grid-cols-4 sm:divide-x sm:divide-border">
          {STATS.map((s) => (
            <div key={s.label} className="px-0 sm:px-5 sm:first:pl-0">
              <div className="tabular text-[19px] font-semibold tracking-[-0.03em]">{s.value}</div>
              <div className="mt-0.5 max-w-[180px] text-[10.5px] leading-snug text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
