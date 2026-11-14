import { ArrowUpRight, Mountain, PencilLine, Radio, SlidersHorizontal, Sun, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtCoord, fmtPct } from '@/lib/format'
import { normalizeWeights, WEIGHT_META } from '@/lib/or'
import type { RankedSite, Site, SiteMetrics, Weights } from '@/types'

type Candidate = { site: Site; metrics: SiteMetrics }
type Leader = {
  site: Site
  metrics: SiteMetrics
  label: string
  value: string
  icon: typeof Sun
  color: string
}

export function DecisionBrief({
  ranked,
  sites,
  metricsById,
  weights,
  onOpen,
  onEditSites,
}: {
  ranked: RankedSite[]
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  weights: Weights
  onOpen: (id: string) => void
  onEditSites: () => void
}) {
  if (ranked.length === 0) return null

  const top = ranked[0]
  const runnerUp = ranked[1] ?? null
  const candidates = sites
    .map((site) => ({ site, metrics: metricsById.get(site.id) }))
    .filter((x): x is Candidate => Boolean(x.metrics))

  const mostSun = candidates.reduce<Candidate | null>(
    (best, item) => (!best || item.metrics.sunlightPct > best.metrics.sunlightPct ? item : best),
    null,
  )
  const mostEarth = candidates.reduce<Candidate | null>(
    (best, item) => (!best || item.metrics.earthPct > best.metrics.earthPct ? item : best),
    null,
  )
  const gentlest = candidates.reduce<Candidate | null>(
    (best, item) => (!best || item.site.slopeDeg < best.site.slopeDeg ? item : best),
    null,
  )

  const normalized = normalizeWeights(weights)
  const mix = `${WEIGHT_META.sunlight.short} ${fmtPct(normalized.sunlight * 100)} · ${WEIGHT_META.comm.short} ${fmtPct(normalized.comm * 100)} · ${WEIGHT_META.flux.short} ${fmtPct(normalized.flux * 100)} · ${WEIGHT_META.slope.short} ${fmtPct(normalized.slope * 100)}`
  const gap = runnerUp ? top.score - runnerUp.score : 0

  const leaders: Leader[] = [
    mostSun && mostSun.site.id !== top.site.id
      ? { ...mostSun, label: 'Most sunlight', value: fmtPct(mostSun.metrics.sunlightPct), icon: Sun, color: 'text-sun' }
      : null,
    mostEarth && mostEarth.site.id !== top.site.id
      ? { ...mostEarth, label: 'Most Earth visibility', value: fmtPct(mostEarth.metrics.earthPct), icon: Radio, color: 'text-earth' }
      : null,
    gentlest && gentlest.site.id !== top.site.id
      ? { ...gentlest, label: 'Gentlest terrain', value: `${gentlest.site.slopeDeg.toFixed(1)}°`, icon: Mountain, color: 'text-terrain' }
      : null,
  ].filter((leader): leader is Leader => leader !== null)

  const runnerNote = runnerUp
    ? `${runnerUp.site.shortName} is ${Math.abs(gap).toFixed(1)} points ${
        gap < 0.05 ? 'level on score' : 'behind'
      }${runnerUp.metrics.sunlightPct > top.metrics.sunlightPct ? ` with more sunlight (${fmtPct(runnerUp.metrics.sunlightPct)})` : runnerUp.metrics.earthPct > top.metrics.earthPct ? ` with more Earth visibility (${fmtPct(runnerUp.metrics.earthPct)})` : ''}.`
    : ''

  return (
    <section id="snapshot" aria-labelledby="snapshot-heading" className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
            01 · ANSWER
          </div>
          <h2
            id="snapshot-heading"
            className="mt-1 text-[19px] font-semibold tracking-[-0.035em]"
          >
            Decision brief
          </h2>
          <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted-foreground">
            The best weighted fit for this window, with the trade-offs that produced it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-mono">
            {ranked.length} sites evaluated
          </Badge>
          <Button variant="ghost" size="sm" onClick={onEditSites} className="gap-1.5">
            <PencilLine className="size-3" />
            Edit sites
          </Button>
        </div>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: top.site.color }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full blur-3xl"
            style={{ background: `${top.site.color}18` }}
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
                  <Trophy className="size-3 text-sun" />
                  Best fit for this window
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(top.site.id)}
                  className="group mt-2 block max-w-full text-left"
                >
                  <h3 className="text-[28px] leading-[1.05] font-semibold tracking-[-0.045em] sm:text-[34px]">
                    {top.site.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                    <span>{top.site.region}</span>
                    <span className="text-border">·</span>
                    <span className="font-mono">{fmtCoord(top.site.lat, top.site.lon)}</span>
                    <span className="text-border">·</span>
                    <span>Rank #{top.rank}</span>
                  </div>
                </button>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className="tabular text-[42px] leading-none font-semibold tracking-[-0.055em]">
                    {top.score.toFixed(1)}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">/100</span>
                </div>
                <div className="mt-1 font-mono text-[8px] tracking-[0.1em] text-muted-foreground uppercase">
                  fit score
                </div>
                <div className="mt-1.5 ml-auto h-1 w-20 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${top.score}%`, background: top.site.color }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: 'Sun visible', value: fmtPct(top.metrics.sunlightPct), tone: 'text-sun' },
                { label: 'Earth visible', value: fmtPct(top.metrics.earthPct), tone: 'text-earth' },
                { label: 'Local slope', value: `${top.site.slopeDeg.toFixed(1)}°`, tone: 'text-terrain' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/70 bg-background/35 px-3 py-2">
                  <div className={`tabular text-[17px] font-semibold ${metric.tone}`}>{metric.value}</div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">{metric.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button size="sm" onClick={() => onOpen(top.site.id)}>
                Open full analysis
                <ArrowUpRight />
              </Button>
              <span className="font-mono text-[8px] text-muted-foreground">
                line of sight, not a link budget
              </span>
            </div>
          </div>
        </article>

        <aside className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
            The trade-off
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            Under the current weights,{' '}
            <strong className="font-medium text-foreground">{top.site.shortName}</strong> is the
            best weighted mix.
            {runnerNote ? ` ${runnerNote}` : ''}
          </p>

          <div className="mt-3 space-y-1 border-t border-border/60 pt-2.5">
            {leaders.length === 0 ? (
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                It is also the leader on the other criteria in the current set.
              </p>
            ) : (
              leaders.map((leader) => {
                const Icon = leader.icon
                return (
                  <button
                    key={leader.label}
                    type="button"
                    onClick={() => onOpen(leader.site.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-secondary/60"
                  >
                    <Icon className={`size-3 shrink-0 ${leader.color}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[9px] text-muted-foreground">{leader.label}</span>
                      <span className="block truncate text-[10.5px] font-medium">{leader.site.shortName}</span>
                    </span>
                    <span className={`tabular font-mono text-[9.5px] ${leader.color}`}>{leader.value}</span>
                    <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-3 rounded-xl border border-border/60 bg-secondary/25 px-3 py-2">
            <div className="font-mono text-[7.5px] tracking-[0.12em] text-muted-foreground uppercase">
              In plain English
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
              It keeps the Sun up for {fmtPct(top.metrics.sunlightPct)} of the window and Earth in
              view for {fmtPct(top.metrics.earthPct)}. Change the weights or the site set to see how
              the shortlist moves.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-1 text-[9px] text-muted-foreground">
        <span>
          Preference-dependent screening result, not a mission decision. Current mix: {mix}.
        </span>
        <button
          type="button"
          onClick={() =>
            document.getElementById('decision')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-foreground"
        >
          <SlidersHorizontal className="size-3" />
          Adjust weights
        </button>
      </div>
    </section>
  )
}
