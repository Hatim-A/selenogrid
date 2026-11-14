import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Earth, Mountain, Scale, Sun } from 'lucide-react'
import { DEFAULT_WEIGHTS, paretoFrontier } from '@/lib/or'
import { fmtCoord, fmtDateTimeUtc, fmtElevation, fmtHours, fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RankedSite, Site, SiteMetrics, WeightKey } from '@/types'

type ChaptersProps = {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  ranked: RankedSite[]
  /** Section id owned by LandingView's scroll-spy (e.g. 'chapter-02'). */
  active: string
  onOpenSite: (id: string) => void
}

type Tone = 'sun' | 'earth' | 'terrain' | 'mix'

const TONE_BAR: Record<Tone, string> = {
  sun: 'border-sun/70',
  earth: 'border-earth/70',
  terrain: 'border-terrain/70',
  mix: 'border-foreground/25',
}

function useInView<T extends HTMLElement>(rootMargin = '-38% 0px -38% 0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first) setInView(first.isIntersecting)
      },
      { rootMargin, threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin])
  return { ref, inView }
}

function Step({
  index,
  title,
  tone,
  children,
}: {
  index: string
  title: string
  tone: Tone
  children: ReactNode
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={cn(
        'flex min-h-[44vh] items-center py-6 transition-opacity duration-500 motion-reduce:transition-none lg:min-h-[44vh]',
        inView ? 'opacity-100' : 'opacity-40 motion-reduce:opacity-100',
      )}
    >
      <div className={cn('w-full max-w-md border-l-2 pl-5 sm:pl-7', TONE_BAR[tone])}>
        <div className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
          {index}
        </div>
        <h3 className="mt-2 font-display text-[24px] leading-[1.08] tracking-[-0.02em] text-balance sm:text-[30px]">
          {title}
        </h3>
        <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}

function VisualShell({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="surface w-full overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3 sm:px-5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-muted/60 text-muted-foreground">
          {icon}
        </span>
        <span className="eyebrow truncate">{eyebrow}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
          <span className="pulse-dot size-1.5 rounded-full bg-success" aria-hidden="true" />
          In-browser
        </span>
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </div>
  )
}

function MetricBar({
  label,
  value,
  tone,
}: {
  label: string
  value: number | undefined
  tone: 'sun' | 'earth'
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-medium">{label}</span>
        <span className="tabular font-mono text-[11.5px] text-muted-foreground">
          {value === undefined ? '—' : fmtPct(value, 1)}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"
        role="img"
        aria-label={value === undefined ? `${label}: unavailable` : `${label} ${fmtPct(value, 1)}`}
      >
        <div
          className={cn('h-full rounded-full', tone === 'sun' ? 'bg-sun' : 'bg-earth')}
          style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
        />
      </div>
    </div>
  )
}

function EventLine({ label, value, start }: { label: string; value: number | null; start: number }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 font-mono text-[10.5px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="tabular truncate">
        {value === null ? '—' : `${fmtDateTimeUtc(value)} · ${fmtHours((value - start) / 3_600_000)}`}
      </span>
    </div>
  )
}

function ChapterHead({
  no,
  kicker,
  title,
  lede,
  current,
}: {
  no: string
  kicker: string
  title: string
  lede: string
  current: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pt-20 sm:px-6 lg:pt-28">
      <p className={cn('eyebrow flex items-center gap-2', current && 'text-foreground')}>
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-1.5 rounded-full transition-colors motion-reduce:transition-none',
            current ? 'bg-sun' : 'bg-foreground/25',
          )}
        />
        Chapter {no} — {kicker}
      </p>
      <h2 className="mt-3 max-w-[22ch] font-display text-[34px] leading-[1.02] tracking-[-0.02em] text-balance sm:text-[52px]">
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
        {lede}
      </p>
    </div>
  )
}

/* ——— Chapter 01 visual: a site is a schedule ——— */

function ScheduleVisual({
  focus,
  metrics,
  onOpenSite,
}: {
  focus: Site
  metrics: SiteMetrics | undefined
  onOpenSite: (id: string) => void
}) {
  return (
    <VisualShell eyebrow="Event clock · focus site" icon={<Sun className="size-3.5" aria-hidden="true" />}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{focus.name}</div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {fmtCoord(focus.lat, focus.lon)} · {fmtElevation(focus.elevationM)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenSite(focus.id)}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none hover:border-[var(--border-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open site
          </button>
        </div>
        <div className="mt-4 space-y-3.5">
          <MetricBar label="Sunlight share of window" value={metrics?.sunlightPct} tone="sun" />
          <MetricBar label="Earth visibility share" value={metrics?.earthPct} tone="earth" />
        </div>
        <div className="mt-4 space-y-1.5 border-t border-border/70 pt-3.5">
          {metrics ? (
            <>
              <EventLine label="Next sunset" value={metrics.nextSunset} start={metrics.start} />
              <EventLine label="Next sunrise" value={metrics.nextSunrise} start={metrics.start} />
              <EventLine label="Next earthset" value={metrics.nextEarthset} start={metrics.start} />
              <EventLine label="Next earthrise" value={metrics.nextEarthrise} start={metrics.start} />
            </>
          ) : (
            <p className="font-mono text-[10.5px] text-muted-foreground">
              Computing windows for this scenario…
            </p>
          )}
        </div>
        {metrics && (
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Longest unbroken stretch: {fmtHours(metrics.longestSunHours)} of Sun ·{' '}
            {fmtHours(metrics.longestEarthHours)} of Earth. Event times refined to about one
            second; window edges carry ± one time step.
          </p>
        )}
      </div>
    </VisualShell>
  )
}

/* ——— Chapter 02 visual: horizon sparkline from real LOLA data ——— */

const SPARK_W = 360
const SPARK_H = 132
const SPARK_PAD = 8

function sparkPaths(values: number[]): { line: string; area: string } {
  const stride = Math.max(1, Math.ceil(values.length / 180))
  const kept: number[] = []
  for (let i = 0; i < values.length; i += stride) kept.push(values[i] ?? 0)
  if (kept.length < 2) return { line: '', area: '' }
  let min = kept[0] ?? 0
  let max = kept[0] ?? 0
  for (const v of kept) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min || 1
  const x = (i: number) => SPARK_PAD + (i / (kept.length - 1)) * (SPARK_W - SPARK_PAD * 2)
  const y = (v: number) => SPARK_PAD + (1 - (v - min) / span) * (SPARK_H - SPARK_PAD * 2)
  let line = ''
  kept.forEach((v, i) => {
    line += `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)} `
  })
  const area = `${line}L${x(kept.length - 1).toFixed(1)},${(SPARK_H - SPARK_PAD).toFixed(1)} L${SPARK_PAD.toFixed(1)},${(SPARK_H - SPARK_PAD).toFixed(1)} Z`
  return { line: line.trim(), area }
}

function HorizonVisual({ site }: { site: Site }) {
  const { line, area } = sparkPaths(site.horizonDeg)
  const uid = `${site.id.replace(/[^a-z0-9]/gi, '')}`
  return (
    <VisualShell
      eyebrow="Terrain horizon · 1,440 bins"
      icon={<Mountain className="size-3.5" aria-hidden="true" />}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{site.name}</div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {fmtElevation(site.elevationM)} · {site.slopeDeg.toFixed(1)}° slope
          </span>
        </div>
        {line ? (
          <svg
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            className="mt-3 h-36 w-full sm:h-44"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Horizon elevation profile for ${site.name}: minimum ${site.horizonMinDeg.toFixed(1)} degrees, mean ${site.horizonMeanDeg.toFixed(1)} degrees, maximum ${site.horizonMaxDeg.toFixed(1)} degrees.`}
          >
            <defs>
              <linearGradient id={`hz-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <g className="text-terrain">
              <path d={area} fill={`url(#hz-${uid})`} stroke="none" />
              <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
        ) : (
          <p className="mt-3 font-mono text-[10.5px] text-muted-foreground">
            No horizon profile shipped for this point.
          </p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
          {[
            { k: 'Min ridge', v: `${site.horizonMinDeg.toFixed(1)}°` },
            { k: 'Mean ridge', v: `${site.horizonMeanDeg.toFixed(1)}°` },
            { k: 'Relief', v: `${site.reliefM.toFixed(0)} m` },
          ].map((s) => (
            <div key={s.k} className="min-w-0">
              <div className="truncate font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
                {s.k}
              </div>
              <div className="tabular mt-0.5 truncate font-display text-[17px] tracking-[-0.01em]">
                {s.v}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Open sky {(site.openSkyFrac * 100).toFixed(1)}%. Ray-marched every 0.25° from 20 m
          out to 220 km on the 20 m LOLA grid — this curve is the shipped data, plotted raw.
        </p>
      </div>
    </VisualShell>
  )
}

/* ——— Chapter 03 visual: Sun & Earth window strips ——— */

function WindowStrip({
  label,
  values,
  tone,
}: {
  label: string
  values: boolean[]
  tone: 'sun' | 'earth'
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-medium">{label}</span>
        <span className="font-mono text-[9.5px] text-muted-foreground">
          {values.filter(Boolean).length}/{values.length} lit samples
        </span>
      </div>
      <div className="flex gap-[2px]" role="img" aria-label={`${label}: ${values.filter(Boolean).length} of ${values.length} shown samples visible.`}>
        {values.map((lit, i) => (
          <span
            key={i}
            className={cn(
              'h-5 min-w-0 flex-1 rounded-[2px]',
              lit ? (tone === 'sun' ? 'bg-sun' : 'bg-earth') : 'bg-foreground/10',
            )}
          />
        ))}
      </div>
    </div>
  )
}

function WindowsVisual({
  focus,
  metrics,
  onOpenSite,
}: {
  focus: Site
  metrics: SiteMetrics | undefined
  onOpenSite: (id: string) => void
}) {
  const samples = metrics?.samples ?? []
  const stride = Math.max(1, Math.floor(samples.length / 120))
  const cols = samples.filter((_, i) => i % stride === 0).slice(0, 120)
  return (
    <VisualShell
      eyebrow="Visibility windows · Sun & Earth"
      icon={<Earth className="size-3.5" aria-hidden="true" />}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{focus.name}</div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {metrics ? `${samples.length.toLocaleString('en-US')} propagation samples` : 'awaiting scenario'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenSite(focus.id)}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none hover:border-[var(--border-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Timeline
          </button>
        </div>
        <div className="mt-4 space-y-3.5">
          <WindowStrip label="Sun up" values={cols.map((s) => s.sunVisible)} tone="sun" />
          <WindowStrip label="Earth in view" values={cols.map((s) => s.earthVisible)} tone="earth" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-3.5">
          <div className="min-w-0 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
            <div className="font-mono text-[9px] tracking-[0.1em] text-sun uppercase">Longest Sun</div>
            <div className="tabular mt-0.5 font-display text-[19px]">
              {metrics ? fmtHours(metrics.longestSunHours) : '—'}
            </div>
          </div>
          <div className="min-w-0 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
            <div className="font-mono text-[9px] tracking-[0.1em] text-earth uppercase">Longest Earth</div>
            <div className="tabular mt-0.5 font-display text-[19px]">
              {metrics ? fmtHours(metrics.longestEarthHours) : '—'}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          A body counts as visible when its upper limb clears the terrain at its azimuth —
          centre elevation plus angular radius beats the ridge. Strict about darkness, honest
          about dawn.
        </p>
      </div>
    </VisualShell>
  )
}

/* ——— Chapter 04 visual: transparent ranking ——— */

const WEIGHT_ORDER: WeightKey[] = ['sunlight', 'comm', 'flux', 'slope']
const WEIGHT_LABEL: Record<WeightKey, string> = {
  sunlight: 'Sunlight',
  comm: 'Earth link',
  flux: 'Solar flux',
  slope: 'Slope · cost',
}
const WEIGHT_BAR: Record<WeightKey, string> = {
  sunlight: 'bg-sun',
  comm: 'bg-earth',
  flux: 'bg-terrain',
  slope: 'bg-foreground/50',
}

function RankingVisual({
  ranked,
  metricsById,
  onOpenSite,
}: {
  ranked: RankedSite[]
  metricsById: Map<string, SiteMetrics>
  onOpenSite: (id: string) => void
}) {
  const total = WEIGHT_ORDER.reduce((sum, k) => sum + DEFAULT_WEIGHTS[k], 0) || 1
  const frontier = new Set(
    paretoFrontier(
      ranked.map((r) => r.site),
      metricsById,
    )
      .filter((p) => p.onFrontier)
      .map((p) => p.site.id),
  )
  const points = ranked
    .map((r) => {
      const m = metricsById.get(r.site.id)
      if (!m) return null
      return { id: r.site.id, name: r.site.name, x: m.sunlightPct, y: m.earthPct, top: r.rank <= 3 }
    })
    .filter((p): p is { id: string; name: string; x: number; y: number; top: boolean } => p !== null)
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x0 = Math.min(...xs, 0)
  const x1 = Math.max(...xs, 100)
  const y0 = Math.min(...ys, 0)
  const y1 = Math.max(...ys, 100)
  const px = (v: number) => 8 + ((v - x0) / (x1 - x0 || 1)) * 84
  const py = (v: number) => 92 - ((v - y0) / (y1 - y0 || 1)) * 84
  const leader = ranked[0] ?? null

  return (
    <VisualShell eyebrow="TOPSIS ranking · Pareto check" icon={<Scale className="size-3.5" aria-hidden="true" />}>
      <div className="min-w-0">
        <div className="space-y-2.5">
          {WEIGHT_ORDER.map((key) => {
            const share = (DEFAULT_WEIGHTS[key] / total) * 100
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11.5px] font-medium">{WEIGHT_LABEL[key]}</span>
                  <span className="tabular font-mono text-[10.5px] text-muted-foreground">
                    {share.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className={cn('h-full rounded-full', WEIGHT_BAR[key])} style={{ width: `${share}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        {points.length > 0 ? (
          <svg
            viewBox="0 0 100 100"
            className="mt-4 h-44 w-full sm:h-52"
            role="img"
            aria-label={`Sunlight versus Earth-visibility scatter for ${points.length} sites. ${frontier.size} sit on the Pareto frontier.`}
          >
            {[25, 50, 75].map((g) => (
              <g key={g} stroke="currentColor" className="text-foreground" strokeOpacity="0.08" strokeWidth="0.3">
                <line x1={g} y1="4" x2={g} y2="96" />
                <line x1="4" y1={g} x2="96" y2={g} />
              </g>
            ))}
            <text x="50" y="99.5" textAnchor="middle" fontSize="4.5" fill="currentColor" opacity="0.5" className="fill-muted-foreground">
              sunlight % →
            </text>
            <text x="1.5" y="50" textAnchor="middle" fontSize="4.5" fill="currentColor" opacity="0.5" className="fill-muted-foreground" transform="rotate(-90 1.5 50)">
              earth % →
            </text>
            {points.map((p) => {
              const on = frontier.has(p.id)
              return (
                <circle
                  key={p.id}
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r={on ? 3 : 2}
                  onClick={() => onOpenSite(p.id)}
                  className={cn(
                    'cursor-pointer outline-none focus-visible:stroke-ring',
                    on ? 'fill-sun' : p.top ? 'fill-earth' : 'fill-muted-foreground opacity-60',
                  )}
                  strokeWidth={on ? 1.2 : 0}
                  stroke="currentColor"
                >
                  <title>{`${p.name} — ${fmtPct(p.x, 1)} Sun, ${fmtPct(p.y, 1)} Earth`}</title>
                </circle>
              )
            })}
          </svg>
        ) : (
          <p className="mt-4 font-mono text-[10.5px] text-muted-foreground">
            Ranking appears once the scenario finishes computing.
          </p>
        )}
        <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-border/70 pt-3.5">
          <p className="min-w-0 truncate text-[11.5px] text-muted-foreground">
            {leader ? (
              <>
                Leader <span className="font-semibold text-foreground">{leader.site.name}</span>{' '}
                <span className="tabular font-mono">· {leader.score.toFixed(3)}</span>
              </>
            ) : (
              'No ranked sites yet.'
            )}
          </p>
          <span className="shrink-0 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
            {frontier.size} on frontier
          </span>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Weights are preferences, not mission requirements — move them and watch the rank move.
          The frontier answers a different question: which sites nothing beats on both axes.
        </p>
      </div>
    </VisualShell>
  )
}

/* ——— Chapters ——— */

export function Chapters({ sites, metricsById, ranked, active, onOpenSite }: ChaptersProps) {
  const focus: Site | null = ranked[0]?.site ?? sites[0] ?? null
  const focusMetrics = focus ? metricsById.get(focus.id) : undefined

  return (
    <div>
      {/* 01 — the problem */}
      <section id="chapter-01" aria-label="Chapter 1: the problem" className="relative scroll-mt-16 border-t border-border/60">
        <ChapterHead
          current={active === 'chapter-01'}
          no="01"
          kicker="The problem"
          title="A site is not a pin. It is a schedule."
          lede="Near the south pole the Sun circles the horizon instead of rising overhead, and Earth hangs almost still behind ridges. When the light arrives — and when the link drops — depends on the date, the mission length, and the ground underfoot."
        />
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="pt-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:py-16">
            <div className="w-full">
              {focus ? (
                <ScheduleVisual focus={focus} metrics={focusMetrics} onOpenSite={onOpenSite} />
              ) : (
                <p className="font-mono text-[11px] text-muted-foreground">No sites loaded yet.</p>
              )}
            </div>
          </div>
          <div className="pb-16 lg:pb-24 lg:pt-10">
            <Step index="01 / Light" title="Sunlight comes in seasons, not days." tone="sun">
              <p>
                A polar site can bask for weeks and then go dark for weeks. Static illumination
                maps show the average; they never tell you whether <em>your</em> 180-day window
                lands in the light.
              </p>
            </Step>
            <Step index="02 / Link" title="Earth can vanish behind a ridge." tone="earth">
              <p>
                Direct-to-Earth communication needs line of sight to a nearly fixed point in a
                black sky. One massif between you and it, and a sun-rich site goes radio-dark —
                no relay, no link budget, no data home.
              </p>
            </Step>
            <Step index="03 / Clock" title="So every site gets an event clock." tone="mix">
              <p>
                Next sunset. Next earthset. Longest unbroken stretch of each. SelenoGrid
                propagates the real geometry over your whole scenario and reads the calendar
                out loud — a screening aid for trade-offs, not a flight certification.
              </p>
            </Step>
          </div>
        </div>
      </section>

      {/* 02 — real terrain */}
      <section id="chapter-02" aria-label="Chapter 2: real terrain" className="relative scroll-mt-16 border-t border-border/60">
        <ChapterHead
          current={active === 'chapter-02'}
          no="02"
          kicker="Real terrain"
          title="1,440 horizons, measured — not painted."
          lede="Every site carries a full 360° terrain horizon ray-marched on 20 m LOLA topography: one elevation angle every quarter degree, from 20 metres out to 220 kilometres."
        />
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="pt-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:py-16">
            <div className="w-full">{focus ? <HorizonVisual site={focus} /> : null}</div>
          </div>
          <div className="pb-16 lg:pb-24 lg:pt-10">
            <Step index="01 / Grid" title="20 metres per pixel, pole-wide." tone="terrain">
              <p>
                The terrain product is NASA/GSFC LRO LOLA south-polar DEM{' '}
                <span className="font-mono text-[12px]">ldem_80s_20m</span> — 30,400 × 30,400
                pixels at 20 m, referenced to a 1,737.4 km sphere, served from the PDS
                Geosciences Node.
              </p>
            </Step>
            <Step index="02 / Rays" title="Spherical geometry, every bin." tone="terrain">
              <p>
                Along each ray the extractor follows exact spherical elevation angles — lunar
                curvature included, because at 100 km the surface drops ~2.9 km below the tangent
                plane. The same pass measures local slope, aspect, open sky, and relief.
              </p>
            </Step>
            <Step index="03 / Honesty" title="Points, not ellipses." tone="mix">
              <p>
                NASA published nine regions, not nine coordinates. Our 18 points are
                representative terrain samples — a different point a few kilometres away can rank
                differently. Custom pins sample a coarser 640 m grid: screening, clearly
                labelled as such.
              </p>
            </Step>
          </div>
        </div>
      </section>

      {/* 03 — Sun & Earth */}
      <section id="chapter-03" aria-label="Chapter 3: Sun and Earth" className="relative scroll-mt-16 border-t border-border/60">
        <ChapterHead
          current={active === 'chapter-03'}
          no="03"
          kicker="Sun & Earth"
          title="Two clocks, one sky."
          lede="Topocentric Sun and Earth positions from a Meeus/IAU astronomy engine, tested against JPL Horizons — then masked by the real horizon, sample by sample, for your whole mission window."
        />
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="pt-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:py-16">
            <div className="w-full">
              {focus ? (
                <WindowsVisual focus={focus} metrics={focusMetrics} onOpenSite={onOpenSite} />
              ) : null}
            </div>
          </div>
          <div className="pb-16 lg:pb-24 lg:pt-10">
            <Step index="01 / Rule" title="The upper limb decides." tone="sun">
              <p>
                A body is visible when its upper limb clears the ridge: centre elevation plus
                angular radius beats the terrain at that azimuth — ~0.27° for the Sun, ~0.9°
                for Earth. Strict about declaring dark; only a fully hidden disk counts.
              </p>
            </Step>
            <Step index="02 / Windows" title="Windows, not averages." tone="earth">
              <p>
                Share of window, longest unbroken stretch, next sunset and earthset. The solar
                flux proxy is the positive part of sin(elevation) when visible — a crude
                availability proxy, explicitly not power sizing, panels, or batteries.
              </p>
            </Step>
          </div>
        </div>
      </section>

      {/* 04 — transparent ranking */}
      <section id="chapter-04" aria-label="Chapter 4: transparent ranking" className="relative scroll-mt-16 border-t border-border/60">
        <ChapterHead
          current={active === 'chapter-04'}
          no="04"
          kicker="Transparent ranking"
          title="A ranking you can argue with."
          lede="Four criteria, one published method, every weight exposed. Nothing is hidden in a model file — the whole decision layer fits on one screen and recomputes live."
        />
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="pt-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:py-16">
            <div className="w-full">
              <RankingVisual ranked={ranked} metricsById={metricsById} onOpenSite={onOpenSite} />
            </div>
          </div>
          <div className="pb-16 lg:pb-24 lg:pt-10">
            <Step index="01 / TOPSIS" title="Closeness to an explicit ideal." tone="mix">
              <p>
                TOPSIS vector-normalises sunlight, Earth visibility, solar flux, and slope-as-cost,
                then scores each site by closeness to the ideal best — and distance from the
                ideal worst. Same precedent as the published Artemis TOPSIS site studies.
              </p>
            </Step>
            <Step index="02 / Weights" title="Your preferences, your rank." tone="sun">
              <p>
                The weights are not mission requirements; the rank is sensitive to them, which is
                exactly why they are sliders and not constants. Favour slope and watch massifs
                fall. Favour link and watch the radio-dark drop.
              </p>
            </Step>
            <Step index="03 / Frontier" title="The Pareto check." tone="earth">
              <p>
                Independent of every weight: the frontier of sites nothing beats on both sunlight
                and Earth visibility. Off-frontier means dominated. On-frontier still means
                steep — the full ranking is where slope gets its say.
              </p>
            </Step>
          </div>
        </div>
      </section>
    </div>
  )
}
