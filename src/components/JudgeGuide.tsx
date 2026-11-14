import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Database,
  Moon,
  Orbit,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Telescope,
  Trophy,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    icon: CalendarDays,
    title: 'Set the scenario',
    body: 'Choose a landing date, mission window and sampling step. Every metric recomputes locally; add a custom point if your site is not in the curated set.',
    tone: 'text-sun',
  },
  {
    icon: Trophy,
    title: 'Read the brief',
    body: 'The decision brief gives the best weighted fit, its score and trade-off, then the other criterion leaders before the tables.',
    tone: 'text-foreground',
  },
  {
    icon: Telescope,
    title: 'Open any site',
    body: 'Inspect its 360° horizon, event clock and 3D terrain tile. Or use Timeline to compare windows.',
    tone: 'text-terrain',
  },
  {
    icon: Moon,
    title: 'Test the decision',
    body: 'Explore the 3D Moon, pin a custom coordinate, then change TOPSIS weights to see the ranking and Pareto frontier move.',
    tone: 'text-earth',
  },
]

const CREDENTIALS = [
  { icon: Database, value: '20 m', label: 'real LOLA elevation DEM' },
  { icon: Orbit, value: '1,440', label: 'horizon bins per site' },
  { icon: CheckCircle2, value: 'JPL', label: 'Horizons validation' },
  { icon: SlidersHorizontal, value: 'Open', label: 'transparent TOPSIS weights' },
  { icon: ShieldCheck, value: 'Static', label: 'no backend, runs in-browser' },
]

export function JudgeGuide({
  open,
  onOpenChange,
  onStart,
  onMoon,
  onMethod,
  siteCount = 18,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: () => void
  onMoon: () => void
  onMethod: () => void
  siteCount?: number
}) {
  const runAndClose = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[880px] gap-0 p-0 max-sm:top-auto max-sm:bottom-2 max-sm:max-h-[calc(100dvh-1rem)] max-sm:translate-y-0 max-sm:rounded-b-2xl">
        <DialogHeader className="shrink-0 gap-2 px-5 py-5 pr-14 sm:px-7">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-mono tracking-[0.12em]">
              30-SECOND GUIDE
            </Badge>
            <Badge variant="earth" className="gap-1">
              <Sparkles className="size-2.5" />
              For judges &amp; first-time visitors
            </Badge>
          </div>
          <DialogTitle className="font-display mt-0.5 text-[22px] leading-[1.05] tracking-[-0.02em] text-balance sm:text-[26px]">
            From scenario to shortlist, in four moves.
          </DialogTitle>
          <DialogDescription className="max-w-[720px] text-[11.5px] leading-relaxed sm:text-[12.5px]">
            SelenoGrid is a browser-based screening lab for the lunar south pole. It combines real
            LOLA terrain, Sun and Earth geometry, and an explainable ranking to compare{' '}
            {siteCount} south-pole sites. It is a screening instrument, not a flight-certified
            site-selection tool.
          </DialogDescription>
        </DialogHeader>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <div className="grid gap-2 sm:grid-cols-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="rounded-2xl border border-border bg-secondary/35 p-3.5 transition-colors duration-150 hover:border-foreground/20 motion-reduce:transition-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card shadow-sm">
                      <Icon className={cn('size-4', step.tone)} />
                      <span className="tabular absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border border-border bg-popover font-mono text-[8px] font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[8px] tracking-[0.14em] text-muted-foreground">
                        STEP 0{index + 1}
                      </div>
                      <h3 className="mt-0.5 text-[12px] font-semibold">{step.title}</h3>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <section className="mt-2.5 rounded-2xl border border-border bg-card/60 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success" />
                <h3 className="text-[11px] font-semibold">What makes it credible</h3>
              </div>
              <span className="hidden font-mono text-[8px] tracking-[0.12em] text-muted-foreground uppercase sm:inline">
                auditable by design
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/60 pt-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {CREDENTIALS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-start gap-1.5">
                  <Icon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-[11px] leading-tight font-semibold">{value}</div>
                    <div className="mt-0.5 text-[8.5px] leading-snug text-muted-foreground">
                      {label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-dashed border-border px-3.5 py-2.5">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-sun" />
            <p className="text-[9.5px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">Honest limits.</span> Sites are
              representative points, not official landing ellipses. There is no thermal,
              power-system or link-budget model. Screening only. Not for flight-certified mission
              planning.
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card/60 px-5 py-3.5 sm:px-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
              <Button
                size="sm"
                className="col-span-2 w-full sm:col-span-1 sm:w-auto"
                onClick={() => runAndClose(onStart)}
              >
                Start with the scenario
                <ArrowRight />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => runAndClose(onMoon)}
              >
                <Moon />
                Open the 3D Moon
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => runAndClose(onMethod)}
              >
                <BookOpen />
                Read the method
              </Button>
            </div>
            <span className="hidden items-center gap-1.5 font-mono text-[8px] tracking-wide text-muted-foreground sm:flex">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">
                Esc
              </kbd>
              to close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
