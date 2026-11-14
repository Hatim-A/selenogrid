import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Mountain,
  PencilLine,
  Radio,
  SlidersHorizontal,
  Sun,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/Reveal'
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

/** Animated number that eases toward `target`; jumps instantly under reduced motion. */
function useCountUp(target: number) {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof window === 'undefined') {
      fromRef.current = target
      setDisplay(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 650
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      fromRef.current = target
    }
  }, [target])

  return display
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
  const top = ranked[0] ?? null
  const runnerUp = ranked[1] ?? null
  const animatedScore = useCountUp(top?.score ?? 0)

  if (!top) return null

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

  const tiles = [
    {
      label: 'Sun visible',
      value: fmtPct(top.metrics.sunlightPct),
      pct: top.metrics.sunlightPct,
      bar: 'var(--sun)',
      text: 'text-sun',
    },
    {
      label: 'Earth visible',
      value: fmtPct(top.metrics.earthPct),
      pct: top.metrics.earthPct,
      bar: 'var(--earth)',
      text: 'text-earth',
    },
    {
      label: 'Local slope',
      value: `${top.site.slopeDeg.toFixed(1)}°`,
      pct: Math.min(100, (top.site.slopeDeg / 25) * 100),
      bar: 'var(--terrain)',
      text: 'text-terrain',
    },
  ]

  return (
    <section id="snapshot" aria-labelledby="snapshot-heading" className="scroll-mt-20">
      <Reveal>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
              01 · Answer
            </div>
            <h2
              id="snapshot-heading"
              className="mt-1 font-display text-[26px] leading-none tracking-[-0.01em]"
            >
              Decision brief
            </h2>
            <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-muted-foreground">
              The best weighted fit for this window, with the trade-offs that produced it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              {ranked.length} sites evaluated
            </span>
            <Button variant="ghost" size="sm" onClick={onEditSites} className="gap-1.5">
              <PencilLine className="size-3" />
              Edit sites
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="grid items-stretch gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <Reveal delay={90} className="h-full min-w-0">
          <article className="relative h-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-[2px]"
              style={{ background: top.site.color }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{
                background: `linear-gradient(to bottom, color-mix(in srgb, ${top.site.color} 10%, transparent), transparent)`,
              }}
            />
            <div className="relative p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
                    <Trophy className="size-3 text-sun" />
                    Best fit for this window
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpen(top.site.id)}
                    className="group mt-2 block max-w-full text-left"
                  >
                    <h3 className="max-w-full font-display text-[32px] leading-[1.02] tracking-[-0.01em] break-words group-hover:underline group-hover:decoration-foreground/30 group-hover:underline-offset-4 sm:text-[40px]">
                      {top.site.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                      <span>{top.site.region}</span>
                      <span className="text-border">·</span>
                      <span className="font-mono">{fmtCoord(top.site.lat, top.site.lon)}</span>
                      <span className="text-border">·</span>
                      <span>Rank #{top.rank}</span>
                    </div>
                  </button>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <div className="flex items-baseline justify-start gap-1.5 sm:justify-end">
                    <span className="tabular font-display text-[54px] leading-none tracking-[-0.015em] sm:text-[64px]">
                      <span className="inline-block min-w-[4ch] text-left sm:text-right">
                        {animatedScore.toFixed(1)}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">/100</span>
                  </div>
                  <div className="mt-1 font-mono text-[8px] tracking-[0.14em] text-muted-foreground uppercase">
                    fit score
                  </div>
                  <div
                    aria-hidden
                    className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-foreground/10 sm:ml-auto sm:w-28"
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                      style={{ width: `${top.score}%`, background: top.site.color }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {tiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-xl border border-border/60 bg-background/40 px-3 pt-2 pb-2.5"
                  >
                    <div className={`tabular text-[17px] leading-none font-semibold ${tile.text}`}>
                      {tile.value}
                    </div>
                    <div
                      aria-hidden
                      className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-foreground/10"
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                        style={{ width: `${tile.pct}%`, backgroundColor: tile.bar }}
                      />
                    </div>
                    <div className="mt-1.5 text-[9px] text-muted-foreground">{tile.label}</div>
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
        </Reveal>

        <Reveal delay={160} className="h-full min-w-0">
          <aside className="flex h-full flex-col rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5">
            <div className="font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
              The trade-off
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Under the current weights,{' '}
              <strong className="font-display text-[13px] font-normal text-foreground">
                {top.site.shortName}
              </strong>{' '}
              is the best weighted mix.
              {runnerNote ? ` ${runnerNote}` : ''}
            </p>

            <div className="mt-3 flex-1 space-y-0.5 border-t border-border/60 pt-2">
              {leaders.length === 0 ? (
                <p className="py-1 text-[10.5px] leading-relaxed text-muted-foreground">
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
                      className="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-secondary/60"
                    >
                      <Icon className={`size-3.5 shrink-0 ${leader.color}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] text-muted-foreground">
                          {leader.label}
                        </span>
                        <span className="block truncate text-[11px] font-medium">
                          {leader.site.shortName}
                        </span>
                      </span>
                      <span className={`tabular font-mono text-[10px] ${leader.color}`}>
                        {leader.value}
                      </span>
                      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-foreground" />
                    </button>
                  )
                })
              )}
            </div>

            <div className="mt-3 rounded-xl border border-border/60 bg-secondary/25 px-3 py-2.5">
              <div className="font-mono text-[7.5px] tracking-[0.12em] text-muted-foreground uppercase">
                In plain English
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                It keeps the Sun up for {fmtPct(top.metrics.sunlightPct)} of the window and Earth
                in view for {fmtPct(top.metrics.earthPct)}. Change the weights or the site set to
                see how the shortlist moves.
              </p>
            </div>
          </aside>
        </Reveal>
      </div>

      <Reveal delay={220}>
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
      </Reveal>
    </section>
  )
}
