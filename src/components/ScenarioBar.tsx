import { useState } from 'react'
import {
  CalendarDays,
  Check,
  Clock3,
  Gauge,
  Info,
  Loader2,
  RotateCcw,
  Share2,
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
      className="relative scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/60 p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-earth/60 to-transparent"
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
            <CalendarDays className="size-3.5 text-earth" />
            00 · Scenario
          </div>
          <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.035em] sm:text-[25px]">
            Set the mission scenario
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
            Every sunlight, Earth-link, event and ranking value is computed for this exact UTC
            window. Change any field and the whole model recomputes in your browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background/50 px-2.5 font-mono text-[9px]',
              computing ? 'text-earth' : 'text-muted-foreground',
            )}
            aria-live="polite"
          >
            {computing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <span className="size-1.5 rounded-full bg-success" />
            )}
            {computing
              ? 'Recomputing…'
              : computeMs > 0
                ? `Computed in ${(computeMs / 1000).toFixed(2)} s`
                : 'Ready'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={share}
            className="gap-1.5 text-muted-foreground"
            aria-label="Copy a link to this scenario"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Share2 className="size-3.5" />}
            {copied ? 'Copied' : 'Share'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_0.45fr]">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-medium text-foreground/85">Landing date</span>
            <span className="relative">
              <input
                type="date"
                value={date}
                min="2024-01-01"
                max="2035-12-31"
                onChange={(e) => onDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-[16px] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[12px]"
              />
            </span>
            <span className="font-mono text-[8.5px] text-muted-foreground">UTC calendar date</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-medium text-foreground/85">Start time</span>
            <select
              value={hour}
              onChange={(e) => onHour(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-[16px] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[12px]"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00 UTC
                </option>
              ))}
            </select>
            <span className="font-mono text-[8.5px] text-muted-foreground">all times UTC</span>
          </label>

          <div className="col-span-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-medium text-foreground/85">Mission window</span>
              <span className="font-mono text-[8.5px] text-muted-foreground">
                {days} d · {windowHint}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-background/45 p-1">
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
                      'flex h-9 flex-col items-center justify-center rounded-lg transition-colors',
                      active
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <span className="font-mono text-[11px] font-semibold">{item.days} d</span>
                    <span
                      className={cn(
                        'max-w-full truncate text-[7.5px]',
                        active ? 'text-background/65' : 'text-muted-foreground/70',
                      )}
                    >
                      {item.hint}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[10.5px] font-medium text-foreground/85">Sampling step</span>
            <div className="flex items-center gap-2">
              <select
                value={stepHours}
                onChange={(e) => onStep(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-[16px] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[12px]"
              >
                {STEPS.map((s) => (
                  <option key={s} value={s}>
                    every {s} hour{s > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <span className="hidden shrink-0 rounded-full border border-border bg-background/50 px-2 py-1 font-mono text-[8px] text-muted-foreground sm:inline">
                {samples.toLocaleString()} samples / site
              </span>
            </div>
            <span className="font-mono text-[8.5px] text-muted-foreground">
              finer steps cost more compute but catch shorter windows
            </span>
          </label>
        </div>

        <aside className="rounded-xl border border-border/70 bg-background/40 p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.12em] text-muted-foreground uppercase">
            <Clock3 className="size-3" />
            Window summary
          </div>
          <div className="mt-3 space-y-2 text-[10px]">
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Start</span>
              <span className="text-right font-mono">{fmtDateTimeUtc(startMs)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">End</span>
              <span className="text-right font-mono">{fmtDateTimeUtc(endMs)}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
            <div>
              <div className="font-mono text-[7.5px] tracking-wide text-muted-foreground uppercase">
                Samples
              </div>
              <div className="tabular mt-0.5 text-[15px] font-semibold">
                {samples.toLocaleString()}
              </div>
              <div className="text-[8px] text-muted-foreground">per site</div>
            </div>
            <div>
              <div className="font-mono text-[7.5px] tracking-wide text-muted-foreground uppercase">
                Horizon
              </div>
              <div className="tabular mt-0.5 text-[15px] font-semibold">1,440</div>
              <div className="text-[8px] text-muted-foreground">bins/site</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2.5 font-mono text-[8px] text-muted-foreground">
            <Gauge className="size-3" />
            {computing ? 'recomputing locally' : 'computed locally'}
          </div>
        </aside>
      </div>

      <div className="mt-4 flex items-start gap-1.5 border-t border-border/60 pt-3 text-[9px] leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3 shrink-0" />
        Event times are bisection-refined beyond the {stepHours} h sampling grid. Horizon occlusion
        includes the solar/lunar disk radius.
      </div>
    </section>
  )
}
