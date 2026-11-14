import { useMemo, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  usePrefersReducedMotion,
  useScrub,
  useScrubVelocity,
} from '@/hooks/useScrub'
import { fmtDateUtc, fmtHours, fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DaySummary, RankedSite, Site, SiteMetrics } from '@/types'

interface ScrubMissionProps {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  ranked: RankedSite[]
  onOpenSite: (id: string) => void
}

function pad3(n: number): string {
  return String(n).padStart(3, '0')
}

/** A day counts as "lit" for milestone/stretch purposes at 12h+ of sun. */
const LIT_HOURS = 12
/** Keyboard scrub step, in mission days. */
const KEY_STEP_DAYS = 5

interface Milestone {
  index: number
  label: string
}

interface Stretch {
  start: number
  end: number
  len: number
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

interface HorizonModel {
  d: string
  yAt: (x: number) => number
}

/**
 * Sampled silhouette path + altitude lookup from a site's 360° horizon
 * profile, mapped into a 100×32 viewBox. Flat baseline when data is absent.
 */
function horizonModel(horizon: number[] | undefined): HorizonModel {
  const W = 100
  const H = 32
  const TOP = 7
  const BOT = 27
  if (!horizon || horizon.length === 0) {
    const y = (TOP + BOT) / 2
    return { d: `M0 ${y}L${W} ${y}L${W} ${H}L0 ${H}Z`, yAt: () => y }
  }
  let min = Infinity
  let max = -Infinity
  for (const v of horizon) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = Math.max(0.5, max - min)
  const last = horizon.length - 1
  const yAtIdx = (idx: number) => {
    const v = horizon[Math.min(last, Math.max(0, idx))] ?? min
    return BOT - ((v - min) / span) * (BOT - TOP)
  }
  const n = 110
  let d = ''
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W
    const y = yAtIdx(Math.round((i / n) * last))
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  d += `L${W} ${H}L0 ${H}Z`
  return {
    d,
    yAt: (x: number) => {
      const t = Math.min(1, Math.max(0, x / W))
      return yAtIdx(Math.round(t * last))
    },
  }
}

/**
 * The 3–5 most meaningful days of the mission, derived from REAL day data
 * only: first sunset (first sub-12h sun day after a lit day), peak-sun day,
 * longest dark-stretch start, first earthset. Padded with ingress / peak-link
 * so short or uneventful windows still show ≥3 markers; deduped by day.
 */
function computeMilestones(days: DaySummary[]): Milestone[] {
  const out: Milestone[] = []
  const push = (index: number, label: string) => {
    if (index < 0 || index >= days.length) return
    const dup = out.find((m) => m.index === index)
    if (dup) {
      dup.label = `${dup.label} · ${label}`
      return
    }
    out.push({ index, label })
  }

  let sunset = -1
  for (let i = 1; i < days.length; i++) {
    if (
      (days[i]?.sunHours ?? 0) < LIT_HOURS &&
      (days[i - 1]?.sunHours ?? 0) >= LIT_HOURS
    ) {
      sunset = i
      break
    }
  }
  if (sunset < 0) {
    const loose = days.findIndex((d) => (d.sunHours ?? 0) < LIT_HOURS)
    if (loose > 0) sunset = loose
  }

  let peak = 0
  for (let i = 1; i < days.length; i++) {
    if ((days[i]?.sunHours ?? 0) > (days[peak]?.sunHours ?? 0)) peak = i
  }

  let bestStart = -1
  let bestLen = 0
  let curStart = -1
  let curLen = 0
  for (let i = 0; i <= days.length; i++) {
    const dark = i < days.length && (days[i]?.sunHours ?? 0) < LIT_HOURS
    if (dark) {
      if (curStart < 0) {
        curStart = i
        curLen = 0
      }
      curLen++
    } else {
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
      }
      curStart = -1
      curLen = 0
    }
  }

  let earthset = -1
  for (let i = 1; i < days.length; i++) {
    if (
      (days[i]?.earthHours ?? 0) < LIT_HOURS &&
      (days[i - 1]?.earthHours ?? 0) >= LIT_HOURS
    ) {
      earthset = i
      break
    }
  }

  if (sunset >= 0) push(sunset, 'First sunset')
  push(peak, 'Peak sun')
  if (bestStart >= 0 && bestLen >= 2) push(bestStart, 'Long night begins')
  if (earthset >= 0) push(earthset, 'First earthset')
  if (out.length < 3) push(0, 'Ingress')
  if (out.length < 3 && days.length > 1) {
    let epeak = 0
    for (let i = 1; i < days.length; i++) {
      if ((days[i]?.earthHours ?? 0) > (days[epeak]?.earthHours ?? 0))
        epeak = i
    }
    push(epeak, 'Peak link')
  }

  out.sort((a, b) => a.index - b.index)
  return out.slice(0, 5)
}

/** Longest consecutive run of days with 12h+ sun (or earth) contact. */
function longestStretch(
  days: DaySummary[],
  key: 'sunHours' | 'earthHours',
): Stretch | null {
  let best: Stretch | null = null
  let start = -1
  let len = 0
  for (let i = 0; i <= days.length; i++) {
    const lit = i < days.length && (days[i]?.[key] ?? 0) >= LIT_HOURS
    if (lit) {
      if (start < 0) {
        start = i
        len = 0
      }
      len++
    } else {
      if (start >= 0 && (!best || len > best.len)) {
        best = { start, end: start + len - 1, len }
      }
      start = -1
      len = 0
    }
  }
  return best
}

/** Mean sun-hours per day bucketed by UTC month (null = no days in month). */
function monthlySunMeans(days: DaySummary[]): (number | null)[] {
  const sums = new Array<number>(12).fill(0)
  const counts = new Array<number>(12).fill(0)
  for (const d of days) {
    const m = new Date(d.t).getUTCMonth()
    if (m >= 0 && m < 12) {
      sums[m] += d.sunHours ?? 0
      counts[m] += 1
    }
  }
  return sums.map((s, m) => ((counts[m] ?? 0) > 0 ? s / (counts[m] as number) : null))
}

/** Inverse of the smoothstep easing in `useScrub` (bisection, monotonic). */
function invertSmoothstep(p: number): number {
  const c = Math.min(1, Math.max(0, p))
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const s = mid * mid * (3 - 2 * mid)
    if (s < c) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Compact rail label from a (possibly combined) milestone label. */
function shortMilestoneLabel(label: string): string {
  const head = (label.split('·')[0] ?? label).trim()
  if (/sunset/i.test(head)) return 'Sunset'
  if (/night/i.test(head)) return 'Night'
  if (/earthset/i.test(head)) return 'Earthset'
  if (/peak sun/i.test(head)) return 'Peak'
  if (/peak link/i.test(head)) return 'Link'
  if (/ingress/i.test(head)) return 'Start'
  return head.length > 10 ? head.slice(0, 10) : head
}

/**
 * The signature "film" moment: a ~300vh section with a sticky viewport stage
 * scrubbing a REAL 180-day mission for the current #1 ranked site (falling
 * back to the first site that has day-level metrics). Everything on stage —
 * day counter, date, Sun/Earth bars, horizon sun + earth markers, ambient
 * tint, milestone rail — derives from `metrics.days[day]`. Graceful standby
 * panel when no data exists yet.
 */
export function ScrubMission({ sites, metricsById, ranked, onOpenSite }: ScrubMissionProps) {
  const wrapRef = useRef<HTMLElement>(null)

  // Hooks stay above the early return so hook order is stable.
  const progress = useScrub(wrapRef)
  const reduced = usePrefersReducedMotion()
  const scrubbing = useScrubVelocity(progress)

  const first = ranked.length > 0 ? ranked[0] : undefined
  const primarySite = first?.site
  const primaryMetrics = primarySite ? metricsById.get(primarySite.id) : undefined
  const primaryOk = (primaryMetrics?.days.length ?? 0) > 0
  const fallbackSite = sites.find((s) => (metricsById.get(s.id)?.days.length ?? 0) > 0)
  const focusSite: Site | undefined =
    (primaryOk ? primarySite : undefined) ??
    fallbackSite ??
    (sites.length > 0 ? sites[0] : undefined)
  const metrics = focusSite ? metricsById.get(focusSite.id) : undefined
  const days = metrics?.days ?? []

  const milestones = useMemo(() => computeMilestones(days), [days])
  const sunStretch = useMemo(
    () => longestStretch(days, 'sunHours'),
    [days],
  )
  const earthStretch = useMemo(
    () => longestStretch(days, 'earthHours'),
    [days],
  )
  const monthCells = useMemo(() => monthlySunMeans(days), [days])

  if (!focusSite || days.length === 0) {
    return (
      <section
        aria-label="Mission film standby"
        className="relative px-5 py-24 sm:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">The window · scroll to scrub time</p>
          <h2 className="lp-display mt-4 text-3xl text-balance sm:text-4xl">
            Mission film standby
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            The 180-day scrub appears here once trajectory data arrives — pick
            the top-ranked site and scroll to fly its mission day by day.
          </p>
        </div>
      </section>
    )
  }

  const count = days.length
  // Reduced motion: static day-1 stage; milestones stay visible on the rail.
  const effProgress = reduced ? 0 : progress
  const dayIndex = Math.min(count - 1, Math.max(0, Math.round(effProgress * (count - 1))))
  const day = days[dayIndex] as DaySummary
  const sunHours = day.sunHours ?? 0
  const earthHours = day.earthHours ?? 0
  const sunFrac = Math.min(1, Math.max(0, sunHours / 24))
  const earthFrac = Math.min(1, Math.max(0, earthHours / 24))
  const scrubbingActive = scrubbing && !reduced

  const model = horizonModel(focusSite.horizonDeg)
  // Sun travels westward with the scrubbed day; the Earth marker mirrors it.
  const sunX = 3 + effProgress * 94
  const earthX = 97 - effProgress * 94
  const sunY = model.yAt(sunX) - 1.5 - sunFrac * 15
  const earthY = model.yAt(earthX) - 1.5 - earthFrac * 15

  const seasonSun = metrics ? fmtPct(metrics.sunlightPct, 0) : '—'
  const seasonEarth = metrics ? fmtPct(metrics.earthPct, 0) : '—'

  const activeMilestone = milestones.find((m) => m.index === dayIndex)
  const nextMilestone = milestones.find((m) => m.index > dayIndex)
  const railPct = (i: number): string =>
    count <= 1 ? '0%' : `${(i / (count - 1)) * 100}%`

  const monthSummary =
    monthCells
      .map((mean, m) =>
        mean === null ? null : `${MONTH_SHORT[m]} ${mean.toFixed(1)}h`,
      )
      .filter((s): s is string => s !== null)
      .join(', ') || 'no day data'

  const jumpToDay = (index: number) => {
    const el = wrapRef.current
    if (!el || typeof window === 'undefined') return
    const vh = window.innerHeight || 1
    const total = el.getBoundingClientRect().height - vh
    if (total <= 0) return
    const clamped = Math.min(count - 1, Math.max(0, index))
    const eased = count <= 1 ? 0 : clamped / (count - 1)
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: top + invertSmoothstep(eased) * total,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  const onStageKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    jumpToDay(dayIndex + (e.key === 'ArrowRight' ? KEY_STEP_DAYS : -KEY_STEP_DAYS))
  }

  return (
    <section
      ref={wrapRef}
      aria-label={`180-day mission scrub for ${focusSite.name}`}
      className="lp-scrub-wrap relative"
      style={{ height: '300vh' }}
    >
      <style>{`
        @keyframes lpScrubStripes { to { background-position: 28px 0; } }
        @keyframes lpMsPulse {
          0% { transform: scale(1); }
          35% { transform: scale(1.035); }
          100% { transform: scale(1); }
        }
        .lp-stripes {
          background-image: repeating-linear-gradient(-55deg, rgba(255,255,255,0.38) 0 6px, transparent 6px 13px);
          background-size: 28px 100%;
          animation: lpScrubStripes 0.8s linear infinite;
        }
        .lp-ms-flash {
          animation: lpMsPulse 0.55s cubic-bezier(0.22, 1, 0.36, 1);
          text-shadow: 0 0 22px color-mix(in srgb, var(--sun) 65%, transparent);
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-stripes, .lp-ms-flash { animation: none; }
        }
      `}</style>

      <div
        className="lp-sticky-stage flex items-center focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-[-6px]"
        tabIndex={0}
        role="group"
        aria-label={`Mission scrub stage. Day ${dayIndex + 1} of ${count}. Use left and right arrow keys to step ${KEY_STEP_DAYS} days.`}
        onKeyDown={onStageKeyDown}
      >
        {/* Living ambience: warm amber wash follows sunlight, deep blue the
            dark — opacity crossfade only, no layout cost. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: sunFrac,
            background:
              'linear-gradient(180deg, rgba(255,183,77,0.22) 0%, transparent 55%, rgba(255,138,60,0.14) 100%)',
            willChange: 'opacity',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 1 - sunFrac,
            background:
              'linear-gradient(180deg, rgba(43,92,200,0.20) 0%, transparent 55%, rgba(16,32,80,0.22) 100%)',
            willChange: 'opacity',
          }}
        />
        <div className="lp-vignette" aria-hidden="true" />
        <div className="lp-grain" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0 bg-gradient-to-r from-sun to-earth"
            />
            <p className="eyebrow">The window · scroll to scrub time</p>
          </div>

          <div className="mt-6 grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            {/* Left: giant day counter + mission identity */}
            <div className="min-w-0">
              <div key={dayIndex} className="lp-day-tick">
                <p
                  className={cn(
                    'lp-display lp-day-giant tabular-nums',
                    activeMilestone && !reduced && 'lp-ms-flash',
                  )}
                >
                  Day {pad3(dayIndex + 1)}
                </p>
              </div>
              <p className="mt-3 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase tabular-nums">
                {fmtDateUtc(day.t)} · Day {dayIndex + 1} of {count}
              </p>
              <p
                aria-live="polite"
                className="mt-2 min-h-5 text-xs font-medium tracking-wide tabular-nums"
                style={{ color: 'var(--sun)' }}
              >
                {activeMilestone
                  ? `◆ ${activeMilestone.label} — Day ${dayIndex + 1}`
                  : nextMilestone
                    ? `Next · ${nextMilestone.label} — Day ${nextMilestone.index + 1}`
                    : `Day ${dayIndex + 1} of ${count}`}
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{focusSite.name}</span>
                {focusSite.region !== focusSite.name && (
                  <>
                    {' · '}
                    {focusSite.region}
                  </>
                )}
                {primaryOk && first && ranked.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    · Ranked #1 of {ranked.length}
                  </span>
                )}
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Season mean · Sun {seasonSun} · Earth {seasonEarth}
              </p>
              <button
                type="button"
                onClick={() => onOpenSite(focusSite.id)}
                className={cn(
                  'press mt-6 inline-flex items-center gap-1.5 rounded-full border px-4 py-2',
                  'text-xs font-medium tracking-wide text-foreground',
                  'border-[var(--border-strong)] bg-transparent',
                  'transition-colors duration-300 hover:border-current',
                )}
              >
                Open {focusSite.shortName} analysis
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </button>
              <p className="mt-3 hidden text-[11px] text-muted-foreground sm:block">
                Tip: focus this stage and press{' '}
                <kbd className="rounded border px-1 font-mono hairline">←</kbd>{' '}
                <kbd className="rounded border px-1 font-mono hairline">→</kbd>{' '}
                to step {KEY_STEP_DAYS} days.
              </p>
            </div>

            {/* Right: per-day bars + horizon panorama */}
            <div className="min-w-0">
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span className="font-mono tracking-[0.14em] text-muted-foreground uppercase">
                      Sunlight
                    </span>
                    <span className="font-medium text-sun tabular-nums">
                      {fmtHours(sunHours)}
                    </span>
                  </div>
                  <div className="lp-scrub-track">
                    <div
                      className="lp-scrub-fill lp-fill-sun"
                      style={{
                        transform: `scaleX(${sunFrac})`,
                        boxShadow: scrubbingActive
                          ? '0 0 12px var(--sun)'
                          : undefined,
                      }}
                    />
                    {scrubbingActive && (
                      <div
                        aria-hidden="true"
                        className="lp-stripes absolute inset-0"
                        style={{
                          transform: `scaleX(${sunFrac})`,
                          transformOrigin: 'left center',
                        }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span className="font-mono tracking-[0.14em] text-muted-foreground uppercase">
                      Earth contact
                    </span>
                    <span className="font-medium text-earth tabular-nums">
                      {fmtHours(earthHours)}
                    </span>
                  </div>
                  <div className="lp-scrub-track">
                    <div
                      className="lp-scrub-fill lp-fill-earth"
                      style={{
                        transform: `scaleX(${earthFrac})`,
                        boxShadow: scrubbingActive
                          ? '0 0 12px var(--earth)'
                          : undefined,
                      }}
                    />
                    {scrubbingActive && (
                      <div
                        aria-hidden="true"
                        className="lp-stripes absolute inset-0"
                        style={{
                          transform: `scaleX(${earthFrac})`,
                          transformOrigin: 'left center',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <figure className="mt-5 overflow-hidden rounded-xl border hairline">
                <svg
                  viewBox="0 0 100 32"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Horizon silhouette for ${focusSite.name}, mission day ${dayIndex + 1}. Sun marker travels with the scrubbed day; Earth marker mirrors it.`}
                  className="block aspect-[25/8] w-full"
                >
                  <path d={model.d} className="lp-ridge" />
                  <circle cx={sunX} cy={sunY} r={2.4} className="lp-sun-dot" />
                  <circle
                    cx={earthX}
                    cy={earthY}
                    r={1.7}
                    style={{
                      fill: 'var(--earth)',
                      filter: 'drop-shadow(0 0 4px var(--earth))',
                      opacity: 0.9,
                    }}
                  />
                </svg>
                <figcaption className="flex items-center justify-between border-t px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase hairline">
                  <span>Horizon · {focusSite.shortName}</span>
                  <span className="tabular-nums">
                    Day 001 – {pad3(count)}
                  </span>
                </figcaption>
              </figure>
            </div>

            {/* Season at a glance: monthly sun density + longest windows */}
            <div className="min-w-0 lg:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-4 hairline">
                <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  Season at a glance · mean sun h/day
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground tabular-nums">
                  {sunStretch ? (
                    <>
                      Longest light{' '}
                      <span className="text-foreground">
                        {fmtDateUtc((days[sunStretch.start] as DaySummary).t, {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        →{' '}
                        {fmtDateUtc((days[sunStretch.end] as DaySummary).t, {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>{' '}
                      · {sunStretch.len}d
                    </>
                  ) : (
                    'No 12h+ light stretch in window'
                  )}
                  {' · '}
                  {earthStretch ? (
                    <>
                      Longest link{' '}
                      <span className="text-foreground">
                        {fmtDateUtc((days[earthStretch.start] as DaySummary).t, {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        →{' '}
                        {fmtDateUtc((days[earthStretch.end] as DaySummary).t, {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>{' '}
                      · {earthStretch.len}d
                    </>
                  ) : (
                    'No 12h+ link stretch in window'
                  )}
                </p>
              </div>
              <div
                role="img"
                aria-label={`Mean sunlight hours per day by month for ${focusSite.name}: ${monthSummary}`}
                className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-12"
              >
                {monthCells.map((mean, m) => (
                  <div
                    key={MONTH_SHORT[m]}
                    aria-hidden="true"
                    title={
                      mean === null
                        ? `${MONTH_SHORT[m]} — outside window`
                        : `${MONTH_SHORT[m]} — mean ${mean.toFixed(1)} h/day`
                    }
                    className={cn(
                      'flex h-[4.5rem] flex-col items-center justify-end gap-1 rounded-md border px-1 py-1.5 hairline',
                      mean === null && 'border-dashed opacity-50',
                    )}
                  >
                    <span className="flex h-6 w-full items-end">
                      <span
                        className="w-full rounded-sm"
                        style={{
                          height:
                            mean === null
                              ? '0%'
                              : `${Math.round((mean / 24) * 100)}%`,
                          background: 'var(--sun)',
                          opacity:
                            mean === null ? 0 : 0.35 + 0.65 * (mean / 24),
                        }}
                      />
                    </span>
                    <span className="font-mono text-[9px] leading-none font-medium tracking-wider uppercase">
                      {MONTH_SHORT[m]}
                    </span>
                    <span className="font-mono text-[9px] leading-none text-muted-foreground tabular-nums">
                      {mean === null ? '–' : `${mean.toFixed(1)}h`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mission scrub rail with milestone ticks + day labels */}
        <div className="absolute inset-x-0 bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div className="relative">
              <div
                className="lp-scrub-track"
                role="progressbar"
                aria-label="Mission day scrub"
                aria-valuemin={1}
                aria-valuemax={count}
                aria-valuenow={dayIndex + 1}
                aria-valuetext={`Day ${dayIndex + 1} of ${count}`}
              >
                <div
                  className="lp-scrub-fill"
                  style={{ transform: `scaleX(${effProgress})` }}
                />
              </div>
              {milestones.map((m) => {
                const passed = m.index < dayIndex
                const current = m.index === dayIndex
                return (
                  <button
                    key={`${m.index}-${m.label}`}
                    type="button"
                    onClick={() => jumpToDay(m.index)}
                    title={`${m.label} — Day ${m.index + 1} · ${fmtDateUtc((days[m.index] as DaySummary).t)}`}
                    aria-label={`Jump to ${m.label}, day ${m.index + 1} of ${count}`}
                    style={{ left: railPct(m.index) }}
                    className="absolute top-1/2 z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2"
                  >
                    <span
                      aria-hidden="true"
                      className="block size-2 rounded-full transition-transform duration-200"
                      style={{
                        background: passed || current ? 'var(--sun)' : 'transparent',
                        border: '1.5px solid var(--sun)',
                        transform: current ? 'scale(1.5)' : 'scale(1)',
                        boxShadow: current
                          ? '0 0 10px var(--sun)'
                          : passed
                            ? '0 0 6px color-mix(in srgb, var(--sun) 70%, transparent)'
                            : undefined,
                      }}
                    />
                  </button>
                )
              })}
            </div>
            <div className="relative mt-1.5 h-8" aria-hidden="true">
              {milestones.map((m, i) => (
                <span
                  key={`${m.index}-${m.label}-label`}
                  style={{
                    left: railPct(m.index),
                    top: i % 2 === 0 ? 0 : 15,
                  }}
                  className={cn(
                    'absolute -translate-x-1/2 font-mono text-[9px] tracking-wider whitespace-nowrap uppercase tabular-nums',
                    m.index === dayIndex
                      ? 'font-semibold'
                      : 'text-muted-foreground',
                  )}
                >
                  D{m.index + 1} · {shortMilestoneLabel(m.label)}
                </span>
              ))}
            </div>
            <ul className="sr-only">
              {milestones.map((m) => (
                <li key={`${m.index}-${m.label}`}>
                  {m.label}, day {m.index + 1} of {count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScrubMission
