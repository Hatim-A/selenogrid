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
          <stop offset="0%" stopColor="var(--earth)" stopOpacity="0.03" />
          <stop offset="100%" stopColor="var(--earth)" stopOpacity="0.07" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={R + 10} fill="var(--background)" opacity="0.4" />
      <circle cx={C} cy={C} r={R} fill="var(--muted)" opacity="0.75" />
      <g clipPath={`url(#skyclip-${site.id})`}>
        <circle cx={C} cy={C} r={R} fill={`url(#skygrad-${site.id})`} />

        {rings.map((el) => (
          <g key={el}>
            <circle
              cx={C}
              cy={C}
              r={rFor(el)}
              fill="none"
              stroke="var(--border)"
              strokeDasharray={el === 0 ? '3 4' : '2 5'}
            />
            {el > 0 && el < 30 && (
              <text
                x={xy(322, rFor(el)).x}
                y={xy(322, rFor(el)).y}
                fontSize="7.5"
                fill="var(--muted-foreground)"
                fontFamily="var(--font-mono)"
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
              stroke="var(--border)"
              strokeDasharray="2 6"
            />
          )
        })}

        <path d={horizonPath} fill="var(--background)" />
        <path
          d={horizonPath}
          fill="none"
          stroke={site.color}
          strokeWidth="1.5"
          strokeOpacity="0.9"
        />

        {/* Angular tracks over the scenario window */}
        <path
          d={track('sunAz', 'sunAz', 'sunEl')}
          fill="none"
          stroke="var(--sun)"
          strokeWidth="1.1"
          strokeOpacity="0.38"
        />
        <path
          d={track('earthAz', 'earthAz', 'earthEl')}
          fill="none"
          stroke="var(--earth)"
          strokeWidth="1.1"
          strokeOpacity="0.36"
        />

        <g opacity={sample.sunVisible ? 1 : 0.42}>
          <circle cx={sunPos.x} cy={sunPos.y} r="9" fill="var(--sun)" opacity="0.16" />
          <circle
            cx={sunPos.x}
            cy={sunPos.y}
            r="4.2"
            fill="var(--sun)"
            stroke={sample.sunVisible ? 'none' : 'var(--background)'}
            strokeDasharray={sample.sunVisible ? undefined : '1.5 1.5'}
            strokeWidth="1"
          />
        </g>
        <g opacity={sample.earthVisible ? 1 : 0.45}>
          <circle
            cx={earthPos.x}
            cy={earthPos.y}
            r="5.4"
            fill="none"
            stroke="var(--earth)"
            strokeWidth="0.9"
            strokeDasharray={sample.earthVisible ? undefined : '1.5 1.5'}
          />
          <circle cx={earthPos.x} cy={earthPos.y} r="2.8" fill="var(--earth)" />
        </g>
      </g>

      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border)" />

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
            fontFamily="var(--font-mono)"
          >
            {label}
          </text>
        )
      })}

      <g fontFamily="var(--font-mono)" fontSize="7.5" fill="var(--muted-foreground)">
        <circle cx={16} cy={SIZE - 22} r="2.5" fill="var(--sun)" />
        <text x={23} y={SIZE - 19.5}>
          Sun track · {metrics.days.length} d
        </text>
        <circle cx={126} cy={SIZE - 22} r="2.5" fill="var(--earth)" />
        <text x={133} y={SIZE - 19.5}>
          Earth track
        </text>
      </g>
    </svg>
  )
}
