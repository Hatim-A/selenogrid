import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Pause, Play, Radio, Sun, Sunrise, Sunset } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Reveal } from '@/components/ui/Reveal'
import { HorizonPanorama } from '@/components/viz/HorizonPanorama'
import { TimelineHeatmap } from '@/components/viz/TimelineHeatmap'
import { fmtDateTimeUtc, fmtDayUtc, fmtHours, signed } from '@/lib/format'
import { refineTransition } from '@/lib/metrics'
import { cn } from '@/lib/utils'
import type { RankedSite, Site, SiteMetrics, SiteSample } from '@/types'

const SPEEDS = [6, 12, 24, 72]

function sampleAt(metrics: SiteMetrics, hour: number): SiteSample {
  const idx = Math.min(
    metrics.samples.length - 1,
    Math.max(0, Math.round(hour / (metrics.stepMs / 3_600_000))),
  )
  return metrics.samples[idx]
}

function upcomingEvents(site: Site, metrics: SiteMetrics, hour: number) {
  const startIdx = Math.min(
    metrics.samples.length - 1,
    Math.max(0, Math.floor(hour / (metrics.stepMs / 3_600_000))),
  )
  const cursorMs = metrics.start + hour * 3_600_000
  const out: { label: string; t: number; kind: 'sun' | 'earth'; up: boolean }[] = []
  for (let i = startIdx + 1; i < metrics.samples.length && out.length < 6; i++) {
    const a = metrics.samples[i - 1]
    const b = metrics.samples[i]
    if (a.sunVisible !== b.sunVisible) {
      const t = refineTransition(site, a.t, b.t, 'sun', b.sunVisible)
      if (t >= cursorMs) {
        out.push({ label: b.sunVisible ? 'Sunrise' : 'Sunset', t, kind: 'sun', up: b.sunVisible })
      }
    }
    if (a.earthVisible !== b.earthVisible) {
      const t = refineTransition(site, a.t, b.t, 'earth', b.earthVisible)
      if (t >= cursorMs) {
        out.push({
          label: b.earthVisible ? 'Earthrise' : 'Earthset',
          t,
          kind: 'earth',
          up: b.earthVisible,
        })
      }
    }
  }
  return out.sort((x, y) => x.t - y.t).slice(0, 4)
}

function WindowStrip({ metrics }: { metrics: SiteMetrics }) {
  const span = metrics.end - metrics.start
  const rows = [
    { label: 'Sun', windows: metrics.sunWindows, color: 'var(--sun)' },
    { label: 'Earth', windows: metrics.earthWindows, color: 'var(--earth)' },
  ]
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2.5">
          <span className="w-10 shrink-0 font-mono text-[8px] tracking-[0.12em] text-muted-foreground uppercase">
            {row.label}
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary/70 ring-1 ring-inset ring-border/60">
            {row.windows.map((w, i) => {
              const left = ((Math.max(w.start, metrics.start) - metrics.start) / span) * 100
              const right = ((Math.min(w.end, metrics.end) - metrics.start) / span) * 100
              return (
                <span
                  key={i}
                  title={`${row.label}: ${((w.end - w.start) / 3_600_000).toFixed(1)} h continuous`}
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(0.4, right - left)}%`,
                    backgroundColor: row.color,
                    opacity: 0.85,
                    boxShadow: `0 0 10px -2px ${row.color}`,
                  }}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TimelineView({
  sites,
  metricsById,
  ranked,
  days,
  startMs,
  theme,
  initialFocusId,
  onOpen,
}: {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  ranked: RankedSite[]
  days: number
  startMs: number
  theme: 'light' | 'dark'
  initialFocusId?: string
  onOpen: (id: string) => void
}) {
  const [focusId, setFocusId] = useState(ranked[0]?.site.id ?? sites[0]?.id ?? '')
  const [cursorHour, setCursorHour] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(24)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (initialFocusId && sites.some((s) => s.id === initialFocusId)) {
      setFocusId(initialFocusId)
      return
    }
    if (!sites.some((s) => s.id === focusId)) setFocusId(ranked[0]?.site.id ?? sites[0]?.id ?? '')
  }, [sites, focusId, ranked, initialFocusId])

  useEffect(() => {
    setCursorHour(0)
    setPlaying(false)
  }, [startMs, days])

  // Respect the OS reduced-motion preference: never carry autoplay across
  // scenario changes, and stop playback the moment the preference engages.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      setReducedMotion(mq.matches)
      if (mq.matches) setPlaying(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setCursorHour((h) => {
        const next = h + speed
        if (next >= days * 24) {
          setPlaying(false)
          return 0
        }
        return next
      })
    }, 90)
    return () => window.clearInterval(id)
  }, [playing, speed, days])

  const focus = sites.find((s) => s.id === focusId) ?? sites[0]
  const metrics = focus ? metricsById.get(focus.id) : undefined
  // Event search runs bisection refinement per transition — defer it so the
  // panorama and cursor stay buttery while scrubbing; the list catches up.
  // (Hook must stay above the empty-state early return.)
  const settledHour = useDeferredValue(cursorHour)
  const chronoOrder = ranked.map((r) => r.site).filter((s) => sites.some((x) => x.id === s.id))
  const orderedSites = chronoOrder.length ? chronoOrder : sites

  const chartData = useMemo(() => {
    if (!metrics) return []
    const stride = Math.max(1, Math.ceil(metrics.samples.length / 260))
    const out: { h: number; sun: number; earth: number }[] = []
    for (let i = 0; i < metrics.samples.length; i += stride) {
      const s = metrics.samples[i]
      out.push({ h: (s.t - metrics.start) / 3_600_000, sun: s.sunClearance, earth: s.earthClearance })
    }
    return out
  }, [metrics])

  if (!focus || !metrics) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-[12px] text-muted-foreground">
        Select at least one site to open the mission timeline.
      </div>
    )
  }

  const sample = sampleAt(metrics, cursorHour)
  const events = upcomingEvents(focus, metrics, settledHour)
  const currentMs = startMs + cursorHour * 3_600_000
  const endMs = startMs + days * 24 * 3_600_000

  return (
    <div className="space-y-5">
      {/* Editorial header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
            Time · Sun &amp; Earth
          </div>
          <h1 className="mt-1 font-display text-[34px] leading-none tracking-[-0.02em] sm:text-[40px]">
            Mission timeline
          </h1>
          <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            Scrub or play through the window. Every cell is a 24 h average of the sampled Sun and
            Earth visibility; the focused card follows the cursor.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="sun">
            <Sun /> Sun hours / day
          </Badge>
          <Badge variant="earth">
            <Radio /> Earth hours / day
          </Badge>
        </div>
      </div>

      {/* Transport + heatmap */}
      <Reveal>
        <section
          aria-label="Timeline transport and daily heatmap"
          className="rounded-2xl border border-border bg-card/55 shadow-[var(--shadow-card)]"
        >
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-4 sm:px-5">
            <span className="mr-1 font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
              Focus
            </span>
            {orderedSites.map((site) => {
              const active = site.id === focus.id
              return (
                <button
                  key={site.id}
                  type="button"
                  title={site.name}
                  onClick={() => setFocusId(site.id)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] transition-all',
                    active
                      ? 'border-transparent bg-secondary text-foreground shadow-sm ring-1 ring-inset ring-border'
                      : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      backgroundColor: site.color,
                      boxShadow: active ? `0 0 8px ${site.color}` : undefined,
                    }}
                  />
                  {site.shortName}
                </button>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onOpen(focus.id)}
            >
              Full analysis
            </Button>
          </div>

          {/* Single transport row */}
          <div className="mt-3 flex items-center gap-3 px-4 sm:gap-4 sm:px-5">
            <Button
              size="icon"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause timeline' : 'Play timeline'}
              title={
                reducedMotion
                  ? 'Autoplay follows your reduced-motion setting — scrub manually anytime'
                  : undefined
              }
              className="size-11 shrink-0 rounded-full shadow-[0_10px_30px_-10px_var(--sun)] ring-1 ring-inset ring-white/10 transition-transform hover:scale-105 active:scale-95"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
            </Button>
            <div className="min-w-0 flex-1">
              <Slider
                value={[cursorHour]}
                min={0}
                max={days * 24}
                step={1}
                onValueChange={([v]) => setCursorHour(v)}
                aria-label="Timeline cursor"
              />
              <div className="mt-1 flex items-center justify-between font-mono text-[8px] tracking-[0.08em] text-muted-foreground/70 uppercase">
                <span>{fmtDayUtc(startMs)}</span>
                <span>{fmtDayUtc(endMs)}</span>
              </div>
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="font-mono text-[8px] tracking-[0.14em] text-muted-foreground uppercase">
                Speed
              </span>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                aria-label="Timeline playback speed"
                className="h-8 rounded-full border border-border/70 bg-background px-2.5 font-mono text-[9.5px] tracking-wide outline-none transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s} h / tick
                  </option>
                ))}
              </select>
            </div>
            <div className="ml-auto shrink-0 text-right">
              <div className="font-mono text-[13px] font-semibold tabular-nums">
                {fmtDateTimeUtc(currentMs)}
              </div>
              <div className="font-mono text-[8px] tracking-[0.12em] text-muted-foreground uppercase">
                Day {Math.min(days, Math.floor(cursorHour / 24) + 1)} / {days} · T+{cursorHour} h
              </div>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1.5 px-4 sm:hidden sm:px-5">
            <span className="font-mono text-[8px] tracking-[0.14em] text-muted-foreground uppercase">
              Speed
            </span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Timeline playback speed"
              className="h-8 rounded-full border border-border/70 bg-background px-2.5 font-mono text-[9.5px] tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s} h / tick
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 border-t border-border/60 px-4 pt-3 pb-4 sm:px-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
                Daily averages · Sun / Earth hours
              </span>
              <span className="font-mono text-[8.5px] text-muted-foreground/70">
                {days} d window
              </span>
            </div>
            <TimelineHeatmap
              sites={orderedSites}
              metricsById={metricsById}
              days={days}
              startMs={startMs}
              cursorHour={cursorHour}
              selectedId={focus.id}
              onSelect={setFocusId}
              onCursor={(h) => {
                setPlaying(false)
                setCursorHour(h)
              }}
              theme={theme}
            />
          </div>
        </section>
      </Reveal>

      {/* Focus panorama + clearance */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Reveal className="min-w-0">
          <section
            aria-label="Focused site horizon"
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/55 shadow-[var(--shadow-card)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: focus.color, boxShadow: `0 0 10px ${focus.color}` }}
                />
                <div>
                  <div className="font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
                    Horizon focus
                  </div>
                  <div className="text-[13px] font-semibold tracking-[-0.01em]">{focus.name}</div>
                  <div className="font-mono text-[8.5px] text-muted-foreground tabular-nums">
                    {fmtDayUtc(currentMs)} · {fmtDateTimeUtc(currentMs)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={sample.sunVisible ? 'sun' : 'outline'}>
                  <Sun /> {sample.sunVisible ? 'Sun up' : 'Sun down'}
                </Badge>
                <Badge variant={sample.earthVisible ? 'earth' : 'outline'}>
                  <Radio /> {sample.earthVisible ? 'Earth up' : 'Earth down'}
                </Badge>
              </div>
            </div>
            <HorizonPanorama
              site={focus}
              sunAz={sample.sunAz}
              sunEl={sample.sunEl}
              earthAz={sample.earthAz}
              earthEl={sample.earthEl}
              sunVisible={sample.sunVisible}
              earthVisible={sample.earthVisible}
              samples={metrics.samples}
              timeLabel={fmtDayUtc(currentMs)}
            />
            <div className="grid grid-cols-2 gap-y-3 border-t border-border/60 px-4 py-3 sm:grid-cols-4">
              {[
                { label: 'Sun elevation', value: `${signed(sample.sunEl)}°`, color: 'text-sun' },
                { label: 'Earth elevation', value: `${signed(sample.earthEl)}°`, color: 'text-earth' },
                {
                  label: 'Sun clearance',
                  value: `${signed(sample.sunClearance)}°`,
                  color: sample.sunClearance > 0 ? 'text-foreground' : 'text-danger',
                },
                {
                  label: 'Earth clearance',
                  value: `${signed(sample.earthClearance)}°`,
                  color: sample.earthClearance > 0 ? 'text-foreground' : 'text-danger',
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-[7.5px] tracking-[0.12em] text-muted-foreground uppercase">
                    {s.label}
                  </div>
                  <div className={cn('tabular mt-0.5 text-[15px] font-semibold', s.color)}>{s.value}</div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal delay={80} className="min-w-0">
          <section
            aria-label="Clearance above terrain"
            className="flex h-full flex-col rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
                  Clearance
                </div>
                <div className="mt-0.5 text-[12px] font-semibold tracking-[-0.01em]">
                  Clearance above terrain
                </div>
                <div className="mt-0.5 text-[9.5px] text-muted-foreground">
                  Positive means the body disk clears the local horizon
                </div>
                <div className="mt-2 flex items-center gap-3 text-[8.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-mono tracking-[0.08em] uppercase">
                    <span
                      className="h-[2px] w-4 rounded-full bg-sun"
                      style={{ boxShadow: '0 0 8px -1px var(--sun)' }}
                    />
                    Sun
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono tracking-[0.08em] uppercase">
                    <span
                      className="h-[2px] w-4 rounded-full bg-earth"
                      style={{ boxShadow: '0 0 8px -1px var(--earth)' }}
                    />
                    Earth
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="font-mono tabular-nums">
                {days} d
              </Badge>
            </div>
            <div className="mt-3 h-[205px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke="var(--grid-line)" strokeDasharray="1 4" vertical={false} />
                  <XAxis
                    dataKey="h"
                    type="number"
                    domain={[0, days * 24]}
                    tickFormatter={(v: number) =>
                      new Intl.DateTimeFormat('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'UTC',
                      }).format(new Date(startMs + v * 3_600_000))
                    }
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v.toFixed(0)}°`}
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.6}
                    strokeDasharray="4 3"
                    label={{
                      value: 'horizon',
                      position: 'insideTopRight',
                      fontSize: 8,
                      fill: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: 'var(--border)', strokeDasharray: '2 3' }}
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 10.5,
                      color: 'var(--popover-foreground)',
                      boxShadow: 'var(--shadow-float)',
                      fontFamily: 'var(--font-mono)',
                    }}
                    labelFormatter={(v) =>
                      fmtDayUtc(startMs + Number(v) * 3_600_000)
                    }
                    formatter={(value, name) => [
                      `${Number(value).toFixed(2)}°`,
                      name === 'sun' ? 'Sun' : 'Earth',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="sun"
                    stroke="var(--sun)"
                    strokeWidth={1.6}
                    dot={false}
                    activeDot={{ r: 2.5, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="earth"
                    stroke="var(--earth)"
                    strokeWidth={1.6}
                    dot={false}
                    activeDot={{ r: 2.5, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 border-t border-border/60 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
                  Continuous windows
                </span>
                <span className="font-mono text-[8.5px] text-muted-foreground/70">
                  full {days}-day window
                </span>
              </div>
              <WindowStrip metrics={metrics} />
            </div>
          </section>
        </Reveal>
      </div>

      {/* Transitions */}
      <Reveal delay={120}>
        <section
          aria-label="Upcoming Sun and Earth transitions"
          className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground uppercase">
                Transitions
              </div>
              <div className="mt-0.5 text-[12px] font-semibold tracking-[-0.01em]">
                Upcoming transitions from the cursor
              </div>
              <div className="mt-0.5 text-[9.5px] text-muted-foreground">
                Recomputed from the sampled state, with the next four boundary crossings
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={events.length === 0}
              onClick={() => {
                const next = events[0]
                if (next) {
                  setPlaying(false)
                  setCursorHour((next.t - startMs) / 3_600_000)
                }
              }}
            >
              Jump to next transition
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {events.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-border px-3 py-6 text-center text-[10.5px] text-muted-foreground">
                No Sun or Earth transition remains in this window from the current cursor.
              </div>
            ) : (
              events.map((e) => {
                const Icon = e.kind === 'sun' ? (e.up ? Sunrise : Sunset) : Radio
                const accent = e.kind === 'sun' ? 'var(--sun)' : 'var(--earth)'
                return (
                  <div
                    key={`${e.kind}-${e.t}`}
                    className="relative overflow-hidden rounded-xl border border-border/70 bg-background/40 px-3 py-2.5 pl-4 transition-colors hover:border-border"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[2px]"
                      style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
                          e.kind === 'sun' ? 'bg-[var(--sun-soft)] text-sun' : 'bg-[var(--earth-soft)] text-earth',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold tracking-[-0.01em]">{e.label}</div>
                        <div className="font-mono text-[8px] tracking-[0.1em] text-muted-foreground uppercase">
                          {e.kind === 'sun' ? 'Sun' : 'Earth'} · {e.up ? 'rise' : 'set'}
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-mono text-[11px] font-semibold tabular-nums">
                          {fmtHours((e.t - currentMs) / 3_600_000)}
                        </div>
                        <div className="text-[7.5px] text-muted-foreground">from cursor</div>
                      </div>
                    </div>
                    <div className="mt-1.5 truncate border-t border-border/50 pt-1.5 font-mono text-[8.5px] text-muted-foreground tabular-nums">
                      {fmtDateTimeUtc(e.t)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </Reveal>
    </div>
  )
}
