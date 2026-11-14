import { RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ParetoPlot } from '@/components/viz/ParetoPlot'
import { fmtPct } from '@/lib/format'
import { DEFAULT_WEIGHTS, normalizeWeights, WEIGHT_META, WEIGHT_PRESETS } from '@/lib/or'
import { cn } from '@/lib/utils'
import type { ParetoPoint, RankedSite, WeightKey, Weights } from '@/types'

export function DecisionLab({
  ranked,
  pareto,
  weights,
  onWeights,
  onOpen,
}: {
  ranked: RankedSite[]
  pareto: ParetoPoint[]
  weights: Weights
  onWeights: (w: Weights) => void
  onOpen: (id: string) => void
}) {
  const normalized = normalizeWeights(weights)
  const keys: WeightKey[] = ['sunlight', 'comm', 'flux', 'slope']

  const activePresetId = WEIGHT_PRESETS.find((preset) => {
    const n = normalizeWeights(preset.weights)
    return keys.every((k) => Math.abs(n[k] - normalized[k]) < 0.004)
  })?.id

  const setWeight = (key: WeightKey, value: number) => {
    const v = Math.max(0, Math.min(100, value)) / 100
    const others = keys.filter((k) => k !== key)
    const otherTotal = others.reduce((sum, k) => sum + weights[k], 0)
    const next = { ...weights, [key]: v }
    if (otherTotal <= 1e-6) {
      for (const k of others) next[k] = (1 - v) / others.length
    } else {
      const scale = (1 - v) / otherTotal
      for (const k of others) next[k] = weights[k] * scale
    }
    onWeights(next)
  }

  const ringed = pareto.filter((p) => p.onFrontier).length

  return (
    <section
      id="decision"
      className="scroll-mt-20 rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5"
      aria-labelledby="decision-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
            03 · Ranking
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2
              id="decision-heading"
              className="font-display text-[22px] leading-none tracking-[-0.01em]"
            >
              Decision lab
            </h2>
            <Badge variant="terrain" className="font-mono">
              TOPSIS
            </Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-[11.5px] leading-relaxed text-muted-foreground">
            A transparent multi-criteria screen. Scores are relative to the selected sites, so they
            change when the comparison set or weights change. This is a shortlist aid, not a
            flight-readiness decision.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onWeights({ ...DEFAULT_WEIGHTS })}
          className="gap-1.5"
        >
          <RotateCcw className="size-3" />
          Reset weights
        </Button>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Weight presets"
      >
        <span className="mr-1 font-mono text-[8.5px] tracking-[0.1em] text-muted-foreground">
          PRESETS
        </span>
        {WEIGHT_PRESETS.map((preset) => {
          const active = preset.id === activePresetId
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onWeights({ ...preset.weights })}
              title={preset.hint}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10.5px] transition-colors motion-reduce:transition-none',
                active
                  ? 'border-foreground/50 bg-foreground font-medium text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground',
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {keys.map((key) => {
          const meta = WEIGHT_META[key]
          const pct = normalized[key] * 100
          return (
            <div
              key={key}
              className="rounded-xl border border-border/70 bg-background/35 p-3 transition-colors focus-within:border-foreground/30"
            >
              <div className="flex items-baseline justify-between gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-[12px] font-medium text-foreground/90 underline decoration-border decoration-dotted underline-offset-4">
                      {meta.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[230px] leading-relaxed">
                    {meta.hint}
                  </TooltipContent>
                </Tooltip>
                <span
                  aria-hidden
                  className="tabular font-mono text-[12px] font-semibold text-foreground"
                >
                  {pct.toFixed(0)}
                  <span className="font-normal text-muted-foreground">%</span>
                </span>
              </div>
              <Slider
                className="mt-3 py-1 [&_[data-orientation=horizontal]]:transition-all [&_[data-orientation=horizontal]]:duration-300 motion-reduce:[&_[data-orientation=horizontal]]:transition-none"
                value={[pct]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => setWeight(key, v)}
                aria-label={`${meta.label} weight`}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 rounded-xl border border-border/70 bg-background/25 p-2 sm:p-3">
          <div className="mb-1 flex items-center justify-between gap-2 px-1">
            <div>
              <div className="text-[11px] font-semibold">Pareto frontier</div>
              <div className="mt-0.5 max-w-[300px] text-[9.5px] leading-relaxed text-muted-foreground">
                Ringed sites are the trade-off shortlist: no other site beats them on both
                sunlight and Earth visibility at once. Select a site to open it.
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 font-mono" title="Sites on the Pareto frontier">
              {ringed} ringed
            </Badge>
          </div>
          <ParetoPlot points={pareto} highlightId={ranked[0]?.site.id} onSelect={onOpen} />
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-background/25">
          <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
            <div>
              <div className="text-[11px] font-semibold">Weighted ranking</div>
              <div className="mt-0.5 text-[9px] text-muted-foreground">
                Higher = closer to your ideal mix
              </div>
            </div>
            <Badge variant="outline" className="font-mono">
              {ranked.length} sites
            </Badge>
          </div>
          <div
            className="mt-2 overflow-x-auto"
            role="region"
            aria-label="Weighted ranking table"
            tabIndex={0}
          >
            <table className="w-full min-w-[560px] border-collapse text-[10.5px]">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[8.5px] tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="py-1.5 pl-3.5 font-medium">
                    #
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    Site
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Fit /100
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Sun %
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Earth %
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Flux /100
                  </th>
                  <th scope="col" className="py-1.5 pr-3.5 text-right font-medium">
                    Slope °
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr
                    key={r.site.id}
                    onClick={() => onOpen(r.site.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onOpen(r.site.id)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open analysis for ${r.site.shortName}`}
                    className="group cursor-pointer border-b border-border/45 transition-colors last:border-0 hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none motion-reduce:transition-none"
                  >
                    <td className="py-2 pl-3.5">
                      {r.rank === 1 ? (
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-foreground font-mono text-[10px] font-semibold text-background">
                          1
                        </span>
                      ) : r.rank <= 3 ? (
                        <span className="inline-flex size-5 items-center justify-center rounded-full border border-foreground/25 font-mono text-[10px] text-foreground">
                          {r.rank}
                        </span>
                      ) : (
                        <span className="tabular pl-1 font-mono text-[10px] text-muted-foreground">
                          {r.rank}
                        </span>
                      )}
                    </td>
                    <td className="sticky left-0 z-10 max-w-[150px] bg-background/85 py-2 pr-2 shadow-[1px_0_0_0_var(--border)] backdrop-blur-sm">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: r.site.color }}
                        />
                        <span className="truncate font-medium">{r.site.shortName}</span>
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="inline-flex min-w-[44px] flex-col items-end">
                        <span className="tabular font-semibold">{r.score.toFixed(1)}</span>
                        <span
                          aria-hidden
                          className="mt-1 h-[3px] w-10 overflow-hidden rounded-full bg-foreground/10"
                        >
                          <span
                            className="block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                            style={{ width: `${r.score}%`, backgroundColor: r.site.color }}
                          />
                        </span>
                      </span>
                    </td>
                    <td className="tabular py-2 text-right text-sun">
                      {fmtPct(r.metrics.sunlightPct)}
                    </td>
                    <td className="tabular py-2 text-right text-earth">
                      {fmtPct(r.metrics.earthPct)}
                    </td>
                    <td className="tabular py-2 text-right text-terrain">
                      {r.criteria.flux.toFixed(1)}
                    </td>
                    <td className="tabular py-2 pr-3.5 text-right text-muted-foreground">
                      {r.site.slopeDeg.toFixed(1)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/50 px-3.5 py-2 text-[8.5px] leading-relaxed text-muted-foreground">
            Fit = D⁻ / (D⁺ + D⁻) × 100. Higher is closer to the ideal mix; not a probability.
            Weights are normalised to 100%.
          </div>
        </div>
      </div>
    </section>
  )
}
