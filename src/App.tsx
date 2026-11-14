import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AtlasView } from '@/components/AtlasView'
import { CompareView } from '@/components/CompareView'
import { CustomPointDialog } from '@/components/CustomPointDialog'
import { Footer } from '@/components/Footer'
import { Header, type View } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { JudgeGuide } from '@/components/JudgeGuide'
import { MethodView } from '@/components/MethodView'
import { ScenarioBar } from '@/components/ScenarioBar'
import { SiteDetailDialog } from '@/components/SiteDetailDialog'
import { TimelineView } from '@/components/TimelineView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useMissionMetrics } from '@/hooks/useMissionMetrics'
import { useSiteDataset } from '@/hooks/useSiteDataset'
import { fromDateInputValue, toDateInputValue } from '@/lib/format'
import { DEFAULT_WEIGHTS, rankSites, paretoFrontier } from '@/lib/or'
import { extractCustomSite } from '@/lib/polarDem'
import type { Scenario, Site, Weights } from '@/types'

const DEFAULT_IDS = [
  'mons-mouton',
  'mons-mouton-plateau',
  'nobile-rim-1',
  'nobile-rim-2',
  'cabeus-b-peak',
  'malapert-massif',
  'de-gerlache-rim-2',
  'haworth-rim',
  'slater-plain',
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
  const [guideOpen, setGuideOpen] = useState(false)
  const [moonFocus, setMoonFocus] = useState<string | null>(null)
  const [customSites, setCustomSites] = useState<Site[]>([])
  const [customOpen, setCustomOpen] = useState(false)
  const [customSeed, setCustomSeed] = useState<{ lat: number; lon: number } | null>(null)
  const [customBusy, setCustomBusy] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)

  const allSites = useMemo(
    () => [...(data?.sites ?? []), ...customSites],
    [data, customSites],
  )

  const scenario: Scenario = useMemo(
    () => ({
      startIso: fromDateInputValue(date || TODAY, hour),
      days,
      stepHours,
    }),
    [date, hour, days, stepHours],
  )

  const { metrics, computing, computeMs } = useMissionMetrics(
    allSites,
    scenario,
    Boolean(data),
  )

  const selectedSites = useMemo(
    () => allSites.filter((s) => selectedIds.includes(s.id)),
    [allSites, selectedIds],
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

  const detailSite = allSites.find((s) => s.id === detailId) ?? null
  const detailMetrics = detailId && metrics ? metrics.get(detailId) ?? null : null
  const detailRanked = ranked.find((r) => r.site.id === detailId) ?? null

  const handleView = (next: View) => {
    setView(next)
    setMoonFocus(null)
  }

  const resetScenario = () => {
    setDate(TODAY)
    setHour(12)
    setDays(180)
    setStepHours(3)
  }

  const openCustom = (lat?: number, lon?: number) => {
    setCustomSeed(lat !== undefined && lon !== undefined ? { lat, lon } : null)
    setCustomError(null)
    setCustomOpen(true)
  }

  const createCustomSite = async (lat: number, lon: number, name?: string) => {
    setCustomBusy(true)
    setCustomError(null)
    try {
      const site = await extractCustomSite(lat, lon, customSites.length + 1, name)
      setCustomSites((prev) => (prev.some((s) => s.id === site.id) ? prev : [...prev, site]))
      setSelectedIds((prev) => (prev.includes(site.id) ? prev : [...prev, site.id]))
      setCustomOpen(false)
      setCustomSeed(null)
      setDetailId(site.id)
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Could not sample that coordinate.')
    } finally {
      setCustomBusy(false)
    }
  }

  return (
    <TooltipProvider delayDuration={160}>
      <div className="flex min-h-screen flex-col">
        <Header
          view={view}
          onView={handleView}
          theme={theme}
          onTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onGuide={() => setGuideOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 sm:px-6">
          {view === 'compare' && (
            <Hero
              siteCount={allSites.length}
              onGuide={() => setGuideOpen(true)}
              onCompare={() =>
                document
                  .getElementById('snapshot')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
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
                sites={allSites}
                selectedIds={selectedIds}
                metricsById={metrics}
                ranked={ranked}
                pareto={pareto}
                weights={weights}
                onSelected={setSelectedIds}
                onWeights={setWeights}
                onOpen={openDetail}
                onRemove={removeSite}
                onCustom={() => openCustom()}
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
                key={moonFocus ?? 'moon'}
                sites={allSites}
                metricsById={metrics}
                selectedIds={selectedIds}
                theme={theme}
                focusId={moonFocus}
                scenarioStartIso={scenario.startIso}
                onOpen={openDetail}
                onAdd={addSite}
                onCustomOpen={() => openCustom()}
                onCustomCoord={(lat, lon) => openCustom(lat, lon)}
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
        onMoon={(id) => {
          setMoonFocus(id)
          setDetailId(null)
          setView('atlas')
        }}
        onAdd={addSite}
      />

      <CustomPointDialog
        open={customOpen}
        onOpenChange={(open) => {
          setCustomOpen(open)
          if (!open) setCustomSeed(null)
        }}
        initialLat={customSeed?.lat}
        initialLon={customSeed?.lon}
        busy={customBusy}
        error={customError}
        onCreate={createCustomSite}
      />

      <JudgeGuide
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onStart={() => {
          setGuideOpen(false)
          setMoonFocus(null)
          setView('compare')
          window.setTimeout(() => {
            document.getElementById('scenario')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 80)
        }}
        onMoon={() => {
          setGuideOpen(false)
          setMoonFocus(null)
          setView('atlas')
        }}
        onMethod={() => {
          setGuideOpen(false)
          setMoonFocus(null)
          setView('method')
        }}
        siteCount={allSites.length}
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
      <div className="text-[14px] font-semibold">Could not load the terrain dataset</div>
      <p className="mx-auto mt-1 max-w-md text-[11px] leading-relaxed text-muted-foreground">
        {message}. Reload the page to try again. If the problem persists, the shipped site dataset
        may be incomplete.
      </p>
      <Button className="mt-4" size="sm" onClick={() => window.location.reload()}>
        Reload SelenoGrid
      </Button>
    </div>
  )
}
