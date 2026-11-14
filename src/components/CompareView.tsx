import { LayoutGrid, Telescope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DecisionLab } from '@/components/DecisionLab'
import { DecisionSnapshot } from '@/components/DecisionSnapshot'
import { MetricCheatSheet } from '@/components/MetricCheatSheet'
import { ScenarioVerdict } from '@/components/ScenarioVerdict'
import { SiteCard } from '@/components/SiteCard'
import { SitePicker } from '@/components/SitePicker'
import type { ParetoPoint, RankedSite, Site, SiteMetrics, Weights } from '@/types'

export function CompareView({
  sites,
  selectedIds,
  metricsById,
  ranked,
  pareto,
  weights,
  onSelected,
  onWeights,
  onOpen,
  onRemove,
}: {
  sites: Site[]
  selectedIds: string[]
  metricsById: Map<string, SiteMetrics>
  ranked: RankedSite[]
  pareto: ParetoPoint[]
  weights: Weights
  onSelected: (ids: string[]) => void
  onWeights: (w: Weights) => void
  onOpen: (id: string) => void
  onRemove: (id: string) => void
}) {
  const rankedById = new Map(ranked.map((r) => [r.site.id, r]))
  const cards = ranked
    .map((r) => r.site)
    .concat(sites.filter((s) => selectedIds.includes(s.id) && !rankedById.has(s.id)))

  return (
    <div className="space-y-4">
      {cards.length === 0 ? (
        <>
          <SitePicker sites={sites} selected={selectedIds} onChange={onSelected} />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-14 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-secondary">
              <LayoutGrid className="size-4 text-muted-foreground" />
            </span>
            <h2 className="mt-3 text-[14px] font-semibold">Pick at least one site</h2>
            <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">
              Choose from the nine NASA candidate regions or the three reference sites to start a
              side-by-side comparison.
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => onSelected(sites.filter((s) => s.kind === 'nasa').map((s) => s.id))}
            >
              Compare the NASA nine
            </Button>
          </div>
        </>
      ) : (
        <>
          <DecisionSnapshot
            ranked={ranked}
            sites={sites.filter((s) => selectedIds.includes(s.id))}
            metricsById={metricsById}
            onOpen={onOpen}
            onEditSites={() =>
              document
                .getElementById('site-picker')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          />

          <ScenarioVerdict
            ranked={ranked}
            sites={sites.filter((s) => selectedIds.includes(s.id))}
            metricsById={metricsById}
            weights={weights}
          />

          <MetricCheatSheet />
          <SitePicker sites={sites} selected={selectedIds} onChange={onSelected} />

          <section id="compare-cards" aria-labelledby="cards-heading">
            <div className="mb-2.5 flex items-end justify-between gap-2">
              <div>
                <h2 id="cards-heading" className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Telescope className="size-3.5 text-muted-foreground" />
                  Side-by-side
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Sorted by the current weighted score. Every card is a live horizon model, not a
                  stock image.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => document.getElementById('decision')?.scrollIntoView({ behavior: 'smooth' })}>
                Open decision lab
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((site) => {
                const metrics = metricsById.get(site.id)
                if (!metrics) return null
                return (
                  <SiteCard
                    key={site.id}
                    site={site}
                    metrics={metrics}
                    ranked={rankedById.get(site.id)}
                    onOpen={() => onOpen(site.id)}
                    onRemove={() => onRemove(site.id)}
                  />
                )
              })}
            </div>
          </section>

          <DecisionLab
            ranked={ranked}
            pareto={pareto}
            weights={weights}
            onWeights={onWeights}
            onOpen={onOpen}
          />
        </>
      )}
    </div>
  )
}
