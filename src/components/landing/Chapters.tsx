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

const TONE_SOLID: Record<Tone, string> = {
  sun: 'bg-sun',
  earth: 'bg-earth',
  terrain: 'bg-terrain',
  mix: 'bg-foreground/60',
}

/* Inline fallback for the missing Backgrounds / lp-* kit.
   All motion here is transform/opacity only (60fps), paused offscreen
   via [data-live="false"] and frozen under reduced motion. */
const CH_CSS = `
.ch-stat-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  padding: 4px 11px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.03em;
  white-space: nowrap;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.ch-stat-chip strong {
  color: var(--foreground);
  font-weight: 600;
}
.lp-glow-divider {
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--sun) 60%, transparent) 28%,
    color-mix(in srgb, var(--earth) 60%, transparent) 72%,
    transparent 100%
  );
  opacity: 0.55;
}
.ch-hot-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--sun);
  box-shadow: 0 0 6px color-mix(in srgb, var(--sun) 80%, transparent);
  animation: lp-breathe 2.4s ease-in-out infinite;
  flex-shrink: 0;
}
.ch-track {
  position: relative;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--foreground) 12%, transparent);
}
.ch-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
}
.ch-shimmer-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 35%;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, #ffffff 65%, transparent),
    transparent
  );
  animation: ch-shimmer-x 2.6s ease-in-out infinite;
  will-change: transform;
}
@keyframes ch-shimmer-x {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(310%); }
}
.ch-sweep {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, transparent, var(--terrain), transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--terrain) 70%, transparent);
  will-change: transform;
  opacity: 0.85;
  pointer-events: none;
}
.ch-playhead {
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--sun), var(--earth));
  box-shadow: 0 0 10px color-mix(in srgb, var(--earth) 60%, transparent);
  will-change: transform;
  opacity: 0.9;
  pointer-events: none;
}
.ch-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: ch-halo 2.4s ease-out infinite;
  pointer-events: none;
}
@keyframes ch-halo {
  0% { transform: scale(0.6); opacity: 0.9; }
  70% { transform: scale(1.9); opacity: 0; }
  100% { transform: scale(1.9); opacity: 0; }
}
[data-live="false"] [data-anim] {
  animation-play-state: paused !important;
}
@media (prefers-reduced-motion: reduce) {
  .ch-hot-dot,
  .ch-shimmer-line,
  .ch-halo {
    animation: none !important;
  }
}
`

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

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    return undefined
  }, [])
  return reduced
}

/** Loose on-screen flag (any pixel visible) for pausing ambient motion. */
function useVisible<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === element) setVisible(entry.isIntersecting)
        }
      },
      { threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

/**
 * Looping playhead driven by rAF - transform-only (translateX), paused when
 * offscreen and parked/hidden under reduced motion.
 */
function useSweep(durationMs: number) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const { ref: liveRef, visible } = useVisible<HTMLDivElement>()
  const reduced = useReducedMotion()
  const live = visible && !reduced

  useEffect(() => {
    const head = headRef.current
    if (!live) {
      if (head) {
        head.style.transform = 'translateX(-8px)'
        head.style.opacity = reduced ? '0' : '0.9'
      }
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const wrap = wrapRef.current
      const el = headRef.current
      if (wrap && el) {
        const w = wrap.clientWidth
        const p = ((now - t0) % durationMs) / durationMs
        el.style.transform = `translateX(${(p * (w + 16) - 8).toFixed(1)}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live, reduced, durationMs])

  return { wrapRef, headRef, liveRef, live }
}

type PullStat = { value: string; label: string; sub?: string }
type StepBar = { label: string; value: number | undefined; tone: 'sun' | 'earth' }

function Step({
  index,
  title,
  tone,
  pull,
  bars,
  children,
}: {
  index: string
  title: string
  tone: Tone
  pull?: PullStat
  bars?: StepBar[]
  children: ReactNode
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const kids: ReactNode[] = Array.isArray(children) ? children : [children]
  const aside = pull || (bars && bars.length > 0)
  return (
    <div
      ref={ref}
      className={cn(
        'flex min-h-[44vh] items-center py-6 transition-opacity duration-500 motion-reduce:transition-none lg:min-h-[44vh]',
        inView ? 'opacity-100' : 'opacity-40 motion-reduce:opacity-100',
      )}
    >
      <div className={cn('relative w-full max-w-md border-l-2 pl-5 sm:pl-7', TONE_BAR[tone])}>
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0 bottom-0 left-[-2px] w-[2px] origin-top transition-transform duration-700 motion-reduce:transition-none',
            TONE_SOLID[tone],
            inView ? 'scale-y-100' : 'scale-y-0 motion-reduce:scale-y-100',
          )}
        />
        <div className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
          {index}
        </div>
        <h3 className="mt-2 font-display text-[24px] leading-[1.08] tracking-[-0.02em] text-balance sm:text-[30px]">
          {title}
        </h3>
        <div className="mt-3 flex min-w-0 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-start">
          <div className="min-w-0 flex-1 space-y-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {kids.map((kid, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className={cn(
                  'transition-[opacity,transform] duration-500 motion-reduce:transition-none',
                  inView
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-2 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
                )}
                style={{ transitionDelay: inView ? `${i * 70}ms` : '0ms' }}
              >
                {kid}
              </div>
            ))}
          </div>
          {aside ? (
            <div
              className={cn(
                'min-w-0 shrink-0 transition-[opacity,transform] duration-500 motion-reduce:transition-none min-[480px]:w-40',
                inView
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-2 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
              )}
              style={{ transitionDelay: inView ? `${kids.length * 70}ms` : '0ms' }}
            >
              {pull ? (
                <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
                  <div className="tabular font-display text-[19px] leading-tight tracking-[-0.01em] text-foreground">
                    {pull.value}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {pull.label}
                  </div>
                  {pull.sub ? (
                    <div className="tabular mt-1 font-mono text-[10px] text-muted-foreground">
                      {pull.sub}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {bars && bars.length > 0 ? (
                <div className={cn('space-y-2.5', pull && 'mt-2.5')}>
                  {bars.map((b) => (
                    <MetricBar key={b.label} label={b.label} value={b.value} tone={b.tone} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
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
          {value === undefined ? '-' : fmtPct(value, 1)}
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

function EventLine({
  label,
  value,
  start,
  hot,
}: {
  label: string
  value: number | null
  start: number
  hot?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-baseline justify-between gap-3 rounded-md font-mono text-[10.5px]',
        hot && '-mx-1.5 bg-sun-soft/70 px-1.5 py-1',
      )}
    >
      <span className="flex min-w-0 shrink-0 items-center gap-1.5 text-muted-foreground">
        {hot ? <span aria-hidden="true" className="ch-hot-dot" data-anim /> : null}
        {label}
      </span>
      <span className={cn('tabular truncate', hot && 'font-semibold text-foreground')}>
        {value === null ? '-' : `${fmtDateTimeUtc(value)} · ${fmtHours((value - start) / 3_600_000)}`}
      </span>
    </div>
  )
}

type StatChip = { value: string; label: string }

function StatChips({ items }: { items: StatChip[] }) {
  if (items.length === 0) return null
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Key figures">
      {items.map((c) => (
        <li key={`${c.value}·${c.label}`} className="ch-stat-chip">
          <strong className="tabular">{c.value}</strong>
          <span>{c.label}</span>
        </li>
      ))}
    </ul>
  )
}

function GlowDivider() {
  return <div aria-hidden="true" className="lp-glow-divider" />
}

function ChapterHead({
  no,
  kicker,
  title,
  lede,
  current,
  chips,
}: {
  no: string
  kicker: string
  title: string
  lede: string
  current: boolean
  chips?: StatChip[]
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-20 sm:px-8 lg:pt-28">
      <p className={cn('eyebrow flex items-center gap-2', current && 'text-foreground')}>
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-1.5 rounded-full transition-colors motion-reduce:transition-none',
            current ? 'bg-sun' : 'bg-foreground/25',
          )}
        />
        Chapter {no}: {kicker}
      </p>
      <h2 className="mt-3 max-w-[22ch] font-display text-[34px] leading-[1.02] tracking-[-0.02em] text-balance sm:text-[52px]">
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
        {lede}
      </p>
      {chips ? <StatChips items={chips} /> : null}
    </div>
  )
}

type NextEvent = { label: string; t: number }

function nextEventOf(metrics: SiteMetrics | undefined): NextEvent | null {
  if (!metrics) return null
  const candidates: { label: string; t: number | null }[] = [
    { label: 'Next sunset', t: metrics.nextSunset },
    { label: 'Next sunrise', t: metrics.nextSunrise },
    { label: 'Next earthset', t: metrics.nextEarthset },
    { label: 'Next earthrise', t: metrics.nextEarthrise },
  ]
  let best: NextEvent | null = null
  for (const c of candidates) {
    if (c.t === null) continue
    if (!best || c.t < best.t) best = { label: c.label, t: c.t }
  }
  return best
}

/* --- Chapter 01 visual: schedule event clock --- */

function ScheduleVisual({
  focus,
  metrics,
  onOpenSite,
}: {
  focus: Site
  metrics: SiteMetrics | undefined
  onOpenSite: (id: string) => void
}) {
  const { ref, visible } = useVisible<HTMLDivElement>()
  const reduced = useReducedMotion()
  const next = nextEventOf(metrics)
  const span = metrics ? metrics.end - metrics.start : 0
  const frac =
    metrics && next && span > 0
      ? Math.min(1, Math.max(0, (next.t - metrics.start) / span))
      : 0
  const short = next ? next.label.replace(/^Next\s+/, '') : ''
  return (
    <div ref={ref} data-live={visible && !reduced} className="min-w-0">
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
          <div className="mt-4 space-y-1 border-t border-border/70 pt-3.5">
            {metrics ? (
              <>
                <EventLine label="Next sunset" value={metrics.nextSunset} start={metrics.start} hot={next?.label === 'Next sunset'} />
                <EventLine label="Next sunrise" value={metrics.nextSunrise} start={metrics.start} hot={next?.label === 'Next sunrise'} />
                <EventLine label="Next earthset" value={metrics.nextEarthset} start={metrics.start} hot={next?.label === 'Next earthset'} />
                <EventLine label="Next earthrise" value={metrics.nextEarthrise} start={metrics.start} hot={next?.label === 'Next earthrise'} />
                {next ? (
                  <div className="mt-2.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
                    <div className="flex items-baseline justify-between gap-2 font-mono text-[9.5px]">
                      <span className="truncate tracking-[0.08em] text-muted-foreground uppercase">
                        T−{fmtHours((next.t - metrics.start) / 3_600_000)} to {short}
                      </span>
                      <span className="tabular shrink-0 text-muted-foreground">
                        {fmtPct(frac * 100, 0)} in
                      </span>
                    </div>
                    <div
                      className="ch-track mt-1.5"
                      role="img"
                      aria-label={`${next.label} in ${fmtHours((next.t - metrics.start) / 3_600_000)}, ${fmtPct(frac * 100, 0)} into the scenario window.`}
                    >
                      <div className="ch-fill bg-sun" style={{ transform: `scaleX(${frac})` }} />
                      <div className="ch-shimmer-line" data-anim aria-hidden="true" />
                    </div>
                  </div>
                ) : null}
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
    </div>
  )
}

/* --- Chapter 02 visual: horizon sparkline from real LOLA data --- */

const SPARK_W = 360
const SPARK_H = 132
const SPARK_PAD = 8

function sparkX(i: number, n: number): number {
  return SPARK_PAD + (i / Math.max(1, n - 1)) * (SPARK_W - SPARK_PAD * 2)
}

function sparkY(v: number, min: number, max: number): number {
  return SPARK_PAD + (1 - (v - min) / (max - min || 1)) * (SPARK_H - SPARK_PAD * 2)
}

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
  let line = ''
  kept.forEach((v, i) => {
    line += `${i === 0 ? 'M' : 'L'}${sparkX(i, kept.length).toFixed(1)},${sparkY(v, min, max).toFixed(1)} `
  })
  const area = `${line}L${sparkX(kept.length - 1, kept.length).toFixed(1)},${(SPARK_H - SPARK_PAD).toFixed(1)} L${SPARK_PAD.toFixed(1)},${(SPARK_H - SPARK_PAD).toFixed(1)} Z`
  return { line: line.trim(), area }
}

function HorizonVisual({ site }: { site: Site }) {
  const { line, area } = sparkPaths(site.horizonDeg)
  const { wrapRef, headRef, liveRef, live } = useSweep(9000)
  const [hover, setHover] = useState<number | null>(null)
  const uid = `${site.id.replace(/[^a-z0-9]/gi, '')}`

  const stride = Math.max(1, Math.ceil(site.horizonDeg.length / 180))
  const keptCount = Math.ceil(site.horizonDeg.length / stride)
  let hoverIdx: number | null = null
  if (hover !== null && site.horizonDeg.length > 1) {
    hoverIdx = Math.min(
      site.horizonDeg.length - 1,
      Math.max(0, Math.round(hover * (site.horizonDeg.length - 1))),
    )
  }
  const hoverBin = hoverIdx !== null ? Math.round(hoverIdx / stride) : null
  const hoverEl = hoverIdx !== null ? site.horizonDeg[hoverIdx] : undefined
  const hoverDist =
    hoverIdx !== null && hoverIdx < site.horizonDistKm.length
      ? site.horizonDistKm[hoverIdx]
      : undefined
  const crossX =
    hoverBin !== null && keptCount > 1 ? sparkX(hoverBin, keptCount) : null
  let crossY: number | null = null
  if (crossX !== null && hoverEl !== undefined) {
    let min = site.horizonDeg[0] ?? 0
    let max = site.horizonDeg[0] ?? 0
    for (let i = 0; i < site.horizonDeg.length; i += stride) {
      const v = site.horizonDeg[i] ?? 0
      if (v < min) min = v
      if (v > max) max = v
    }
    crossY = sparkY(hoverEl, min, max)
  }

  return (
    <div ref={liveRef} data-live={live} className="min-w-0">
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
            <div
              ref={wrapRef}
              className="relative mt-3"
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                if (r.width > 0) {
                  setHover(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
                }
              }}
              onPointerLeave={() => setHover(null)}
            >
              <svg
                viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                className="h-36 w-full sm:h-44"
                preserveAspectRatio="none"
                role="img"
                tabIndex={0}
                onFocus={() => setHover((h) => h ?? 0.5)}
                onBlur={() => setHover(null)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
                  e.preventDefault()
                  const step = 1 / Math.max(1, site.horizonDeg.length - 1)
                  setHover((h) => {
                    const base = h ?? 0.5
                    return Math.min(1, Math.max(0, base + (e.key === 'ArrowRight' ? step : -step)))
                  })
                }}
                aria-label={`Horizon elevation profile for ${site.name}: minimum ${site.horizonMinDeg.toFixed(1)} degrees, mean ${site.horizonMeanDeg.toFixed(1)} degrees, maximum ${site.horizonMaxDeg.toFixed(1)} degrees. Hover or use arrow keys to inspect bins.`}
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
                {crossX !== null && crossY !== null ? (
                  <g aria-hidden="true">
                    <line
                      x1={crossX}
                      y1={SPARK_PAD}
                      x2={crossX}
                      y2={SPARK_H - SPARK_PAD}
                      stroke="currentColor"
                      className="text-foreground"
                      opacity={0.4}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <circle cx={crossX} cy={crossY} r={3.5} className="fill-terrain" stroke="var(--card)" strokeWidth={1.5} />
                  </g>
                ) : null}
              </svg>
              <div ref={headRef} aria-hidden="true" className="ch-sweep" />
            </div>
          ) : (
            <p className="mt-3 font-mono text-[10.5px] text-muted-foreground">
              No horizon profile shipped for this point.
            </p>
          )}
          <p aria-live="polite" className="tabular mt-2 min-h-[16px] font-mono text-[10px] text-muted-foreground">
            {hoverIdx !== null && hoverEl !== undefined
              ? `az ${((hoverIdx * 360) / Math.max(1, site.horizonDeg.length)).toFixed(2)}° · el ${hoverEl.toFixed(1)}°${hoverDist !== undefined ? ` · ridge ${hoverDist.toFixed(1)} km` : ''}`
              : 'Hover the curve · every point is a real quarter-degree bin'}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
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
            out to 220 km on the 20 m LOLA grid. This curve is the shipped data, plotted raw.
          </p>
        </div>
      </VisualShell>
    </div>
  )
}

/* --- Chapter 03 visual: Sun & Earth window strips --- */

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
            // eslint-disable-next-line react/no-array-index-key
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
  const { wrapRef, headRef, liveRef, live } = useSweep(7000)
  return (
    <div ref={liveRef} data-live={live} className="min-w-0">
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
          <div ref={wrapRef} className="relative mt-4">
            <div className="space-y-3.5">
              <WindowStrip label="Sun up" values={cols.map((s) => s.sunVisible)} tone="sun" />
              <WindowStrip label="Earth in view" values={cols.map((s) => s.earthVisible)} tone="earth" />
            </div>
            <div ref={headRef} aria-hidden="true" className="ch-playhead" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-3.5">
            <div className="min-w-0 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
              <div className="font-mono text-[9px] tracking-[0.1em] text-sun uppercase">Longest Sun</div>
              <div className="tabular mt-0.5 font-display text-[19px]">
                {metrics ? fmtHours(metrics.longestSunHours) : '-'}
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
              <div className="font-mono text-[9px] tracking-[0.1em] text-earth uppercase">Longest Earth</div>
              <div className="tabular mt-0.5 font-display text-[19px]">
                {metrics ? fmtHours(metrics.longestEarthHours) : '-'}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            A body counts as visible when its upper limb clears the terrain at its azimuth:
            centre elevation plus angular radius beats the ridge. Strict about darkness, honest
            about dawn.
          </p>
        </div>
      </VisualShell>
    </div>
  )
}

/* --- Chapter 04 visual: transparent ranking --- */

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
  frontier,
  onOpenSite,
}: {
  ranked: RankedSite[]
  metricsById: Map<string, SiteMetrics>
  frontier: Set<string>
  onOpenSite: (id: string) => void
}) {
  const total = WEIGHT_ORDER.reduce((sum, k) => sum + DEFAULT_WEIGHTS[k], 0) || 1
  const { ref, visible } = useVisible<HTMLDivElement>()
  const reduced = useReducedMotion()
  const drawn = visible || reduced
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
  const leaderPoint = leader ? points.find((p) => p.id === leader.site.id) : undefined
  const frontierPts = points
    .filter((p) => frontier.has(p.id))
    .sort((a, b) => a.x - b.x)
  const frontierPath = frontierPts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`)
    .join(' ')

  return (
    <div ref={ref} data-live={visible && !reduced} className="min-w-0">
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
              {frontierPath && frontierPts.length >= 2 ? (
                <path
                  d={frontierPath}
                  pathLength={100}
                  fill="none"
                  className="stroke-sun"
                  strokeWidth={1}
                  opacity={0.85}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 100,
                    strokeDashoffset: drawn ? 0 : 100,
                    transition: reduced
                      ? 'none'
                      : 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
              ) : null}
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
                    <title>{`${p.name} \u00b7 ${fmtPct(p.x, 1)} Sun, ${fmtPct(p.y, 1)} Earth`}</title>
                  </circle>
                )
              })}
              {leaderPoint ? (
                <circle
                  cx={px(leaderPoint.x)}
                  cy={py(leaderPoint.y)}
                  r={5}
                  fill="none"
                  data-anim
                  aria-hidden="true"
                  className="ch-halo stroke-sun"
                  strokeWidth={1.2}
                />
              ) : null}
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
            Weights are preferences, not mission requirements, so move them and watch the rank move.
            The frontier answers a different question: which sites nothing beats on both axes.
          </p>
        </div>
      </VisualShell>
    </div>
  )
}

/* --- Chapters --- */

function trimNum(v: number): string {
  return `${Math.round(v * 100) / 100}`
}

export function Chapters({ sites, metricsById, ranked, active, onOpenSite }: ChaptersProps) {
  const focus: Site | null = ranked[0]?.site ?? sites[0] ?? null
  const focusMetrics = focus ? metricsById.get(focus.id) : undefined
  const leader = ranked[0] ?? null
  const frontier = new Set(
    paretoFrontier(
      ranked.map((r) => r.site),
      metricsById,
    )
      .filter((p) => p.onFrontier)
      .map((p) => p.site.id),
  )
  const next = nextEventOf(focusMetrics)

  const ch1Chips: StatChip[] = focusMetrics
    ? [
        { value: fmtPct(focusMetrics.sunlightPct, 1), label: 'Sun share' },
        { value: fmtPct(focusMetrics.earthPct, 1), label: 'Earth link' },
        { value: fmtHours(focusMetrics.longestSunHours), label: 'longest Sun' },
        { value: fmtHours(focusMetrics.longestEarthHours), label: 'longest Earth' },
      ]
    : [
        { value: `${sites.length}`, label: 'points screened' },
        { value: '1 s', label: 'event refinement' },
      ]

  const ch2Chips: StatChip[] = [
    { value: '1,440', label: 'bins / site' },
    { value: '0.25°', label: 'azimuth steps' },
    { value: '220 km', label: 'ray range' },
    { value: '20 m', label: 'LOLA grid' },
  ]

  const ch3Chips: StatChip[] = focusMetrics
    ? [
        { value: focusMetrics.samples.length.toLocaleString('en-US'), label: 'samples' },
        { value: `${trimNum(focusMetrics.stepMs / 3_600_000)} h`, label: 'time step' },
        { value: `${focusMetrics.sunWindows.length}`, label: 'sun windows' },
        { value: `${focusMetrics.earthWindows.length}`, label: 'earth windows' },
      ]
    : [
        { value: 'Meeus/IAU', label: 'engine' },
        { value: '<0.02°', label: 'vs JPL Horizons' },
      ]

  const ch4Chips: StatChip[] =
    leader && ranked.length > 0
      ? [
          { value: `${ranked.length}`, label: 'sites ranked' },
          { value: `${frontier.size}`, label: 'on frontier' },
          { value: '4', label: 'open criteria' },
          { value: leader.score.toFixed(1), label: `leads · ${leader.site.shortName}` },
        ]
      : [
          { value: '4', label: 'open criteria' },
          { value: 'TOPSIS', label: 'live weights' },
        ]

  return (
    <div>
      <style>{CH_CSS}</style>
      {/* 01 - the problem */}
      <section id="chapter-01" aria-label="Chapter 1: the problem" className="relative scroll-mt-16 border-t border-border/60">
        <ChapterHead
          current={active === 'chapter-01'}
          no="01"
          kicker="The problem"
          title="Sunlight and the Earth link shift across the window."
          lede="Near the south pole the Sun circles the horizon instead of rising overhead, and Earth hangs almost still behind ridges. When the light arrives, and when the link drops, depends on the date, the mission length, and the ground underfoot."
          chips={ch1Chips}
        />
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
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
            <Step
              index="01 / Light"
              title="Polar sunlight arrives in weeks-long stretches."
              tone="sun"
              bars={
                focusMetrics
                  ? [{ label: 'Focus-site sunlight', value: focusMetrics.sunlightPct, tone: 'sun' }]
                  : undefined
              }
            >
              <p>
                A polar site can bask for weeks and then go dark for weeks. Static illumination
                maps show the average; they never tell you whether <em>your</em> 180-day window
                lands in the light.
              </p>
            </Step>
            <Step
              index="02 / Link"
              title="A ridge can cut the direct Earth link."
              tone="earth"
              bars={
                focusMetrics
                  ? [{ label: 'Focus-site Earth link', value: focusMetrics.earthPct, tone: 'earth' }]
                  : undefined
              }
            >
              <p>
                Direct-to-Earth communication needs line of sight to a nearly fixed point in a
                black sky. One massif between you and it, and a sun-rich site goes radio-dark.
                No relay, no link budget, no data home.
              </p>
            </Step>
            <Step
              index="03 / Clock"
              title="Every site gets sunset and earthset times."
              tone="mix"
              pull={
                focusMetrics && next
                  ? {
                      value: `T−${fmtHours((next.t - focusMetrics.start) / 3_600_000)}`,
                      label: `${next.label.toLowerCase()} · focus site`,
                      sub: 'live from this scenario',
                    }
                  : undefined
              }
            >
              <p>
                Next sunset. Next earthset. Longest unbroken stretch of each. SelenoGrid
                propagates the real geometry over your whole scenario and reads the calendar
                out loud, a screening aid for trade-offs, not a flight certification.
              </p>
            </Step>
          </div>
        </div>
      </section>

      <GlowDivider />

      {/* 02 - real terrain */}
      <section id="chapter-02" aria-label="Chapter 2: real terrain" className="relative scroll-mt-16 bg-foreground/[0.018] dark:bg-white/[0.022]">
        <ChapterHead
          current={active === 'chapter-02'}
          no="02"
          kicker="Real terrain"
          title="Full horizons from 20 m LOLA topography."
          lede="Every site carries a full 360° terrain horizon ray-marched on 20 m LOLA topography: one elevation angle every quarter degree, from 20 metres out to 220 kilometres."
          chips={ch2Chips}
        />
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="pt-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:py-16">
            <div className="w-full">{focus ? <HorizonVisual site={focus} /> : null}</div>
          </div>
          <div className="pb-16 lg:pb-24 lg:pt-10">
            <Step
              index="01 / Grid"
              title="20 m pixels across the south pole."
              tone="terrain"
              pull={{ value: '30,400²', label: 'pixels per side · 20 m LOLA grid' }}
            >
              <p>
                The terrain product is NASA/GSFC LRO LOLA south-polar DEM{' '}
                <span className="font-mono text-[12px]">ldem_80s_20m</span>, 30,400 × 30,400
                pixels at 20 m, referenced to a 1,737.4 km sphere, served from the PDS
                Geosciences Node.
              </p>
            </Step>
            <Step
              index="02 / Rays"
              title="Rays traced with lunar curvature included."
              tone="terrain"
              pull={
                focus
                  ? {
                      value: `${(focus.openSkyFrac * 100).toFixed(1)}%`,
                      label: 'open sky · focus site',
                      sub: `${focus.reliefM.toFixed(0)} m relief`,
                    }
                  : undefined
              }
            >
              <p>
                Along each ray the extractor follows exact spherical elevation angles, lunar
                curvature included, because at 100 km the surface drops ~2.9 km below the tangent
                plane. The same pass measures local slope, aspect, open sky, and relief.
              </p>
            </Step>
            <Step
              index="03 / Honesty"
              title="Representative points inside published regions."
              tone="mix"
              pull={{ value: `${sites.length}`, label: 'representative points · NASA + reference' }}
            >
              <p>
                NASA published nine regions, not nine coordinates. Our 18 points are
                representative terrain samples. A different point a few kilometres away can rank
                differently. Custom pins sample a coarser 640 m grid: screening, clearly
                labelled as such.
              </p>
            </Step>
          </div>
        </div>
      </section>

      <GlowDivider />

      {/* 03 - Sun & Earth */}
      <section id="chapter-03" aria-label="Chapter 3: Sun and Earth" className="relative scroll-mt-16">
        <ChapterHead
          current={active === 'chapter-03'}
          no="03"
          kicker="Sun & Earth"
          title="Sun and Earth positions checked against terrain."
          lede="Topocentric Sun and Earth positions from a Meeus/IAU astronomy engine, tested against JPL Horizons, then masked by the real horizon, sample by sample, for your whole mission window."
          chips={ch3Chips}
        />
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="pt-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:py-16">
            <div className="w-full">
              {focus ? (
                <WindowsVisual focus={focus} metrics={focusMetrics} onOpenSite={onOpenSite} />
              ) : null}
            </div>
          </div>
          <div className="pb-16 lg:pb-24 lg:pt-10">
            <Step
              index="01 / Rule"
              title="A body counts when its limb clears the ridge."
              tone="sun"
              pull={{ value: '+0.27° / +0.9°', label: 'Sun / Earth limb radii' }}
            >
              <p>
                A body is visible when its upper limb clears the ridge: centre elevation plus
                angular radius beats the terrain at that azimuth: ~0.27° for the Sun, ~0.9°
                for Earth. Strict about declaring dark; only a fully hidden disk counts.
              </p>
            </Step>
            <Step
              index="02 / Windows"
              title="Longest stretches and window shares."
              tone="earth"
              pull={
                focusMetrics
                  ? {
                      value: fmtHours(focusMetrics.longestSunHours),
                      label: 'longest unbroken Sun',
                      sub: `Earth ${fmtHours(focusMetrics.longestEarthHours)}`,
                    }
                  : undefined
              }
            >
              <p>
                Share of window, longest unbroken stretch, next sunset and earthset. The solar
                flux proxy is the positive part of sin(elevation) when visible, a crude
                availability proxy, explicitly not power sizing, panels, or batteries.
              </p>
            </Step>
          </div>
        </div>
      </section>

      <GlowDivider />

      {/* 04 - transparent ranking */}
      <section id="chapter-04" aria-label="Chapter 4: transparent ranking" className="relative scroll-mt-16 bg-foreground/[0.018] dark:bg-white/[0.022]">
        <ChapterHead
          current={active === 'chapter-04'}
          no="04"
          kicker="Transparent ranking"
          title="Four criteria with weights you set."
          lede="Four criteria, one published method, every weight exposed. Nothing is hidden in a model file. The whole decision layer fits on one screen and recomputes live."
          chips={ch4Chips}
        />
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div className="pt-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:py-16">
            <div className="w-full">
              <RankingVisual ranked={ranked} metricsById={metricsById} frontier={frontier} onOpenSite={onOpenSite} />
            </div>
          </div>
          <div className="pb-16 lg:pb-24 lg:pt-10">
            <Step
              index="01 / TOPSIS"
              title="Distance from the best and worst case."
              tone="mix"
              pull={{ value: '35 / 30 / 15 / 20', label: 'default weights % · Sun / Earth / Flux / Slope' }}
            >
              <p>
                TOPSIS vector-normalises sunlight, Earth visibility, solar flux, and slope-as-cost,
                then scores each site by closeness to the ideal best, and distance from the
                ideal worst. Same precedent as the published Artemis TOPSIS site studies.
              </p>
            </Step>
            <Step
              index="02 / Weights"
              title="Sliders move the ranking live."
              tone="sun"
              pull={
                leader
                  ? {
                      value: leader.site.shortName,
                      label: `leads TOPSIS · ${leader.score.toFixed(1)}`,
                      sub: frontier.has(leader.site.id) ? 'on the Pareto frontier' : 'off the frontier',
                    }
                  : undefined
              }
            >
              <p>
                The weights are not mission requirements; the rank is sensitive to them, which is
                exactly why they are sliders and not constants. Favour slope and watch massifs
                fall. Favour link and watch the radio-dark drop.
              </p>
            </Step>
            <Step
              index="03 / Frontier"
              title="Sites unbeaten on both axes."
              tone="earth"
              pull={{ value: `${frontier.size} sites`, label: 'nothing beats them on both axes' }}
            >
              <p>
                Independent of every weight: the frontier of sites nothing beats on both sunlight
                and Earth visibility. Off-frontier means dominated. On-frontier still means
                steep. The full ranking is where slope gets its say.
              </p>
            </Step>
          </div>
        </div>
      </section>
    </div>
  )
}
