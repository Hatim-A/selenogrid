import { useEffect, useMemo, useState } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { AtlasView } from '@/components/AtlasView'
import { CompareView } from '@/components/CompareView'
import { CustomPointDialog } from '@/components/CustomPointDialog'
import { Footer } from '@/components/Footer'
import { Header, type View } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { LandingView } from '@/components/landing/LandingView'
import SmoothScroll from '@/components/landing/SmoothScroll'
import { SpaceBackdrop } from '@/components/SpaceBackdrop'
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
import { scrollToElement, scrollTopInstant, scrollTopSmooth } from '@/hooks/useSmoothScroll'
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

type UrlState = {
  view?: View
  date?: string
  hour?: number
  days?: number
  stepHours?: number
  selectedIds?: string[]
  weights?: Weights
}

function readUrlState(): UrlState {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view')
  const date = params.get('date')
  const hourParam = params.get('hour')
  const daysParam = params.get('days')
  const stepParam = params.get('step')
  const hour = hourParam ? Number(hourParam) : Number.NaN
  const days = daysParam ? Number(daysParam) : Number.NaN
  const stepHours = stepParam ? Number(stepParam) : Number.NaN
  const selectedIds = params
    .get('sites')
    ?.split(',')
    .filter(Boolean)
  const rawWeights = params
    .get('w')
    ?.split(',')
    .map(Number)

  const next: UrlState = {}
  if (
    view === 'landing' ||
    view === 'compare' ||
    view === 'timeline' ||
    view === 'atlas' ||
    view === 'method'
  ) {
    next.view = view
  }
  if (
    date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(`${date}T12:00:00Z`))
  ) {
    next.date = date
  }
  if ([0, 6, 12, 18].includes(hour)) next.hour = hour
  if ([30, 90, 180, 365].includes(days)) next.days = days
  if ([1, 3, 6].includes(stepHours)) next.stepHours = stepHours
  if (selectedIds?.length) next.selectedIds = selectedIds
  if (
    rawWeights?.length === 4 &&
    rawWeights.every((value) => Number.isFinite(value) && value >= 0) &&
    rawWeights.some((value) => value > 0)
  ) {
    next.weights = {
      sunlight: rawWeights[0],
      comm: rawWeights[1],
      flux: rawWeights[2],
      slope: rawWeights[3],
    }
  }
  return next
}

const URL_STATE = readUrlState()

function themeFromDom(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function scrollIntoViewCalm(element: HTMLElement | null) {
  scrollToElement(element)
}

export default function App() {
  const { data, error } = useSiteDataset()
  const [view, setView] = useState<View>(URL_STATE.view ?? 'landing')
  const [theme, setTheme] = useState<'light' | 'dark'>(themeFromDom)
  const [date, setDate] = useState(URL_STATE.date ?? TODAY)
  const [hour, setHour] = useState(URL_STATE.hour ?? 12)
  const [days, setDays] = useState(URL_STATE.days ?? 180)
  const [stepHours, setStepHours] = useState(URL_STATE.stepHours ?? 3)
  const [selectedIds, setSelectedIds] = useState<string[]>(URL_STATE.selectedIds ?? DEFAULT_IDS)
  const [weights, setWeights] = useState<Weights>(URL_STATE.weights ?? { ...DEFAULT_WEIGHTS })
  const [detailId, setDetailId] = useState<string | null>(null)
  const [timelineFocus, setTimelineFocus] = useState<string | undefined>(undefined)
  const [guideOpen, setGuideOpen] = useState(false)
  const [moonFocus, setMoonFocus] = useState<string | null>(null)
  const [customSites, setCustomSites] = useState<Site[]>([])
  const [customOpen, setCustomOpen] = useState(false)
  const [customSeed, setCustomSeed] = useState<{ lat: number; lon: number } | null>(null)
  const [customBusy, setCustomBusy] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

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
    const params = new URLSearchParams()
    params.set('view', view)
    params.set('date', date)
    params.set('hour', String(hour))
    params.set('days', String(days))
    params.set('step', String(stepHours))
    const shareableSites = selectedIds.filter((id) => !id.startsWith('custom-'))
    if (shareableSites.length) params.set('sites', shareableSites.join(','))
    params.set(
      'w',
      [weights.sunlight, weights.comm, weights.flux, weights.slope]
        .map((value) => value.toFixed(3))
        .join(','),
    )
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [view, date, hour, days, stepHours, selectedIds, weights])

  useEffect(() => {
    if (!data) return
    setSelectedIds((previous) => {
      const valid = previous.filter((id) => allSites.some((site) => site.id === id))
      return valid.length === previous.length ? previous : valid
    })
  }, [data, allSites])

  useEffect(() => {
    scrollTopInstant()
    setShowBackToTop(false)
  }, [view])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
      <SmoothScroll>
      <div className="flex min-h-screen flex-col">
        <SpaceBackdrop dark={theme === 'dark'} />
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-[var(--shadow-card)] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Skip to content
        </a>
        <Header
          view={view}
          onView={handleView}
          theme={theme}
          onTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onGuide={() => setGuideOpen(true)}
        />

        <main id="main-content" tabIndex={-1} className="w-full flex-1 scroll-mt-20 px-4 outline-none sm:px-8 xl:px-12 2xl:mx-auto 2xl:max-w-[1800px]">
          {view === 'compare' && (
            <Hero
              siteCount={allSites.length || 18}
              sites={allSites}
              selectedIds={selectedIds}
              topSiteId={ranked[0]?.site.id}
              theme={theme}
              onOpen={openDetail}
              onGuide={() => setGuideOpen(true)}
              onCompare={() => scrollIntoViewCalm(document.getElementById('snapshot'))}
            />
          )}

          {view !== 'method' && view !== 'landing' && (
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

          <div key={view} className="mt-4 animate-fade-up pb-6 [animation-duration:450ms]">
            {error ? (
              <ErrorPanel message={error} />
            ) : !data ? (
              <LoadingPanel mode="data" />
            ) : view === 'method' ? (
              <MethodView onCompare={() => setView('compare')} />
            ) : !metrics ? (
              <LoadingPanel mode="compute" />
            ) : view === 'landing' ? (
              <LandingView
                sites={allSites}
                metricsById={metrics}
                ranked={ranked}
                theme={theme}
                onOpenLab={() => setView('compare')}
                onOpenSite={openDetail}
                onGuide={() => setGuideOpen(true)}
              />
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

      {showBackToTop && (
        <button
          type="button"
          onClick={() => scrollTopSmooth()}
          aria-label="Back to top"
          className="fixed right-4 bottom-4 z-40 inline-flex size-10 animate-fade-in cursor-pointer items-center justify-center rounded-full border border-border bg-background/85 text-foreground shadow-[var(--shadow-card)] backdrop-blur-md transition outline-none hover:-translate-y-0.5 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 sm:right-6 sm:bottom-6"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      )}

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
            scrollIntoViewCalm(document.getElementById('scenario'))
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
      </SmoothScroll>
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
