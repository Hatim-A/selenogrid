import type { Site, SiteMetrics, SiteSample } from '@/types'

interface Props {
  site: Site
  metrics: SiteMetrics
  sample: SiteSample
}

const SIZE = 340
const C = SIZE / 2
const R = 138
const EL_MIN = -8
const EL_MAX = 28

function rFor(el: number) {
  const clamped = Math.max(EL_MIN, Math.min(EL_MAX, el))
  return ((EL_MAX - clamped) / (EL_MAX - EL_MIN)) * R
}

function xy(az: number, r: number) {
  const a = (az * Math.PI) / 180
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) }
}

export function SkyPlot({ site, metrics, sample }: Props) {
  const horizonPts = site.horizonDeg
    .filter((_, i) => i % 8 === 0)
    .map((el, i) => {
      const p = xy(i * 2, rFor(el))
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
  const horizonPath = `M${horizonPts.join(' L')} Z`

  const step = Math.max(1, Math.floor(metrics.samples.length / 140))
  const track = (key: 'sunAz' | 'sunEl' | 'earthAz' | 'earthEl', azKey: 'sunAz' | 'earthAz', elKey: 'sunEl' | 'earthEl') => {
    const parts: string[] = []
    for (let i = 0; i < metrics.samples.length; i += step) {
      const s = metrics.samples[i]
      const p = xy(s[azKey], rFor(s[elKey]))
      parts.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    }
    // ensure current sample is included
    const p = xy(sample[azKey], rFor(sample[elKey]))
    parts.push(`L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    void key
    return parts.join(' ')
  }

  const sunPos = xy(sample.sunAz, rFor(sample.sunEl))
  const earthPos = xy(sample.earthAz, rFor(sample.earthEl))

  const rings = [0, 10, 20, 30]

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block w-full"
      role="img"
      aria-label={`Polar sky plot for ${site.name}. Sun elevation ${sample.sunEl.toFixed(
        1,
      )} degrees, Earth elevation ${sample.earthEl.toFixed(1)} degrees.`}
    >
      <defs>
        <clipPath id={`skyclip-${site.id}`}>
          <circle cx={C} cy={C} r={R} />
        </clipPath>
        <radialGradient id={`skygrad-${site.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--earth)" stopOpacity="0.04" />
          <stop offset="70%" stopColor="var(--earth)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--earth)" stopOpacity="0.1" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={R + 10} fill="var(--background)" opacity="0.4" />
      <circle cx={C} cy={C} r={R} fill="var(--muted)" opacity="0.7" />
      <g clipPath={`url(#skyclip-${site.id})`}>
        <circle cx={C} cy={C} r={R} fill={`url(#skygrad-${site.id})`} />

        {rings.map((el) => (
          <g key={el}>
            <circle
              cx={C}
              cy={C}
              r={rFor(el)}
              fill="none"
              stroke={el === 0 ? 'var(--border)' : 'var(--grid-line)'}
              strokeWidth={el === 0 ? 1.1 : 1}
              strokeDasharray={el === 0 ? '4 3' : '1 4'}
            />
            {el >= 0 && el <= 20 && (
              <text
                x={xy(322, rFor(el)).x}
                y={xy(322, rFor(el)).y}
                fontSize="8.5"
                fill="var(--muted-foreground)"
                fillOpacity="0.9"
                fontFamily="var(--font-mono)"
                style={{ letterSpacing: '0.06em' }}
              >
                {el}°
              </text>
            )}
          </g>
        ))}

        {[0, 90, 180, 270].map((az) => {
          const a = xy(az, R)
          return (
            <line
              key={az}
              x1={C}
              y1={C}
              x2={a.x}
              y2={a.y}
              stroke="var(--grid-line)"
              strokeWidth="1"
              strokeDasharray="1 5"
            />
          )
        })}

        <path d={horizonPath} fill="var(--background)" opacity="0.92" />
        <path
          d={horizonPath}
          fill="none"
          stroke={site.color}
          strokeWidth="3"
          strokeOpacity="0.14"
          strokeLinejoin="round"
        />
        <path
          d={horizonPath}
          fill="none"
          stroke={site.color}
          strokeWidth="1.4"
          strokeOpacity="0.9"
          strokeLinejoin="round"
        />

        {/* Angular tracks over the scenario window */}
        <path
          d={track('sunAz', 'sunAz', 'sunEl')}
          fill="none"
          stroke="var(--sun)"
          strokeWidth="1.2"
          strokeOpacity="0.48"
          strokeLinecap="round"
        />
        <path
          d={track('earthAz', 'earthAz', 'earthEl')}
          fill="none"
          stroke="var(--earth)"
          strokeWidth="1.2"
          strokeOpacity="0.44"
          strokeLinecap="round"
        />

        <g opacity={sample.sunVisible ? 1 : 0.42}>
          <circle cx={sunPos.x} cy={sunPos.y} r="10" fill="var(--sun)" opacity="0.14" />
          <circle cx={sunPos.x} cy={sunPos.y} r="6" fill="var(--sun)" opacity="0.22" />
          <circle
            cx={sunPos.x}
            cy={sunPos.y}
            r="4.2"
            fill="var(--sun)"
            stroke={sample.sunVisible ? 'var(--sun)' : 'var(--background)'}
            strokeDasharray={sample.sunVisible ? undefined : '1.5 1.5'}
            strokeWidth="1"
          />
        </g>
        <g opacity={sample.earthVisible ? 1 : 0.45}>
          <circle cx={earthPos.x} cy={earthPos.y} r="8" fill="var(--earth)" opacity="0.12" />
          <circle
            cx={earthPos.x}
            cy={earthPos.y}
            r="5.4"
            fill="none"
            stroke="var(--earth)"
            strokeWidth="0.9"
            strokeOpacity="0.85"
            strokeDasharray={sample.earthVisible ? undefined : '1.5 1.5'}
          />
          <circle cx={earthPos.x} cy={earthPos.y} r="2.8" fill="var(--earth)" />
        </g>
      </g>

      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border)" strokeOpacity="0.8" />
      {/* observatory tick ring */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = i * 15
        const p0 = xy(a, R + 4)
        const p1 = xy(a, R + (i % 6 === 0 ? 9 : 7))
        return (
          <line
            key={a}
            x1={p0.x}
            y1={p0.y}
            x2={p1.x}
            y2={p1.y}
            stroke="var(--muted-foreground)"
            strokeOpacity={i % 6 === 0 ? 0.55 : 0.3}
            strokeWidth="1"
          />
        )
      })}

      {[
        ['N', 0],
        ['E', 90],
        ['S', 180],
        ['W', 270],
      ].map(([label, az]) => {
        const p = xy(az as number, R + 22)
        return (
          <text
            key={label as string}
            x={p.x}
            y={p.y + 3}
            textAnchor="middle"
            fontSize="9"
            fill="var(--muted-foreground)"
            fillOpacity="0.85"
            fontFamily="var(--font-mono)"
            style={{ letterSpacing: '0.16em' }}
          >
            {label}
          </text>
        )
      })}

      <line
        x1={16}
        y1={SIZE - 34}
        x2={SIZE - 16}
        y2={SIZE - 34}
        stroke="var(--border)"
        strokeOpacity="0.7"
      />
      <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--muted-foreground)">
        <circle cx={18} cy={SIZE - 19} r="2.5" fill="var(--sun)" />
        <text x={25} y={SIZE - 16} fill="var(--foreground)" style={{ letterSpacing: '0.04em' }}>
          SUN {sample.sunEl >= 0 ? '+' : '−'}
          {Math.abs(sample.sunEl).toFixed(1)}°
        </text>
        <circle cx={118} cy={SIZE - 19} r="2.5" fill="var(--earth)" />
        <text x={125} y={SIZE - 16} fill="var(--foreground)" style={{ letterSpacing: '0.04em' }}>
          EARTH {sample.earthEl >= 0 ? '+' : '−'}
          {Math.abs(sample.earthEl).toFixed(1)}°
        </text>
        <text x={SIZE - 16} y={SIZE - 16} textAnchor="end" style={{ letterSpacing: '0.08em' }}>
          {metrics.days.length} D WINDOW
        </text>
      </g>
    </svg>
  )
}
