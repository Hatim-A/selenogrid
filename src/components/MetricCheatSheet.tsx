import { ChevronDown, HelpCircle, Info } from 'lucide-react'

const METRICS = [
  {
    term: 'Sunlight',
    value: '% of window',
    body: 'Share of the mission window with any part of the solar disk above the local terrain horizon.',
    tone: 'text-sun',
  },
  {
    term: 'Earth visibility',
    value: '% of window',
    body: 'Share of the window with any part of the Earth disk above the horizon — a direct line of sight, not a link budget.',
    tone: 'text-earth',
  },
  {
    term: 'Solar flux proxy',
    value: 'relative index',
    body: 'Mean sin(Sun elevation) while lit. Useful for comparing sites; not a wattage or battery model.',
    tone: 'text-terrain',
  },
  {
    term: 'Terrain',
    value: 'degrees',
    body: 'Best-fit local slope over 1 km. A cost criterion: lower is better. It is not a landing-hazard certification.',
    tone: 'text-foreground',
  },
  {
    term: 'TOPSIS score',
    value: '0–100 relative fit',
    body: 'Weighted closeness to the ideal best and worst sites in the current comparison. Not a probability.',
    tone: 'text-foreground',
  },
]

export function MetricCheatSheet() {
  return (
    <details className="group rounded-2xl border border-border bg-card/40 px-4 py-3 transition-colors open:bg-card/55">
      <summary className="flex cursor-pointer list-none items-center gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary">
          <HelpCircle className="size-3.5 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold">New to the metrics?</span>
          <span className="block text-[9.5px] text-muted-foreground">
            Open the 30-second cheat sheet before reading the ranking.
          </span>
        </span>
        <span className="hidden font-mono text-[8px] tracking-wide text-muted-foreground sm:inline">
          5 definitions
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-2 lg:grid-cols-5">
        {METRICS.map((metric) => (
          <div key={metric.term} className="rounded-xl border border-border/60 bg-background/30 p-2.5">
            <div className={`text-[10px] font-semibold ${metric.tone}`}>{metric.term}</div>
            <div className="mt-0.5 font-mono text-[7.5px] tracking-wide text-muted-foreground uppercase">
              {metric.value}
            </div>
            <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{metric.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-start gap-1.5 text-[8.5px] leading-relaxed text-muted-foreground/80">
        <Info className="mt-px size-3 shrink-0" />
        Percentages are sampled from the chosen time step. Event times are refined separately; the
        full method and limits are in the Method tab.
      </div>
    </details>
  )
}
