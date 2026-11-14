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

  return (
    <section
      id="decision"
      className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5"
      aria-labelledby="decision-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="decision-heading" className="text-[15px] font-semibold tracking-[-0.02em]">
              Decision lab
            </h2>
            <Badge variant="terrain" className="font-mono">
              TOPSIS
            </Badge>
            <Badge variant="outline">4 criteria · benefit + cost</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-[10.5px] leading-relaxed text-muted-foreground">
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

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[8.5px] tracking-[0.1em] text-muted-foreground">
          PRESETS
        </span>
        {WEIGHT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onWeights({ ...preset.weights })}
            className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
            title={preset.hint}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {keys.map((key) => {
          const meta = WEIGHT_META[key]
          return (
            <div key={key} className="rounded-xl border border-border/70 bg-background/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-[10.5px] font-medium">{meta.label}</span>
                  </TooltipTrigger>
                  <TooltipContent>{meta.hint}</TooltipContent>
                </Tooltip>
                <span className="tabular font-mono text-[9px] text-muted-foreground">
                  {(normalized[key] * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                className="mt-2.5"
                value={[normalized[key] * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => setWeight(key, v)}
                aria-label={`${meta.label} weight`}
              />
              <div className="mt-1.5 text-[8.5px] text-muted-foreground/75">{meta.hint}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 rounded-xl border border-border/70 bg-background/25 p-2 sm:p-3">
          <div className="mb-1 flex items-center justify-between gap-2 px-1">
            <div>
              <div className="text-[11px] font-semibold">Pareto frontier</div>
              <div className="text-[9px] text-muted-foreground">
                Sunlight vs Earth visibility · click a site
              </div>
            </div>
            <Badge variant="outline" className="font-mono">
              {pareto.filter((p) => p.onFrontier).length} non-dominated
            </Badge>
          </div>
          <ParetoPlot points={pareto} highlightId={ranked[0]?.site.id} onSelect={onOpen} />
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-background/25">
          <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
            <div>
              <div className="text-[11px] font-semibold">Weighted ranking</div>
              <div className="text-[9px] text-muted-foreground">
                Higher closeness coefficient is better
              </div>
            </div>
            <Badge variant="outline" className="font-mono">
              {ranked.length} sites
            </Badge>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[430px] border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[8px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-1.5 pl-3.5 font-medium">#</th>
                  <th className="py-1.5 font-medium">Site</th>
                  <th className="py-1.5 text-right font-medium">Score</th>
                  <th className="py-1.5 text-right font-medium">Sun</th>
                  <th className="py-1.5 text-right font-medium">Earth</th>
                  <th className="py-1.5 pr-3.5 text-right font-medium">Slope</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr
                    key={r.site.id}
                    onClick={() => onOpen(r.site.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onOpen(r.site.id)
                    }}
                    tabIndex={0}
                    className={cn(
                      'cursor-pointer border-b border-border/45 transition-colors last:border-0 hover:bg-secondary/60',
                      r.rank === 1 && 'bg-secondary/40',
                    )}
                  >
                    <td className="py-2 pl-3.5 font-mono text-[9px] text-muted-foreground">
                      {r.rank}
                    </td>
                    <td className="max-w-[140px] py-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: r.site.color }}
                        />
                        <span className="truncate font-medium">{r.site.shortName}</span>
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="inline-flex min-w-[38px] flex-col items-end">
                        <span className="tabular font-semibold">{r.score.toFixed(1)}</span>
                        <span className="mt-1 h-0.5 w-8 overflow-hidden rounded-full bg-secondary">
                          <span
                            className="block h-full rounded-full bg-foreground/70"
                            style={{ width: `${r.score}%` }}
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
                    <td className="tabular py-2 pr-3.5 text-right text-muted-foreground">
                      {r.site.slopeDeg.toFixed(1)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/50 px-3.5 py-2 text-[8.5px] text-muted-foreground">
            Score = D⁻ / (D⁺ + D⁻) × 100. Weights normalised to 100%.
          </div>
        </div>
      </div>
    </section>
  )
}
