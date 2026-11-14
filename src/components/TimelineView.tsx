import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, Radio, Sun } from 'lucide-react'
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
    <div className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="w-8 font-mono text-[8px] text-muted-foreground">{row.label}</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            {row.windows.map((w, i) => {
              const left = ((Math.max(w.start, metrics.start) - metrics.start) / span) * 100
              const right = ((Math.min(w.end, metrics.end) - metrics.start) / span) * 100
              return (
                <span
                  key={i}
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(0.4, right - left)}%`,
                    backgroundColor: row.color,
                    opacity: 0.72,
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
  const events = upcomingEvents(focus, metrics, cursorHour)
  const currentMs = startMs + cursorHour * 3_600_000

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.035em]">Mission timeline</h1>
          <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted-foreground">
            Scrub or play through the window. Every cell is a 24 h average of the sampled Sun and
            Earth visibility; the focused card follows the cursor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="sun">
            <Sun /> Sun hours / day
          </Badge>
          <Badge variant="earth">
            <Radio /> Earth hours / day
          </Badge>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {orderedSites.map((site) => {
            const active = site.id === focus.id
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => setFocusId(site.id)}
                aria-pressed={active}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] transition-all',
                  active
                    ? 'border-transparent bg-secondary text-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: site.color }} />
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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="icon"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause timeline' : 'Play timeline'}
            className="size-9"
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>
          <div className="min-w-[200px] flex-1">
            <Slider
              value={[cursorHour]}
              min={0}
              max={days * 24}
              step={1}
              onValueChange={([v]) => setCursorHour(v)}
              aria-label="Timeline cursor"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[8.5px] text-muted-foreground">SPEED</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Timeline playback speed"
              className="h-7 rounded-full border border-border bg-background px-2 font-mono text-[9px] outline-none focus:ring-2 focus:ring-ring/30"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s} h / tick
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-right">
            <div className="font-mono text-[11px] font-medium">{fmtDateTimeUtc(currentMs)}</div>
            <div className="font-mono text-[8.5px] text-muted-foreground">
              day {Math.min(days, Math.floor(cursorHour / 24) + 1)} / {days}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-border/60 pt-3">
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

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card/55 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: focus.color }} />
              <div>
                <div className="text-[12px] font-semibold">{focus.name}</div>
                <div className="font-mono text-[8.5px] text-muted-foreground">
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
                <div className="font-mono text-[7.5px] tracking-wide text-muted-foreground uppercase">
                  {s.label}
                </div>
                <div className={cn('tabular mt-0.5 text-[14px] font-semibold', s.color)}>{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold">Clearance above terrain</div>
              <div className="text-[9px] text-muted-foreground">
                Positive means the body disk clears the local horizon
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[8.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-0.5 w-3 rounded-full bg-sun" /> Sun
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-0.5 w-3 rounded-full bg-earth" /> Earth
                </span>
              </div>
            </div>
            <Badge variant="outline" className="font-mono">
              {days} d
            </Badge>
          </div>
          <div className="mt-3 h-[205px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 6" vertical={false} />
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
                  tick={{ fontSize: 9.5, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `${v.toFixed(0)}°`}
                  tick={{ fontSize: 9.5, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
                <RechartsTooltip
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 10,
                    color: 'var(--popover-foreground)',
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
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="earth"
                  stroke="var(--earth)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9.5px] font-medium text-muted-foreground">Continuous windows</span>
              <span className="font-mono text-[8.5px] text-muted-foreground">
                full {days}-day window
              </span>
            </div>
            <WindowStrip metrics={metrics} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold">Upcoming transitions from the cursor</div>
            <div className="text-[9px] text-muted-foreground">
              Recomputed from the sampled state, with the next four boundary crossings
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'} animation
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {events.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border px-3 py-5 text-center text-[10px] text-muted-foreground">
              No Sun or Earth transition remains in this window from the current cursor.
            </div>
          ) : (
            events.map((e) => {
              const Icon = e.kind === 'sun' ? Sun : Radio
              return (
                <div
                  key={`${e.kind}-${e.t}`}
                  className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/30 px-3 py-2.5"
                >
                  <span
                    className={cn(
                      'inline-flex size-7 items-center justify-center rounded-full',
                      e.kind === 'sun' ? 'bg-[var(--sun-soft)] text-sun' : 'bg-[var(--earth-soft)] text-earth',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium">{e.label}</div>
                    <div className="truncate font-mono text-[8px] text-muted-foreground">
                      {fmtDateTimeUtc(e.t)}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-mono text-[9px]">
                      {fmtHours((e.t - currentMs) / 3_600_000)}
                    </div>
                    <div className="text-[7.5px] text-muted-foreground">from cursor</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
