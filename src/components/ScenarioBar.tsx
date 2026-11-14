import { CalendarDays, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { addDays, fmtDateTimeUtc } from '@/lib/format'

const WINDOWS = [30, 90, 180, 365]
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
  const startMs = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00.000Z`)
  const endMs = addDays(startMs, days)

  return (
    <section
      id="scenario"
      className="rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">
          <CalendarDays className="size-3.5" />
          MISSION SCENARIO
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="hidden sm:inline">UTC · computed in your browser</span>
          {computing ? (
            <span className="inline-flex items-center gap-1.5 text-earth" aria-live="polite">
              <Loader2 className="size-3 animate-spin" />
              Recomputing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-mono" aria-live="polite">
              <span className="size-1.5 rounded-full bg-success" />
              {computeMs > 0 ? `${(computeMs / 1000).toFixed(2)} s` : 'ready'}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Landing date</span>
          <span className="relative">
            <input
              type="date"
              value={date}
              min="2024-01-01"
              max="2035-12-31"
              onChange={(e) => onDate(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 pr-1 font-mono text-[11px] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Start time</span>
          <select
            value={hour}
            onChange={(e) => onHour(Number(e.target.value))}
            className="h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-[11px] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00 UTC
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Mission window</span>
          <div className="flex h-9 items-center gap-0.5 rounded-full border border-border bg-secondary/70 p-0.5">
            {WINDOWS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDays(d)}
                aria-pressed={days === d}
                className={cn(
                  'h-7 rounded-full px-2.5 font-mono text-[10px] transition-colors',
                  days === d
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Sampling</span>
          <select
            value={stepHours}
            onChange={(e) => onStep(Number(e.target.value))}
            className="h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-[11px] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {STEPS.map((s) => (
              <option key={s} value={s}>
                every {s} h
              </option>
            ))}
          </select>
        </label>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="ml-auto gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-[10px] text-muted-foreground">
        <span className="font-mono">
          {fmtDateTimeUtc(startMs)} → {fmtDateTimeUtc(endMs)}
        </span>
        <span>
          Event times are bisection-refined beyond the {stepHours} h sampling grid · horizon
          occlusion includes the solar/lunar disk radius
        </span>
      </div>
    </section>
  )
}
