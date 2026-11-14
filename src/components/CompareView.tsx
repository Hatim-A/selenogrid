import { useState } from 'react'
import { ChevronDown, ChevronUp, LayoutGrid, PencilLine, Telescope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Reveal } from '@/components/ui/Reveal'
import { DecisionBrief } from '@/components/DecisionBrief'
import { DecisionLab } from '@/components/DecisionLab'
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
  onCustom,
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
  onCustom: () => void
}) {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const rankedById = new Map(ranked.map((r) => [r.site.id, r]))
  const cards = ranked
    .map((r) => r.site)
    .concat(sites.filter((s) => selectedIds.includes(s.id) && !rankedById.has(s.id)))
  const visibleCards = showAll ? cards : cards.slice(0, 3)

  const openLibrary = () => setLibraryOpen(true)
  const openCustom = () => {
    setLibraryOpen(false)
    window.setTimeout(onCustom, 140)
  }

  return (
    <div className="space-y-5">
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogTitle className="sr-only">Sites in comparison</DialogTitle>
          <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-2">
            <SitePicker
              sites={sites}
              selected={selectedIds}
              onChange={onSelected}
              onCustom={openCustom}
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <span className="font-mono text-[9px] text-muted-foreground">
              {selectedIds.length} of {sites.length} sites selected
            </span>
            <Button size="sm" onClick={() => setLibraryOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-20 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-secondary">
            <LayoutGrid className="size-5 text-muted-foreground" />
          </span>
          <h2 className="mt-4 font-display text-[30px] tracking-[-0.02em]">Build your shortlist</h2>
          <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted-foreground">
            Choose from the nine NASA candidate regions, the reference sites, or a custom point.
            The decision brief and ranking follow the sites you select.
          </p>
          <Button className="mt-5" size="sm" onClick={openLibrary}>
            Open site library
          </Button>
        </div>
      ) : (
        <>
          <Reveal>
            <DecisionBrief
              ranked={ranked}
              sites={sites.filter((s) => selectedIds.includes(s.id))}
              metricsById={metricsById}
              weights={weights}
              onOpen={onOpen}
              onEditSites={openLibrary}
            />
          </Reveal>

          <Reveal delay={90}>
          <section id="compare-cards" aria-labelledby="cards-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
                  02 · Sites
                </div>
                <h2
                  id="cards-heading"
                  className="mt-1 flex items-center gap-1.5 text-[18px] font-semibold tracking-[-0.03em]"
                >
                  <Telescope className="size-4 text-muted-foreground" />
                  The shortlist
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {showAll
                    ? `All ${cards.length} selected sites, ordered by the current weighted fit.`
                    : `The top ${Math.min(3, cards.length)} by current weighted fit. Every card is a live horizon model.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openLibrary}
                  className="gap-1.5"
                >
                  <PencilLine className="size-3" />
                  {selectedIds.length} of {sites.length} sites
                </Button>
                {cards.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll((value) => !value)}
                    className="gap-1"
                  >
                    {showAll ? (
                      <>
                        Top 3
                        <ChevronUp className="size-3.5" />
                      </>
                    ) : (
                      <>
                        All {cards.length}
                        <ChevronDown className="size-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCards.map((site) => {
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
            {cards.length > 3 && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll((value) => !value)}
                  className="gap-1.5 text-muted-foreground"
                >
                  {showAll ? 'Collapse to top 3' : `Show all ${cards.length} sites`}
                  {showAll ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </Button>
              </div>
            )}
          </section>
          </Reveal>

          <Reveal delay={120}>
            <DecisionLab
              ranked={ranked}
              pareto={pareto}
              weights={weights}
              onWeights={onWeights}
              onOpen={onOpen}
            />
          </Reveal>
        </>
      )}
    </div>
  )
}
