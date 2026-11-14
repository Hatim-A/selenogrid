import { useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Gauge,
  Info,
  Loader2,
  RotateCcw,
  Share2,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { addDays, fmtDateTimeUtc } from '@/lib/format'

const WINDOWS = [
  { days: 30, hint: 'Short sortie' },
  { days: 90, hint: 'Screening window' },
  { days: 180, hint: 'Half-year' },
  { days: 365, hint: 'Full year' },
]
const STEPS = [1, 3, 6]
const HOURS = [0, 6, 12, 18]

const FIELD_CARD =
  'group flex min-w-0 flex-col gap-2.5 rounded-xl border border-border/70 bg-background/50 p-3 transition-all duration-200 hover:border-foreground/20 focus-within:border-earth/60 focus-within:shadow-[0_0_0_3px_var(--earth-soft)] focus-within:hover:border-earth/60 sm:p-3.5'

const CONTROL =
  'h-11 w-full rounded-lg border border-border bg-card px-3 font-mono text-[16px] tabular text-foreground outline-none transition-all duration-200 hover:border-foreground/25 focus:border-earth focus:ring-2 focus:ring-earth/25 sm:text-[13px]'

export function ScenarioBar({
  date,
  hour,
  days,
  stepHours,
  onDate,
  onHour,
  onDays,
  onStep,
  onReset,
  computing,
  computeMs,
}: {
  date: string
  hour: number
  days: number
  stepHours: number
  onDate: (v: string) => void
  onHour: (v: number) => void
  onDays: (v: number) => void
  onStep: (v: number) => void
  onReset: () => void
  computing: boolean
  computeMs: number
}) {
  const [copied, setCopied] = useState(false)
  const summaryDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().slice(0, 10)
  const startMs = Date.parse(`${summaryDate}T${String(hour).padStart(2, '0')}:00:00.000Z`)
  const endMs = addDays(startMs, days)
  const samples = Math.round((days * 86_400_000) / (stepHours * 3_600_000)) + 1
  const windowHint = WINDOWS.find((item) => item.days === days)?.hint ?? `${days} days`

  const share = async () => {
    const link = window.location.href
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = link
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section
      id="scenario"
      aria-busy={computing}
      className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card/60 shadow-[var(--shadow-card)]"
    >
      {/* hairline observatory accent + faint grid */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-earth/60 to-transparent"
      />
      <div aria-hidden className="grid-fade pointer-events-none absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[560px] -translate-x-1/2 rounded-full bg-earth/10 blur-3xl"
      />

      <div className="relative p-5 sm:p-6 lg:p-7">
        {/* ——— editorial header ——— */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            <CalendarDays className="size-3.5 text-earth" />
            00 · Scenario
          </div>
          <h2 className="mt-2 font-display text-[28px] leading-[1.05] tracking-[-0.02em] text-balance sm:text-[32px]">
            Set the mission scenario
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Everything below recomputes from this UTC window — sunlight, Earth-link, events and
            rankings.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ——— ① fields first: refined 2×2 ——— */}
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
            {/* date */}
            <label className={FIELD_CARD}>
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/90">
                  <CalendarDays className="size-3.5 text-earth transition-colors group-focus-within:text-earth" />
                  Landing date
                </span>
                <span className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                  UTC
                </span>
              </span>
              <input
                type="date"
                value={date}
                min="2024-01-01"
                max="2035-12-31"
                onChange={(e) => onDate(e.target.value)}
                aria-label="Landing date (UTC)"
                className={cn(CONTROL, '[color-scheme:light] dark:[color-scheme:dark]')}
              />
              <span className="font-mono text-[9px] text-muted-foreground">
                UTC calendar date
              </span>
            </label>

            {/* time */}
            <label className={FIELD_CARD}>
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/90">
                  <Clock3 className="size-3.5 text-earth transition-colors group-focus-within:text-earth" />
                  Start time
                </span>
                <span className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                  UTC
                </span>
              </span>
              <span className="relative block">
                <select
                  value={hour}
                  onChange={(e) => onHour(Number(e.target.value))}
                  aria-label="Start time (UTC)"
                  className={cn(CONTROL, 'appearance-none pr-9')}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00 UTC
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 group-focus-within:text-earth"
                />
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">all times UTC</span>
            </label>

            {/* window */}
            <div className={FIELD_CARD}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/90">
                  <Timer className="size-3.5 text-earth" />
                  Mission window
                </span>
                <span
                  className="font-mono text-[9px] text-muted-foreground tabular"
                  aria-live="polite"
                >
                  {days} d · {windowHint}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Mission window">
                {WINDOWS.map((item) => {
                  const active = days === item.days
                  return (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => onDays(item.days)}
                      aria-pressed={active}
                      title={item.hint}
                      className={cn(
                        'flex min-h-[54px] min-w-0 flex-col items-start justify-center gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-all duration-200 active:scale-[0.97]',
                        active
                          ? 'border-earth/60 bg-earth-soft shadow-[0_0_0_1px_var(--earth)]'
                          : 'border-border/60 bg-card/40 text-muted-foreground hover:border-foreground/25 hover:bg-secondary/60 hover:text-foreground',
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-1.5">
                        <span
                          className={cn(
                            'font-mono text-[13px] font-bold tabular',
                            active ? 'text-foreground' : 'text-foreground/80',
                          )}
                        >
                          {item.days} d
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            'size-1.5 shrink-0 rounded-full transition-all duration-200',
                            active ? 'scale-100 bg-earth' : 'scale-75 bg-border',
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          'max-w-full truncate text-[9px] leading-tight',
                          active ? 'text-foreground/60' : 'text-muted-foreground/80',
                        )}
                      >
                        {item.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* sampling */}
            <div className={FIELD_CARD}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/90">
                  <Gauge className="size-3.5 text-earth" />
                  Sampling step
                </span>
                <span
                  className="rounded-full border border-border bg-card/60 px-2 py-0.5 font-mono text-[9px] text-muted-foreground tabular"
                  aria-live="polite"
                >
                  <span key={samples} className="animate-fade-in inline-block">
                    {samples.toLocaleString()}
                  </span>{' '}
                  / site
                </span>
              </div>
              <span className="relative block">
                <select
                  value={stepHours}
                  onChange={(e) => onStep(Number(e.target.value))}
                  aria-label="Sampling step"
                  className={cn(CONTROL, 'appearance-none pr-9')}
                >
                  {STEPS.map((s) => (
                    <option key={s} value={s}>
                      every {s} hour{s > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 group-focus-within:text-earth"
                />
              </span>
              <span className="font-mono text-[9px] leading-relaxed text-muted-foreground">
                finer steps catch shorter windows · cost more compute
              </span>
            </div>
          </div>

          {/* ——— ② summary second ——— */}
          <aside
            aria-label="Window summary"
            className={cn(
              'flex min-w-0 flex-col rounded-xl border bg-background/40 p-4 transition-all duration-300 sm:p-4',
              computing
                ? 'border-earth/40 shadow-[0_0_0_3px_var(--earth-soft)]'
                : 'border-border/70',
            )}
          >
            {/* recompute shimmer */}
            <div
              aria-hidden
              className={cn(
                'mb-3 h-0.5 overflow-hidden rounded-full bg-border/50 transition-opacity duration-300',
                computing ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="h-full w-1/2 animate-pulse rounded-full bg-earth/70" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
                <Clock3 className="size-3" />
                Window summary
              </div>
              <span
                aria-live="polite"
                className={cn(
                  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[9px] transition-colors duration-300',
                  computing
                    ? 'border-earth/40 bg-earth-soft text-earth'
                    : 'border-border bg-card/60 text-muted-foreground',
                )}
              >
                {computing ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Recomputing…
                  </>
                ) : (
                  <>
                    <span className="pulse-dot size-1.5 rounded-full bg-success" />
                    {computeMs > 0 ? `Computed ${(computeMs / 1000).toFixed(2)} s` : 'Ready'}
                  </>
                )}
              </span>
            </div>

            <div
              className={cn(
                'mt-3 space-y-2 text-[11px] transition-opacity duration-300',
                computing && 'opacity-70',
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 text-muted-foreground">Start</span>
                <span
                  className="min-w-0 text-right font-mono text-[11.5px] tabular"
                  title={`${summaryDate} ${String(hour).padStart(2, '0')}:00 UTC`}
                >
                  {fmtDateTimeUtc(startMs)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 text-muted-foreground">End</span>
                <span className="min-w-0 text-right font-mono text-[11.5px] tabular">
                  {fmtDateTimeUtc(endMs)}
                </span>
              </div>
            </div>

            {/* horizontal stat strip (mobile-friendly) */}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
              <div className="min-w-0">
                <div className="font-mono text-[8px] tracking-[0.1em] text-muted-foreground uppercase">
                  Samples
                </div>
                <div
                  className={cn(
                    'tabular mt-0.5 text-[20px] leading-none font-semibold transition-opacity duration-300',
                    computing && 'opacity-70',
                  )}
                  aria-live="polite"
                >
                  <span key={samples} className="animate-fade-in inline-block">
                    {samples.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground">per site</div>
              </div>
              <div className="min-w-0 border-l border-border/60 pl-3">
                <div className="font-mono text-[8px] tracking-[0.1em] text-muted-foreground uppercase">
                  Horizon
                </div>
                <div className="tabular mt-0.5 text-[20px] leading-none font-semibold">1,440</div>
                <div className="mt-1 text-[9px] text-muted-foreground">bins / site</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
              <Gauge className={cn('size-3', computing && 'animate-pulse text-earth')} />
              <span className="transition-all duration-300">
                {computing ? 'recomputing locally…' : 'computed locally · in-browser'}
              </span>
            </div>

            {/* ——— ③ actions third ——— */}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={share}
                aria-label="Copy a link to this scenario"
                className={cn(
                  'h-9 gap-1.5 text-[12px] transition-all duration-200 active:scale-[0.97]',
                  copied && 'border-success/50 text-success',
                )}
              >
                {copied ? (
                  <span className="animate-fade-in flex items-center gap-1.5">
                    <Check className="size-3.5" />
                    Copied
                  </span>
                ) : (
                  <>
                    <Share2 className="size-3.5" />
                    Share
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                aria-label="Reset scenario to defaults"
                className="h-9 gap-1.5 text-[12px] text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.97]"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            </div>
          </aside>
        </div>

        {/* ——— footnote: fine print collapsed ——— */}
        <details className="group mt-4 border-t border-border/60 pt-2.5">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <Info className="size-3 shrink-0" />
            <span>Model notes — bisection refinement &amp; horizon occlusion</span>
            <ChevronDown className="size-3 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="mt-1.5 max-w-3xl pl-[18px] text-[10px] leading-relaxed text-muted-foreground">
            Event times are bisection-refined beyond the {stepHours} h sampling grid. Horizon
            occlusion includes the solar/lunar disk radius.
          </p>
        </details>
      </div>
    </section>
  )
}
