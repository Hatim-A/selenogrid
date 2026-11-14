import { useState } from 'react'
import { ChevronDown, ChevronUp, PencilLine, Telescope } from 'lucide-react'
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
        <DialogContent className="max-w-2xl gap-0 p-0 max-sm:top-auto max-sm:bottom-3 max-sm:translate-y-0 max-sm:rounded-b-2xl">
          <DialogTitle className="sr-only">Site library: choose sites to compare</DialogTitle>
          <div data-lenis-prevent className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-2 max-sm:max-h-[86dvh]">
            <SitePicker
              sites={sites}
              selected={selectedIds}
              onChange={onSelected}
              onCustom={openCustom}
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <span className="font-mono text-[9px] text-muted-foreground" aria-live="polite">
              {selectedIds.length} of {sites.length} sites selected
            </span>
            <div className="flex items-center gap-1.5">
              {selectedIds.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onSelected([])}>
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={() => setLibraryOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {cards.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card/40 px-6 py-16 text-center sm:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-x-16 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, color-mix(in srgb, var(--foreground) 30%, transparent), transparent)',
              }}
            />
            <div className="absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/50" />
            <div className="absolute top-1/2 left-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-border/60" />
            <div
              className="absolute top-1/2 left-1/2 size-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{ background: 'var(--glow-a)' }}
            />
            <div
              className="absolute top-[calc(50%-150px)] left-[calc(50%+86px)] size-1.5 rounded-full"
              style={{ background: 'var(--earth)', opacity: 0.7 }}
            />
          </div>
          <span className="relative inline-flex size-12 items-center justify-center rounded-full border border-border bg-secondary/60">
            <Telescope className="size-5 text-muted-foreground" />
          </span>
          <div className="relative mt-4 font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
            No sites in view
          </div>
          <h2 className="font-display relative mt-2 text-[34px] leading-tight tracking-[-0.02em] italic sm:text-[40px]">
            Choose sites to compare
          </h2>
          <p className="relative mt-2 max-w-md text-[12px] leading-relaxed text-muted-foreground">
            Choose from the nine NASA candidate regions, the reference sites, or a custom point.
            The decision brief and ranking follow the sites you select.
          </p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" onClick={openLibrary} aria-haspopup="dialog">
              Open site library
            </Button>
            <Button variant="outline" size="sm" onClick={onCustom}>
              Plot a custom point
            </Button>
          </div>
          <p className="relative mt-5 font-mono text-[8.5px] tracking-[0.12em] text-muted-foreground/70 uppercase">
            01 Answer · 02 Sites · 03 Ranking
          </p>
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
                  aria-haspopup="dialog"
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
                    aria-expanded={showAll}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleCards.map((site, index) => {
                const metrics = metricsById.get(site.id)
                if (!metrics) return null
                return (
                  <Reveal key={site.id} delay={Math.min(index * 70, 420)} className="h-full">
                    <SiteCard
                      site={site}
                      metrics={metrics}
                      ranked={rankedById.get(site.id)}
                      onOpen={() => onOpen(site.id)}
                      onRemove={() => onRemove(site.id)}
                    />
                  </Reveal>
                )
              })}
            </div>
            {cards.length > 3 && (
              <div className="mt-4 flex items-center gap-3">
                <span aria-hidden className="h-px flex-1 bg-border/60" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll((value) => !value)}
                  aria-expanded={showAll}
                  className="gap-1.5 text-muted-foreground"
                >
                  {showAll ? 'Collapse to top 3' : `Show all ${cards.length} sites`}
                  {showAll ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </Button>
                <span aria-hidden className="h-px flex-1 bg-border/60" />
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
