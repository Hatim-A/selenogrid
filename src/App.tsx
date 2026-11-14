import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AtlasView } from '@/components/AtlasView'
import { CompareView } from '@/components/CompareView'
import { Footer } from '@/components/Footer'
import { Header, type View } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { MethodView } from '@/components/MethodView'
import { ScenarioBar } from '@/components/ScenarioBar'
import { SiteDetailDialog } from '@/components/SiteDetailDialog'
import { TimelineView } from '@/components/TimelineView'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useMissionMetrics } from '@/hooks/useMissionMetrics'
import { useSiteDataset } from '@/hooks/useSiteDataset'
import { fromDateInputValue, toDateInputValue } from '@/lib/format'
import { DEFAULT_WEIGHTS, rankSites, paretoFrontier } from '@/lib/or'
import type { Scenario, Weights } from '@/types'

const DEFAULT_IDS = [
  'mons-mouton',
  'mons-mouton-plateau',
  'malapert-massif',
  'nobile-rim-2',
  'haworth-rim',
  'shackleton-floor',
]

const TODAY = toDateInputValue(Date.now())

function themeFromDom(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export default function App() {
  const { data, error } = useSiteDataset()
  const [view, setView] = useState<View>('compare')
  const [theme, setTheme] = useState<'light' | 'dark'>(themeFromDom)
  const [date, setDate] = useState(TODAY)
  const [hour, setHour] = useState(12)
  const [days, setDays] = useState(180)
  const [stepHours, setStepHours] = useState(3)
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_IDS)
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS })
  const [detailId, setDetailId] = useState<string | null>(null)
  const [timelineFocus, setTimelineFocus] = useState<string | undefined>(undefined)

  const scenario: Scenario = useMemo(
    () => ({
      startIso: fromDateInputValue(date || TODAY, hour),
      days,
      stepHours,
    }),
    [date, hour, days, stepHours],
  )

  const { metrics, computing, computeMs } = useMissionMetrics(
    data?.sites ?? [],
    scenario,
    Boolean(data),
  )

  const selectedSites = useMemo(
    () => (data ? data.sites.filter((s) => selectedIds.includes(s.id)) : []),
    [data, selectedIds],
  )

  const ranked = useMemo(() => {
    if (!metrics) return []
    return rankSites(selectedSites, metrics, weights)
  }, [selectedSites, metrics, weights])

  const pareto = useMemo(() => {
    if (!metrics) return []
    return paretoFrontier(selectedSites, metrics)
  }, [selectedSites, metrics])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('selenogrid-theme', theme)
    } catch {
      // private mode: keep the in-memory preference
    }
  }, [theme])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])

  const openDetail = (id: string) => setDetailId(id)
  const addSite = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }
  const removeSite = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  const detailSite = data?.sites.find((s) => s.id === detailId) ?? null
  const detailMetrics = detailId && metrics ? metrics.get(detailId) ?? null : null
  const detailRanked = ranked.find((r) => r.site.id === detailId) ?? null

  const resetScenario = () => {
    setDate(TODAY)
    setHour(12)
    setDays(180)
    setStepHours(3)
  }

  return (
    <TooltipProvider delayDuration={160}>
      <div className="flex min-h-screen flex-col">
        <Header
          view={view}
          onView={setView}
          theme={theme}
          onTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 sm:px-6">
          {view === 'compare' && (
            <Hero
              onMethod={() => setView('method')}
              onCompare={() => document.getElementById('scenario')?.scrollIntoView({ behavior: 'smooth' })}
            />
          )}

          {view !== 'method' && (
            <ScenarioBar
              date={date}
              hour={hour}
              days={days}
              stepHours={stepHours}
              onDate={setDate}
              onHour={setHour}
              onDays={setDays}
              onStep={setStepHours}
              onReset={resetScenario}
              computing={computing}
              computeMs={computeMs}
            />
          )}

          <div className="mt-4 pb-6">
            {error ? (
              <ErrorPanel message={error} />
            ) : !data ? (
              <LoadingPanel mode="data" />
            ) : view === 'method' ? (
              <MethodView onCompare={() => setView('compare')} />
            ) : !metrics ? (
              <LoadingPanel mode="compute" />
            ) : view === 'compare' ? (
              <CompareView
                sites={data.sites}
                selectedIds={selectedIds}
                metricsById={metrics}
                ranked={ranked}
                pareto={pareto}
                weights={weights}
                onSelected={setSelectedIds}
                onWeights={setWeights}
                onOpen={openDetail}
                onRemove={removeSite}
              />
            ) : view === 'timeline' ? (
              <TimelineView
                key={timelineFocus ?? 'timeline'}
                sites={selectedSites}
                metricsById={metrics}
                ranked={ranked}
                days={days}
                startMs={Date.parse(scenario.startIso)}
                theme={theme}
                initialFocusId={timelineFocus}
                onOpen={openDetail}
              />
            ) : (
              <AtlasView
                sites={data.sites}
                metricsById={metrics}
                selectedIds={selectedIds}
                theme={theme}
                onOpen={openDetail}
                onAdd={addSite}
              />
            )}
          </div>
        </main>

        <Footer onMethod={() => setView('method')} />
      </div>

      <SiteDetailDialog
        site={detailSite}
        metrics={detailMetrics}
        ranked={detailRanked}
        weights={weights}
        theme={theme}
        open={detailId !== null && Boolean(detailMetrics)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        onTimeline={(id) => {
          setTimelineFocus(id)
          setDetailId(null)
          setView('timeline')
        }}
        onAdd={addSite}
      />
    </TooltipProvider>
  )
}

function LoadingPanel({ mode }: { mode: 'data' | 'compute' }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/55 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Loader2 className="size-4 animate-spin text-earth" />
          <div>
            <div className="text-[11.5px] font-medium">
              {mode === 'data' ? 'Loading LOLA terrain…' : 'Propagating Sun and Earth…'}
            </div>
            <div className="text-[9.5px] text-muted-foreground">
              {mode === 'data'
                ? 'Fetching the 20 m south-polar horizon profiles and hillshade tiles.'
                : `Computing the curated sites over the mission window in your browser.`}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="font-mono">
          client-side
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[260px] animate-pulse rounded-2xl border border-border bg-card/40"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-card px-6 py-12 text-center">
      <div className="text-[14px] font-semibold">Could not start the model</div>
      <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-muted-foreground">
        {message}. Check that <code className="font-mono">public/data/sites.json</code> is available,
        then reload.
      </p>
    </div>
  )
}
