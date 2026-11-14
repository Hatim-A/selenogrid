import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  GitBranch,
  Mountain,
  Orbit,
  Radio,
  ShieldCheck,
  Sigma,
  Sun,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/ui/Reveal'

const STEPS = [
  {
    icon: Database,
    title: 'Ingest real terrain',
    body: 'LRO LOLA south-polar DEM at 20 m/px: 30,400² samples, 0.5 m vertical DN, 1737.4 km sphere. No synthetic heightmaps.',
  },
  {
    icon: Mountain,
    title: 'Build the skyline',
    body: 'For each site, 1,440 rays (0.25°) are marched to 220 km with exact lunar curvature. The result is a 360° terrain horizon.',
  },
  {
    icon: Orbit,
    title: 'Propagate the sky',
    body: 'Meeus Sun and Moon ephemerides plus the IAU 2009 lunar orientation give Sun and Earth az/el in each site’s local frame.',
  },
  {
    icon: Sigma,
    title: 'Rank transparently',
    body: 'Visibility becomes sunlight, Earth-link and flux metrics. TOPSIS turns them into a weighted shortlist; a Pareto view keeps the trade-offs honest.',
  },
]

const METRICS = [
  ['Sunlight %', 'Fraction of the sampled window with any part of the solar disk above the terrain horizon.'],
  ['Earth visibility %', 'Fraction of the window with any part of the Earth disk above the terrain horizon.'],
  ['Solar flux proxy', 'Mean of sin(Sun elevation) while lit. A relative power index, not a wattage prediction.'],
  ['Longest window', 'Longest continuous Sun or Earth visibility interval inside the scenario window.'],
  ['Next event', 'First sunset, sunrise, Earthset or Earthrise after the start, refined by bisection.'],
  ['Local slope', 'Best-fit 1 km slope from the 20 m DEM. Used as a cost criterion, not a landing constraint.'],
  ['Open sky', 'Fraction of the full sky dome not blocked by the local horizon. Context, not a ranking criterion.'],
]

const VALIDATION = [
  ['Sun azimuth', '350.754°', '350.742°', '+0.012°'],
  ['Sun elevation', '1.884°', '1.882°', '+0.002°'],
  ['Earth azimuth', '228.316°', '228.314°', '+0.002°'],
  ['Earth elevation', '−4.345°', '−4.341°', '−0.004°'],
  ['Earth angular diameter', '6482.7″', '6490.5″', '−7.8″'],
]

const SOURCES = [
  {
    title: 'LOLA south-polar DEM (20 m)',
    detail: 'NASA/GSFC Lunar Orbiter Laser Altimeter; PDS Geosciences Node. Primary terrain source.',
    href: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/',
  },
  {
    title: 'LOLA 640 m custom grid',
    detail: 'Eight-times downsampled south-polar DEM for live custom pins. Screening resolution.',
    href: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/',
  },
  {
    title: 'NASA Artemis III candidate regions',
    detail: 'Nine south-pole regions announced 28 October 2024. Region names and context.',
    href: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/',
  },
  {
    title: 'Peña-Asensio et al. (2024)',
    detail: 'Artemis III landing-site evaluation with TOPSIS. Motivation for the decision layer.',
    href: 'https://arxiv.org/abs/2406.19863',
  },
  {
    title: 'JPL Horizons',
    detail: 'Independent ephemeris check for the Sun and Earth directions at Shackleton.',
    href: 'https://ssd.jpl.nasa.gov/horizons/',
  },
  {
    title: 'NASA SVS CGI Moon Kit',
    detail: 'LROC WAC color mosaic used as the 3D globe texture. Visual context only.',
    href: 'https://svs.gsfc.nasa.gov/4720',
  },
  {
    title: 'IAU WGCCRE 2009 lunar orientation',
    detail: 'Mean-Earth/polar-axis rotation model used to transform into the lunar body frame.',
    href: 'https://www.iau.org/static/publications/wgccre/',
  },
  {
    title: 'Meeus, Astronomical Algorithms',
    detail: 'Geocentric Sun and truncated ELP-2000/82 Moon positions used by the browser engine.',
    href: 'https://www.willbell.com/math/mc1.htm',
  },
]

function VisibilityDiagram() {
  return (
    <svg
      viewBox="0 0 640 230"
      className="w-full"
      role="img"
      aria-label="Diagram of the visibility rule: a body is visible when its center elevation plus angular radius exceeds the terrain horizon."
    >
      <defs>
        <linearGradient id="m-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--terrain)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--terrain)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect x="18" y="18" width="604" height="176" rx="10" fill="var(--background)" stroke="var(--border)" />
      {[40, 90, 140].map((y) => (
        <line key={y} x1="18" x2="622" y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 6" />
      ))}
      <path
        d="M18 176 C90 176 120 146 170 150 C225 155 245 118 300 124 C355 130 380 154 430 146 C490 136 540 158 622 158 L622 194 L18 194 Z"
        fill="url(#m-ground)"
      />
      <path
        d="M18 176 C90 176 120 146 170 150 C225 155 245 118 300 124 C355 130 380 154 430 146 C490 136 540 158 622 158"
        fill="none"
        stroke="var(--terrain)"
        strokeWidth="1.6"
      />
      <line x1="300" y1="124" x2="300" y2="62" stroke="var(--muted-foreground)" strokeDasharray="3 3" />
      <circle cx="300" cy="124" r="3.5" fill="var(--foreground)" />
      <text x="300" y="54" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
        site
      </text>

      <circle cx="300" cy="44" r="7" fill="var(--sun)" />
      <circle cx="300" cy="44" r="11" fill="none" stroke="var(--sun)" strokeDasharray="2 3" opacity="0.7" />
      <line x1="300" y1="44" x2="430" y2="44" stroke="var(--sun)" strokeDasharray="2 4" opacity="0.45" />
      <text x="438" y="42" fontSize="9" fill="var(--sun)" fontWeight="600">
        Sun
      </text>
      <text x="438" y="54" fontSize="8" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
        center + R &gt; horizon
      </text>

      <circle cx="520" cy="150" r="8" fill="var(--earth)" opacity="0.45" />
      <circle cx="520" cy="150" r="12" fill="none" stroke="var(--earth)" strokeDasharray="2 3" opacity="0.5" />
      <text x="520" y="178" textAnchor="middle" fontSize="9" fill="var(--earth)" fontWeight="600">
        Earth hidden
      </text>
      <text x="520" y="189" textAnchor="middle" fontSize="7.5" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
        upper limb below terrain
      </text>

      <text x="34" y="36" fontSize="8" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
        visible if el + angular radius &gt; horizon(az)
      </text>
      <text x="34" y="188" fontSize="7.5" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
        terrain horizon from 1,440 LOLA rays
      </text>
    </svg>
  )
}

export function MethodView({ onCompare }: { onCompare: () => void }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 sm:space-y-10">
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Method · Data · Limits
            </p>
            <h1 className="font-display mt-2 max-w-xl text-[32px] leading-[1.02] tracking-[-0.02em] text-balance sm:text-[44px]">
              How each number is calculated.
            </h1>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-pretty text-muted-foreground">
              SelenoGrid is a screening instrument, not a flight-certified landing
              analysis. The pipeline is deliberately simple: real terrain, standard
              ephemerides, an explicit visibility rule, and a decision model you can
              reweight.
            </p>
          </div>
          <Button size="sm" onClick={onCompare} className="shrink-0">
            Back to comparison
            <ArrowUpRight aria-hidden />
          </Button>
        </header>
      </Reveal>

      <Reveal>
        <section
          aria-label="The question"
          className="grid gap-3 rounded-2xl border border-border bg-card/55 p-5 shadow-[var(--shadow-card)] sm:grid-cols-[140px_1fr] sm:gap-5 sm:p-6"
        >
          <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase sm:pt-1">
            The question
          </p>
          <p className="max-w-prose text-[13px] leading-relaxed text-pretty text-foreground/85">
            For a chosen date and mission length, when are the Sun and Earth above
            each site&apos;s own terrain horizon? SelenoGrid turns those windows
            into four criteria and ranks the sites. It does not model power systems,
            thermal behavior, or communications link budgets.
          </p>
        </section>
      </Reveal>

      <section aria-label="Pipeline">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            01 · Pipeline
          </h2>
          <span className="hidden font-mono text-[9px] text-muted-foreground/70 sm:inline">
            Four moves, no black boxes
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal key={step.title} delay={i * 60}>
                <div className="h-full rounded-2xl border border-border bg-card/55 p-4 shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-foreground/20 motion-reduce:transition-none">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-8 items-center justify-center rounded-xl border border-border/70 bg-secondary/60">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="tabular font-mono text-[10px] text-muted-foreground">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[12.5px] font-semibold tracking-[-0.01em]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section aria-label="Visibility and metrics">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            02 · Visibility rule &amp; metrics
          </h2>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <div className="h-full rounded-2xl border border-border bg-card/55 p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center gap-2">
                <Sun className="size-4 text-sun" aria-hidden />
                <h3 className="text-[14px] font-semibold tracking-[-0.01em]">
                  The visibility rule
                </h3>
                <Badge variant="outline" className="font-mono">
                  upper limb
                </Badge>
              </div>
              <p className="mt-2 max-w-prose text-[11.5px] leading-relaxed text-muted-foreground">
                A body counts as visible when any part of its disk clears the local
                terrain horizon. This is deliberately inclusive for communication
                and conservative for power: a one-pixel solar sliver counts as
                sunlight, while the flux proxy still collapses toward zero.
              </p>
              <div className="mt-4 rounded-xl border border-border/60 bg-background/30 p-2">
                <VisibilityDiagram />
              </div>
              <div className="tabular mt-3 overflow-x-auto rounded-lg border border-border/70 bg-background/40 px-3 py-2 font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                visible(az, el) = el + asin(R_body / d) − horizon(az) &gt; 0
              </div>
              <details className="group mt-3 rounded-xl border border-dashed border-border px-3.5 py-2.5">
                <summary className="cursor-pointer list-none text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                  How the horizon is sampled
                  <span className="ml-2 font-mono text-[9px] text-muted-foreground group-open:hidden">
                    +
                  </span>
                  <span className="ml-2 hidden font-mono text-[9px] text-muted-foreground group-open:inline">
                    −
                  </span>
                </summary>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  1,440 azimuth bins at 0.25° steps, ray-marched to 220 km with exact
                  lunar curvature and bilinear DEM sampling. Scenario windows are
                  sampled at 1–6 h steps; event times are refined separately by
                  bisection.
                </p>
              </details>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="h-full rounded-2xl border border-border bg-card/55 p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-earth" aria-hidden />
                <h3 className="text-[14px] font-semibold tracking-[-0.01em]">
                  What we compute
                </h3>
              </div>
              <dl className="mt-2 divide-y divide-border/60">
                {METRICS.map(([name, body]) => (
                  <div key={name} className="py-2.5">
                    <dt className="text-[12px] font-medium">{name}</dt>
                    <dd className="mt-0.5 max-w-prose text-[10.5px] leading-relaxed text-muted-foreground">
                      {body}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <section
          aria-label="Decision layer"
          className="rounded-2xl border border-border bg-card/55 p-5 shadow-[var(--shadow-card)] sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Sigma className="size-4 text-terrain" aria-hidden />
            <h2 className="text-[14px] font-semibold tracking-[-0.01em]">
              Decision layer: TOPSIS + Pareto
            </h2>
            <Badge variant="terrain" className="font-mono">
              explainable MCDA
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-[11.5px] leading-relaxed text-muted-foreground">
            We use four criteria: sunlight %, Earth visibility %, mean solar flux,
            and local slope. The first three are benefits; slope is a cost. TOPSIS
            rewards similarity to the ideal point and distance from the anti-ideal.
            Scores are relative to the current comparison set.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['1 · normalise', 'rᵢⱼ = xᵢⱼ / √(Σ xᵢⱼ²)'],
              ['2 · weight', 'vᵢⱼ = wⱼ · rᵢⱼ'],
              ['3 · ideal points', 'A⁺ = max benefit, min cost'],
              ['4 · closeness', 'Cᵢ = Dᵢ⁻ / (Dᵢ⁺ + Dᵢ⁻)'],
            ].map(([title, formula]) => (
              <div
                key={title}
                className="rounded-xl border border-border/70 bg-background/35 p-3"
              >
                <p className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
                  {title}
                </p>
                <p className="tabular mt-1.5 font-mono text-[11.5px]">{formula}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-[10.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3.5" aria-hidden />
              Pareto frontier: sites not dominated on sunlight and Earth visibility
              simultaneously.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden />
              Weights normalised to 100%; presets are starting points, not
              recommendations.
            </span>
          </div>
        </section>
      </Reveal>

      <section aria-label="Validation and limits">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            03 · Trust &amp; limits
          </h2>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <div className="h-full rounded-2xl border border-border bg-card/55 p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em]">
                    Validation against JPL Horizons
                  </h3>
                </div>
                <Badge variant="success" className="font-mono">
                  Shackleton · ephemeris check
                </Badge>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase">
                      <th scope="col" className="py-2 pr-2 font-medium">
                        Quantity
                      </th>
                      <th scope="col" className="py-2 pr-2 text-right font-medium">
                        SelenoGrid
                      </th>
                      <th scope="col" className="py-2 pr-2 text-right font-medium">
                        Horizons
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Δ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {VALIDATION.map(([name, ours, ref, delta]) => (
                      <tr key={name} className="border-b border-border/50 last:border-0">
                        <th scope="row" className="py-2 pr-2 font-normal">
                          {name}
                        </th>
                        <td className="tabular py-2 pr-2 text-right font-mono">{ours}</td>
                        <td className="tabular py-2 pr-2 text-right font-mono text-muted-foreground">
                          {ref}
                        </td>
                        <td className="py-2 text-right">
                          <span className="tabular inline-block rounded-full bg-[var(--success-soft)] px-2 py-0.5 font-mono text-[10px] text-success">
                            {delta}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2.5 max-w-prose text-[10px] leading-relaxed text-muted-foreground">
                Directions agree to ~0.02°, well inside the terrain and DEM error
                budget. The Earth diameter difference is dominated by the adopted
                Earth radius and lunar distance, not pointing.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="h-full rounded-2xl border border-border bg-card/55 p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-sun" aria-hidden />
                <h3 className="text-[14px] font-semibold tracking-[-0.01em]">
                  Limits we will not hide
                </h3>
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                {[
                  'Representative points, not official landing ellipses or hazard maps.',
                  'No thermal, power-system, delta-v, communications link-budget or human-factors model.',
                  'Hard shadows and an airless Moon; no terrain reflectance or secondary scattering.',
                  'The 20 m DEM limits sub-resolution slopes and small boulders.',
                  'Custom pins are sampled from a 640 m browser grid; they are fast screening points, not 20 m analyses.',
                  'Sunlight percentage counts any visible solar limb; use the flux proxy for power intuition.',
                  'Earth–Sun radio interference and ground-station scheduling are not modelled.',
                  'The terrain horizon is marched to 220 km; distant massifs beyond that are not included.',
                  'Scenario windows are sampled (1/3/6 h); event times are refined separately.',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/60"
                    />
                    <span className="max-w-prose">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <section
          aria-label="Data and sources"
          className="rounded-2xl border border-border bg-card/55 p-5 shadow-[var(--shadow-card)] sm:p-6"
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-earth" aria-hidden />
              <h2 className="text-[14px] font-semibold tracking-[-0.01em]">
                Data &amp; sources
              </h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={`${import.meta.env.BASE_URL}data/sites.json`} download>
                Download site data
              </a>
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((source) => (
              <a
                key={source.title}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-border/70 bg-background/30 p-3.5 transition-colors duration-150 outline-none hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11.5px] font-medium tracking-[-0.01em]">
                    {source.title}
                  </span>
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                    aria-hidden
                  />
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  {source.detail}
                </p>
              </a>
            ))}
          </div>
          <div className="tabular mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-3 font-mono text-[9px] tracking-wide text-muted-foreground">
            <span>LOLA 20 m DEM · PDS Geosciences</span>
            <span>IAU 2009 lunar orientation</span>
            <span>Meeus ch. 25 / 47</span>
            <span>TOPSIS after Hwang &amp; Yoon</span>
            <span>Peña-Asensio et al. 2024</span>
            <span>NASA SVS CGI Moon Kit</span>
          </div>
        </section>
      </Reveal>

      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
        <strong className="font-medium text-foreground/80">
          Not affiliated with NASA.
        </strong>{' '}
        NASA candidate region names are used for context. All site coordinates are
        representative points selected from LOLA topography for comparison. NASA has
        not published official region centres or landing ellipses. This tool is not
        a flight-certified analysis and must not be used for actual mission planning.
      </p>
    </div>
  )
}
