import '../../landing.css'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Check, ChevronDown } from 'lucide-react'
import { Reveal } from '@/components/ui/Reveal'
import { scrollToSection } from '@/hooks/useSmoothScroll'
import type { RankedSite, Site, SiteMetrics } from '@/types'
import { AuroraField, GlowDivider, OrbitRing } from './Backgrounds'
import { ChapterRail } from './ChapterRail'

const HeroMoonGlobe = lazy(() =>
  import('./HeroMoonGlobe').then((module) => ({ default: module.HeroMoonGlobe })),
)
import { Chapters } from './Chapters'
import { ScrubMission } from './ScrubMission'
import { Starfield } from './Starfield'

type LandingViewProps = {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  ranked: RankedSite[]
  /** Light theme restyles the moon visual; defaults to dark. */
  theme?: 'light' | 'dark'
  onOpenLab: () => void
  onOpenSite: (id: string) => void
  onGuide: () => void
}

const SECTION_IDS = [
  'top',
  'chapter-01',
  'chapter-02',
  'chapter-03',
  'chapter-04',
  'film',
  'proof',
  'cta',
]

function motionOK(): boolean {
  return (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function' ||
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const scrollToId = scrollToSection

/* ——— Small hooks: inview-once + eased count-up ——— */

function useInViewOnce<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, inView }
}

function useCountUp(target: number, start: boolean, duration = 1200): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    if (!motionOK()) {
      setValue(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [start, target, duration])
  return value
}

function StatValue({
  target,
  format,
}: {
  target: number
  format: (v: number) => string
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>()
  const value = useCountUp(target, inView)
  return (
    <div
      ref={ref}
      className="tabular font-display text-[26px] leading-none tracking-[-0.02em] sm:text-[30px]"
    >
      {format(value)}
    </div>
  )
}

/* ——— Proof data: SelenoGrid minus JPL Horizons (Shackleton area) ——— */

const VALIDATION_ROWS = [
  { q: 'Sun azimuth', ours: '350.754°', jpl: '350.742°', d: '+0.012°' },
  { q: 'Sun elevation', ours: '1.884°', jpl: '1.882°', d: '+0.002°' },
  { q: 'Earth azimuth', ours: '228.316°', jpl: '228.314°', d: '+0.002°' },
  { q: 'Earth elevation', ours: '−4.345°', jpl: '−4.341°', d: '−0.004°' },
  { q: 'Earth angular diameter', ours: '6482.7″', jpl: '6490.5″', d: '−7.8″' },
]

/** Residual magnitudes in degrees — truthful source for the log-scale bars. */
const RESIDUALS = [
  { q: 'Sun azimuth', d: '+0.012°', magDeg: 0.012, sign: 1 as const },
  { q: 'Sun elevation', d: '+0.002°', magDeg: 0.002, sign: 1 as const },
  { q: 'Earth azimuth', d: '+0.002°', magDeg: 0.002, sign: 1 as const },
  { q: 'Earth elevation', d: '−0.004°', magDeg: 0.004, sign: -1 as const },
  { q: 'Earth diameter', d: '−7.8″', magDeg: 7.8 / 3600, sign: -1 as const },
]

const LOG_MIN = -3 // 0.001°
const LOG_MAX = Math.log10(0.02) // 0.02° ceiling

function residWidth(magDeg: number): string {
  const t = (Math.log10(magDeg) - LOG_MIN) / (LOG_MAX - LOG_MIN)
  return `${(Math.min(1, Math.max(0.04, t)) * 100).toFixed(1)}%`
}

const LIMIT_CARDS = [
  {
    title: 'Representative points',
    body: '18 terrain samples — not official landing ellipses. A point a few kilometres away can rank differently.',
  },
  {
    title: 'Screening aid only',
    body: 'A comparative trade-off tool. Not flight-certified site selection, and not flight dynamics.',
  },
  {
    title: 'Combo not yet validated',
    body: 'Terrain-plus-ephemeris visibility is not yet end-to-end validated against an independent illumination product.',
  },
  {
    title: 'Coarse custom pins',
    body: 'Custom pins sample a 640 m grid and are labelled as such — screening at lower fidelity.',
  },
]

const SOURCE_CHIPS = [
  {
    label: 'LOLA PDS',
    href: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/',
  },
  {
    label: 'NASA regions',
    href: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/',
  },
  { label: 'JPL Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' },
  { label: 'SVS Moon Kit', href: 'https://svs.gsfc.nasa.gov/4720' },
]

const HEADLINE_LINES: ReactNode[] = [
  <>
    See the <em className="text-sun italic">Sun</em>.
  </>,
  <>
    Hear <em className="text-earth italic">Earth</em>.
  </>,
  <span className="text-muted-foreground">Pick the ground.</span>,
]

export function LandingView({
  sites,
  metricsById,
  ranked,
  theme = 'dark',
  onOpenLab,
  onOpenSite,
  onGuide,
}: LandingViewProps) {
  const [active, setActive] = useState<string>('top')
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [loaded, setLoaded] = useState(false)
  const moonRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    for (const id of SECTION_IDS) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])

  // Per-line masked headline reveal, fired once on load.
  useEffect(() => {
    if (reduced) {
      setLoaded(true)
      return
    }
    const raf = window.requestAnimationFrame(() => setLoaded(true))
    return () => window.cancelAnimationFrame(raf)
  }, [reduced])

  // Mouse-follow radial glow on the moon visual: pointer-only, rAF-lerped,
  // transform-only. Settles back to centre when the pointer leaves.
  useEffect(() => {
    if (reduced) return
    if (typeof window === 'undefined') return
    if (
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return
    }
    const moon = moonRef.current
    const glow = glowRef.current
    if (!moon || !glow) return
    let raf = 0
    let running = false
    let hovering = false
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    const loop = () => {
      x += (tx - x) * 0.08
      y += (ty - y) * 0.08
      glow.style.transform = `translate3d(${(x * 26).toFixed(1)}px, ${(y * 26).toFixed(1)}px, 0)`
      if (hovering || Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) {
        raf = window.requestAnimationFrame(loop)
      } else {
        running = false
      }
    }
    const kick = () => {
      if (!running) {
        running = true
        raf = window.requestAnimationFrame(loop)
      }
    }
    const onMove = (e: PointerEvent) => {
      const rect = moon.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      kick()
    }
    const onEnter = () => {
      hovering = true
      kick()
    }
    const onLeave = () => {
      hovering = false
      tx = 0
      ty = 0
      kick()
    }
    moon.addEventListener('pointermove', onMove)
    moon.addEventListener('pointerenter', onEnter)
    moon.addEventListener('pointerleave', onLeave)
    return () => {
      window.cancelAnimationFrame(raf)
      running = false
      moon.removeEventListener('pointermove', onMove)
      moon.removeEventListener('pointerenter', onEnter)
      moon.removeEventListener('pointerleave', onLeave)
    }
  }, [reduced])

  const siteCount = sites.length > 0 ? sites.length : 18
  const moonSrc = `${import.meta.env.BASE_URL}data/${theme === 'light' ? 'hero-moon-light.webp' : 'hero-moon.webp'}`
  const tickerNames = sites.map((s) => s.shortName)

  const stats = [
    {
      target: siteCount,
      format: (v: number) => `${Math.round(v)} sites`,
      label: 'curated terrain points · 9 NASA regions + 9 references',
    },
    {
      target: 1440,
      format: (v: number) => `${Math.round(v).toLocaleString('en-US')} bins`,
      label: 'horizon azimuths per site · every 0.25°',
    },
    {
      target: 20,
      format: (v: number) => `${Math.round(v)} m LOLA`,
      label: 'south-polar elevation grid · PDS archive',
    },
    {
      target: 0.02,
      format: (v: number) => `<${v.toFixed(2)}°`,
      label: 'Sun/Earth agreement vs JPL Horizons',
    },
  ]

  return (
    <div className="relative overflow-x-clip">
      <ChapterRail active={active} onJump={scrollToId} />

      {/* 1 — Hero */}
      <section
        id="top"
        className={`relative flex min-h-svh scroll-mt-16 flex-col ${loaded ? 'lp-hero-loaded' : ''}`}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <AuroraField variant="hero" />
          <Starfield speed={reduced ? 0 : undefined} />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1440px] flex-1 items-center gap-12 px-4 pt-24 pb-8 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 lg:pt-28">
          <div className="min-w-0">
            <Reveal>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-gradient-to-r from-sun to-earth"
                />
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  NASA Space Apps 2026 · Lunar landing-site navigator
                </p>
              </div>
            </Reveal>
            <h1 className="mt-5 font-display text-[clamp(40px,6vw,72px)] leading-[1.02] font-bold tracking-[-0.02em] text-balance">
              {HEADLINE_LINES.map((line, i) => (
                <span key={i} className="lp-mask" aria-hidden={false}>
                  <span
                    className="lp-mask-inner"
                    style={{ transitionDelay: reduced ? undefined : `${120 + i * 110}ms` }}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>
            <Reveal delay={170}>
              <p className="mt-6 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground sm:text-[15.5px]">
                SelenoGrid compares {siteCount} south-pole terrain points — nine NASA candidate
                regions plus nine reference sites — on real 20&nbsp;m LOLA horizons and
                JPL-checked Sun/Earth geometry. Transparent ranking, no black boxes.
              </p>
            </Reveal>
            <Reveal delay={250}>
              <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
                <button
                  type="button"
                  onClick={onOpenLab}
                  className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-sun px-7 text-[13.5px] font-semibold text-white shadow-[var(--shadow-card)] transition-all duration-200 outline-none hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-[1.07] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.98] dark:text-[#1c1305]"
                >
                  Open the mission lab
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onGuide}
                  className="group inline-flex h-12 min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  60-second guide
                  <ArrowUpRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <p className="mt-5 font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground/75 uppercase">
                Client-side · No backend · Representative points, not ellipses
              </p>
            </Reveal>
          </div>

          <Reveal delay={140} className="relative min-w-0">
            <div ref={moonRef} className="relative mx-auto w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[440px]">
              <div
                ref={glowRef}
                aria-hidden="true"
                className="lp-glow-sun pointer-events-none absolute inset-[-14%] rounded-full blur-2xl"
                style={{ willChange: 'transform' }}
              />
              <div
                aria-hidden="true"
                className="orbit-breathe pointer-events-none absolute inset-[6%] rounded-full bg-[var(--earth)]/10 blur-3xl"
              />
              <div className="relative aspect-square">
                <Suspense
                  fallback={
                    <img
                      src={moonSrc}
                      alt="LOLA south-polar hillshade of the Moon with the curated landing sites"
                      className="size-full rounded-full object-cover"
                    />
                  }
                >
                  <HeroMoonGlobe className="absolute inset-0" />
                </Suspense>
              </div>
              <OrbitRing className="-inset-[4%]" />
              <span
                aria-hidden="true"
                className="absolute top-[1%] left-1/2 z-10 size-1.5 -translate-x-1/2 rounded-full bg-sun shadow-[0_0_12px_2px_var(--sun-soft)]"
              />
              {/* Floating mini-chips: rounded validation values + dataset density. */}
              <span
                className="lp-stat-chip lp-float-slow absolute top-[4%] right-[-1%] z-10"
                title="Shackleton-area validation: Sun elevation 1.884°"
              >
                <span aria-hidden="true" className="lp-pulse-soft size-1.5 rounded-full bg-sun" />
                Sun el +1.9°
              </span>
              <span
                className="lp-stat-chip lp-float-slow absolute top-[44%] left-[-6%] z-10 hidden sm:inline-flex"
                style={{ animationDelay: '-2.4s' }}
                title="Shackleton-area validation: Earth elevation −4.345°"
              >
                <span aria-hidden="true" className="lp-pulse-soft size-1.5 rounded-full bg-earth" />
                Earth el −4.3°
              </span>
              <span
                className="lp-stat-chip lp-float-slow absolute right-[0%] bottom-[16%] z-10 hidden min-[420px]:inline-flex"
                style={{ animationDelay: '-4.8s' }}
                title="Every site carries a 1,440-bin terrain horizon"
              >
                1,440 bins
              </span>
              <div className="absolute bottom-[2%] left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-background/85 px-3.5 py-2 shadow-[var(--shadow-card)] backdrop-blur-md">
                <span className="lp-kicker whitespace-nowrap">
                  LOLA south pole · 20 m grid
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="relative flex justify-center pb-5">
          <button
            type="button"
            onClick={() => scrollToId('chapter-01')}
            className="group flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-6 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Scroll to chapter one"
          >
            <span className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground uppercase">
              Scroll
            </span>
            <ChevronDown
              className="size-4 text-muted-foreground motion-safe:animate-bounce"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Site-name marquee ticker */}
        {tickerNames.length > 0 && (
          <div
            className="lp-marquee relative border-t border-border/70"
            aria-label="All curated landing sites"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
            />
            <div
              className="lp-marquee-track py-3"
              style={{
                maskImage:
                  'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage:
                  'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
              }}
            >
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {tickerNames.map((name, i) => (
                    <span key={`${copy}-${name}-${i}`} className="flex items-center">
                      <span className="px-5 font-mono text-[10px] tracking-[0.22em] whitespace-nowrap text-muted-foreground uppercase">
                        {name}
                      </span>
                      <span aria-hidden="true" className="size-1 rotate-45 bg-sun/60" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative border-t border-border/70">
          <div className="mx-auto grid w-full max-w-[1440px] grid-cols-2 gap-y-6 px-4 py-6 sm:grid-cols-4 sm:divide-x sm:divide-border sm:px-8">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0 px-0 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <StatValue target={s.target} format={s.format} />
                <div className="mt-1.5 max-w-[210px] text-[11px] leading-snug text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2 — Sticky chapter journey */}
      <Chapters
        sites={sites}
        metricsById={metricsById}
        ranked={ranked}
        active={active}
        onOpenSite={onOpenSite}
      />

      {/* 3 — ScrubMission film moment (owns its own UI) */}
      <section id="film" aria-label="Scrub the mission" className="relative scroll-mt-16 border-t border-border/60">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-8 sm:py-28">
          <h2 className="sr-only">Scrub through the mission window</h2>
          <ScrubMission
            sites={sites}
            metricsById={metricsById}
            ranked={ranked}
            onOpenSite={onOpenSite}
          />
        </div>
      </section>

      {/* 4 — Proof strip */}
      <section id="proof" className="relative scroll-mt-16 border-t border-border/60">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <p className="eyebrow">Validation</p>
            <h2 className="mt-3 max-w-[20ch] font-display text-[34px] leading-[1.02] tracking-[-0.02em] text-balance sm:text-[52px]">
              Checked against <span className="text-earth">JPL Horizons</span>.
            </h2>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
              The astronomy engine was compared with JPL Horizons at a Shackleton-area site —
              SelenoGrid minus Horizons. Typical agreement is about 0.02° for Sun and Earth
              directions: fit for comparative screening, not flight dynamics.
            </p>
          </Reveal>

          <div className="mt-10">
            <GlowDivider />
          </div>

          <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <Reveal className="min-w-0">
              <div className="surface overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
                  <p className="truncate font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground uppercase">
                    Shackleton area · 89.67°S 129.78°E · 2026-11-14 12:00 UTC
                  </p>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
                    <span className="pulse-dot size-1.5 rounded-full bg-success" aria-hidden="true" />
                    Δ max 0.012°
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left">
                    <thead>
                      <tr className="font-mono text-[9.5px] tracking-[0.12em] text-muted-foreground uppercase">
                        <th scope="col" className="px-4 py-3 font-medium sm:px-5">Quantity</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">SelenoGrid</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">Horizons</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {VALIDATION_ROWS.map((row) => (
                        <tr key={row.q} className="border-t border-border/60">
                          <th scope="row" className="px-4 py-3 text-[12.5px] font-medium sm:px-5">
                            {row.q}
                          </th>
                          <td className="tabular px-4 py-3 text-right font-mono text-[12px]">{row.ours}</td>
                          <td className="tabular px-4 py-3 text-right font-mono text-[12px] text-muted-foreground">
                            {row.jpl}
                          </td>
                          <td className="tabular px-4 py-3 text-right font-mono text-[12px] text-sun sm:px-5">
                            {row.d}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>

            <Reveal delay={110} className="min-w-0">
              <div className="surface h-full rounded-2xl p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="eyebrow">Residual magnitude</p>
                  <p className="lp-kicker">log scale</p>
                </div>
                <div className="mt-4 space-y-3.5">
                  {RESIDUALS.map((r) => (
                    <div key={r.q}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="truncate text-[11.5px] font-medium">{r.q}</span>
                        <span className="tabular shrink-0 font-mono text-[11px] text-muted-foreground">
                          {r.d}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-foreground/10"
                        role="img"
                        aria-label={`${r.q} residual ${r.d}`}
                      >
                        <div
                          className={`h-full rounded-full ${r.sign > 0 ? 'bg-sun' : 'bg-earth'}`}
                          style={{ width: residWidth(r.magDeg) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-border/70 pt-3">
                  <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
                    <span>0.001°</span>
                    <span>0.01°</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Log scale across two decades — all five residuals sit below 0.02°,
                    most near a few thousandths of a degree.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="mt-12">
            <GlowDivider />
          </div>

          <Reveal className="mt-8">
            <p className="eyebrow">Limits, stated plainly</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {LIMIT_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="surface flex items-start gap-3 rounded-2xl p-4 transition-colors hover:border-[var(--border-strong)]"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold tracking-[-0.01em]">
                      {card.title}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
                      {card.body}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="mt-12">
            <GlowDivider />
          </div>

          <Reveal className="mt-8">
            <p className="eyebrow">Open data, open method</p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Data sources">
              {SOURCE_CHIPS.map((chip) => (
                <li key={chip.label}>
                  <a
                    href={chip.href}
                    target="_blank"
                    rel="noreferrer"
                    className="lp-card-sheen inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none hover:border-[var(--border-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {chip.label}
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 5 — Final CTA */}
      <section id="cta" className="relative scroll-mt-16 overflow-x-clip border-t border-border/60">
        <AuroraField variant="cta" />
        <div className="relative mx-auto w-full max-w-[1440px] px-4 py-28 text-center sm:px-8 sm:py-36">
          <Reveal>
            <p className="eyebrow">The mission lab</p>
            <h2 className="mx-auto mt-4 max-w-[16ch] font-display text-[clamp(40px,7vw,88px)] leading-[1.0] font-bold tracking-[-0.025em] text-balance">
              Pick a <span className="lp-shimmer-text">date.</span> Pick what{' '}
              <span className="lp-shimmer-text">matters.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
              Nine NASA regions and nine reference sites on one screen. Change the scenario,
              move the weights, watch the ranking — and the frontier — answer back.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
              <button
                type="button"
                onClick={onOpenLab}
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-sun px-8 text-[14px] font-semibold text-white shadow-[var(--shadow-card)] transition-all duration-200 outline-none hover:scale-[1.045] hover:-translate-y-0.5 hover:brightness-[1.07] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.97] dark:text-[#1c1305]"
              >
                Open the mission lab
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
              <button
                type="button"
                onClick={onGuide}
                className="group inline-flex h-11 min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Take the 60-second guide
                <ArrowUpRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px"
                  aria-hidden="true"
                />
              </button>
              <span aria-hidden="true" className="text-muted-foreground/50">
                ·
              </span>
              <button
                type="button"
                onClick={() => scrollToId('proof')}
                className="group inline-flex h-11 min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                See the validation
                <ArrowUpRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px"
                  aria-hidden="true"
                />
              </button>
            </div>
            <p className="mt-7 font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground/75 uppercase">
              {siteCount} sites · 1,440-bin horizons · open method · open data
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
