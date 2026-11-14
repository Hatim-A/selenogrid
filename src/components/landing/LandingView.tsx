import '../../landing.css'
import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react'
import { Reveal } from '@/components/ui/Reveal'
import type { RankedSite, Site, SiteMetrics } from '@/types'
import { ChapterRail } from './ChapterRail'
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

function scrollToId(id: string) {
  if (typeof document === 'undefined') return
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' })
}

const VALIDATION_ROWS = [
  { q: 'Sun azimuth', ours: '350.754°', jpl: '350.742°', d: '+0.012°' },
  { q: 'Sun elevation', ours: '1.884°', jpl: '1.882°', d: '+0.002°' },
  { q: 'Earth azimuth', ours: '228.316°', jpl: '228.314°', d: '+0.002°' },
  { q: 'Earth elevation', ours: '−4.345°', jpl: '−4.341°', d: '−0.004°' },
  { q: 'Earth angular diameter', ours: '6482.7″', jpl: '6490.5″', d: '−7.8″' },
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

  const siteCount = sites.length > 0 ? sites.length : 18
  const moonSrc = `${import.meta.env.BASE_URL}data/${theme === 'light' ? 'hero-moon-light.webp' : 'hero-moon.webp'}`

  const stats = [
    { value: `${siteCount} sites`, label: 'curated terrain points · 9 NASA regions + 9 references' },
    { value: '1,440 bins', label: 'horizon azimuths per site · every 0.25°' },
    { value: '20 m LOLA', label: 'south-polar elevation grid · PDS archive' },
    { value: '<0.02°', label: 'Sun/Earth agreement vs JPL Horizons' },
  ]

  return (
    <div className="relative overflow-x-clip">
      <ChapterRail active={active} onJump={scrollToId} />

      {/* 1 — Hero */}
      <section id="top" className="relative flex min-h-svh scroll-mt-16 flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <Starfield speed={reduced ? 0 : undefined} />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-12 px-4 pt-24 pb-8 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 lg:pt-28">
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
            <Reveal delay={90}>
              <h1 className="mt-5 font-display text-[clamp(46px,8.5vw,102px)] leading-[0.98] tracking-[-0.02em] text-balance">
                See the <em className="text-sun italic">Sun</em>.
                <br />
                Hear <em className="text-earth italic">Earth</em>.
                <br />
                <span className="text-muted-foreground">Pick the ground.</span>
              </h1>
            </Reveal>
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
                  className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-7 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-transform duration-200 outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0"
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
            <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[440px]">
              <div
                aria-hidden="true"
                className="absolute inset-[-14%] rounded-full bg-[radial-gradient(circle_at_50%_45%,var(--glow-a),transparent_70%)] blur-2xl"
              />
              <div
                aria-hidden="true"
                className="orbit-breathe absolute inset-[6%] rounded-full bg-[var(--earth)]/10 blur-3xl"
              />
              <div className="relative aspect-square overflow-hidden rounded-full border border-border/70 shadow-[var(--shadow-float)]">
                <img
                  src={moonSrc}
                  alt="LOLA south-polar hillshade of the Moon with the curated landing sites"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_32%,transparent_30%,rgba(0,0,0,0.42)_100%)]" />
              </div>
              <div
                aria-hidden="true"
                className="orbit-slow absolute -inset-[4%] rounded-full border border-dashed border-foreground/15"
              >
                <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun" />
              </div>
              <div className="absolute bottom-[2%] left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-background/85 px-3.5 py-2 shadow-[var(--shadow-card)] backdrop-blur-md">
                <span className="font-mono text-[8.5px] tracking-wide whitespace-nowrap text-muted-foreground uppercase">
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

        <div className="relative border-t border-border/70">
          <div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 gap-y-6 px-4 py-6 sm:grid-cols-4 sm:divide-x sm:divide-border sm:px-6">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0 px-0 sm:px-6 sm:first:pl-0 sm:last:pr-0">
                <div className="tabular font-display text-[26px] leading-none tracking-[-0.02em] sm:text-[30px]">
                  {s.value}
                </div>
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
        <div className="mx-auto w-full max-w-[1180px] px-4 py-20 sm:px-6 sm:py-28">
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
        <div className="mx-auto w-full max-w-[1180px] px-4 py-20 sm:px-6 sm:py-28">
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
          <Reveal delay={120}>
            <div className="surface mt-10 overflow-hidden rounded-2xl">
              <div className="border-b border-border/70 px-4 py-3 sm:px-5">
                <p className="truncate font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground uppercase">
                  Shackleton area · 89.67°S 129.78°E · 2026-11-14 12:00 UTC
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
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
          <Reveal delay={180}>
            <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
              Honest limits: representative terrain points, not official landing ellipses. A
              comparative screening aid — not a flight-certified site selection. The
              terrain-plus-ephemeris visibility combination is not yet end-to-end validated
              against an independent illumination product.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Data sources">
              {SOURCE_CHIPS.map((chip) => (
                <li key={chip.label}>
                  <a
                    href={chip.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none hover:border-[var(--border-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_110%,var(--glow-a),transparent_70%)]"
        />
        <div className="relative mx-auto w-full max-w-[1180px] px-4 py-28 text-center sm:px-6 sm:py-36">
          <Reveal>
            <p className="eyebrow">The mission lab</p>
            <h2 className="mx-auto mt-4 max-w-[16ch] font-display text-[clamp(42px,7.5vw,92px)] leading-[1.0] tracking-[-0.02em] text-balance">
              Pick a date. Pick what matters.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
              Nine NASA regions and nine reference sites on one screen. Change the scenario,
              move the weights, watch the ranking — and the frontier — answer back.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
              <button
                type="button"
                onClick={onOpenLab}
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-8 text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-transform duration-200 outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0"
              >
                Open the mission lab
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onGuide}
                className="group inline-flex h-12 min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Take the 60-second guide
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
