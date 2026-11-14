import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Site, SiteSample } from '@/types'

interface Props {
  site: Site
  sunAz: number
  sunEl: number
  earthAz: number
  earthEl: number
  sunVisible?: boolean
  earthVisible?: boolean
  samples?: SiteSample[]
  interactive?: boolean
  className?: string
  timeLabel?: string
}

const W = 720
const H = 196
const PAD = { l: 32, r: 10, t: 14, b: 20 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b
const EL_MIN = -8
const EL_MAX = 26

function xFor(az: number) {
  const a = ((az % 360) + 360) % 360
  return PAD.l + (a / 360) * PLOT_W
}
function yFor(el: number) {
  const clamped = Math.max(EL_MIN, Math.min(EL_MAX, el))
  return PAD.t + ((EL_MAX - clamped) / (EL_MAX - EL_MIN)) * PLOT_H
}

function trackPath(
  samples: SiteSample[] | undefined,
  azKey: 'sunAz' | 'earthAz',
  elKey: 'sunEl' | 'earthEl',
): string {
  if (!samples?.length) return ''
  const step = Math.max(1, Math.floor(samples.length / 120))
  const parts: string[] = []
  let previousAz: number | null = null
  for (let i = 0; i < samples.length; i += step) {
    const sample = samples[i]
    const az = sample[azKey]
    const x = xFor(az)
    const y = yFor(sample[elKey])
    const wrapped = previousAz === null || Math.abs(az - previousAz) > 180
    parts.push(`${wrapped ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    previousAz = az
  }
  return parts.join(' ')
}

export function HorizonPanorama({
  site,
  sunAz,
  sunEl,
  earthAz,
  earthEl,
  sunVisible = true,
  earthVisible = true,
  samples,
  interactive = true,
  className,
  timeLabel,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const groundId = `ground-${uid}`
  const skyId = `sky-${uid}`
  const [hover, setHover] = useState<{ az: number; horizon: number; distKm: number } | null>(null)

  const horizon = site.horizonDeg
  const pts: string[] = []
  for (let i = 0; i < 1440; i += 2) {
    const az = i * 0.25
    pts.push(`${xFor(az).toFixed(1)},${yFor(horizon[i]).toFixed(1)}`)
  }
  // close the seam with the 360° value
  pts.push(`${xFor(360).toFixed(1)},${yFor(horizon[0]).toFixed(1)}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L${(W - PAD.r).toFixed(1)},${(H - PAD.b).toFixed(1)} L${PAD.l},${(H - PAD.b).toFixed(1)} Z`

  const sunX = xFor(sunAz)
  const sunY = yFor(sunEl)
  const earthX = xFor(earthAz)
  const earthY = yFor(earthEl)
  const sunTrack = trackPath(samples, 'sunAz', 'sunEl')
  const earthTrack = trackPath(samples, 'earthAz', 'earthEl')
  const hoverX = hover ? xFor(hover.az) : 0
  const hoverY = hover ? yFor(hover.horizon) : 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn('block w-full', className)}
      role="img"
      aria-label={`Terrain horizon at ${site.name}. Sun at ${sunEl.toFixed(1)} degrees elevation, ${
        sunVisible ? 'above' : 'below'
      } the horizon. Earth at ${earthEl.toFixed(1)} degrees, ${
        earthVisible ? 'above' : 'below'
      } the horizon.`}
    >
      <defs>
        <linearGradient id={groundId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={site.color} stopOpacity="0.32" />
          <stop offset="45%" stopColor={site.color} stopOpacity="0.1" />
          <stop offset="100%" stopColor={site.color} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--earth)" stopOpacity="0.1" />
          <stop offset="55%" stopColor="var(--earth)" stopOpacity="0.025" />
          <stop offset="100%" stopColor="var(--sun)" stopOpacity="0.07" />
        </linearGradient>
      </defs>

      <rect
        x={PAD.l}
        y={PAD.t}
        width={PLOT_W}
        height={PLOT_H}
        rx="8"
        fill="var(--background)"
      />
      <rect x={PAD.l} y={PAD.t} width={PLOT_W} height={PLOT_H} rx="8" fill={`url(#${skyId})`} />
      <rect
        x={PAD.l}
        y={PAD.t}
        width={PLOT_W}
        height={PLOT_H}
        rx="8"
        fill="none"
        stroke="var(--border)"
        strokeOpacity="0.55"
      />

      {[0, 10, 20].map((el) => (
        <g key={el}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yFor(el)}
            y2={yFor(el)}
            stroke="var(--grid-line)"
            strokeWidth={el === 0 ? 1.1 : 1}
            strokeDasharray={el === 0 ? '4 3' : '1 4'}
          />
          <text
            x={PAD.l - 5}
            y={yFor(el) + 3}
            textAnchor="end"
            fontSize="7.5"
            fill="var(--muted-foreground)"
            fillOpacity="0.85"
            fontFamily="var(--font-mono)"
            style={{ letterSpacing: '0.06em' }}
          >
            {el}°
          </text>
        </g>
      ))}

      {sunTrack && (
        <path
          d={sunTrack}
          fill="none"
          stroke="var(--sun)"
          strokeWidth="1.2"
          strokeOpacity="0.42"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      )}
      {earthTrack && (
        <path
          d={earthTrack}
          fill="none"
          stroke="var(--earth)"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      )}

      <path d={area} fill={`url(#${groundId})`} />
      {/* soft underglow for the ridgeline */}
      <path d={line} fill="none" stroke={site.color} strokeOpacity="0.16" strokeWidth="4" strokeLinejoin="round" />
      <path d={line} fill="none" stroke={site.color} strokeOpacity="0.9" strokeWidth="1.4" strokeLinejoin="round" />

      {interactive && (
        <rect
          x={PAD.l}
          y={PAD.t}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
            const az = fraction * 360
            const bin = Math.round((az / 360) * 1440) % 1440
            setHover({
              az: bin * 0.25,
              horizon: horizon[bin],
              distKm: site.horizonDistKm?.[bin] ?? 0,
            })
          }}
          onPointerLeave={() => setHover(null)}
        />
      )}

      {hover && (
        <g pointerEvents="none">
          <line
            x1={hoverX}
            x2={hoverX}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke="var(--foreground)"
            strokeOpacity="0.28"
            strokeDasharray="2 3"
          />
          <circle
            cx={hoverX}
            cy={hoverY}
            r="3"
            fill="var(--foreground)"
            stroke="var(--background)"
            strokeWidth="1.2"
          />
          <rect
            x={PAD.l + 4}
            y={PAD.t + 3}
            width="268"
            height="20"
            rx="6"
            fill="var(--card)"
            fillOpacity="0.94"
            stroke="var(--border)"
          />
          <text
            x={PAD.l + 12}
            y={PAD.t + 16}
            fontSize="8.5"
            fill="var(--foreground)"
            fontFamily="var(--font-mono)"
            style={{ letterSpacing: '0.04em' }}
          >
            AZ {hover.az.toFixed(1)}° · RIDGE {signed(hover.horizon)}° ·{' '}
            {hover.distKm > 0 ? `${hover.distKm.toFixed(1)} KM` : 'LOCAL TERRAIN'}
          </text>
        </g>
      )}

      {/* Sun marker */}
      <g opacity={sunVisible ? 1 : 0.4} pointerEvents="none">
        <circle cx={sunX} cy={sunY} r="13" fill="var(--sun)" opacity="0.1" />
        <circle cx={sunX} cy={sunY} r="7.5" fill="var(--sun)" opacity="0.22" />
        <circle
          cx={sunX}
          cy={sunY}
          r="4.6"
          fill="var(--sun)"
          stroke={sunVisible ? 'var(--sun)' : 'var(--background)'}
          strokeWidth="1"
          strokeDasharray={sunVisible ? undefined : '1.5 1.5'}
        />
        <circle cx={sunX} cy={sunY} r="4.6" fill="none" stroke="var(--background)" strokeOpacity="0.35" strokeWidth="0.6" />
        <text
          x={sunX}
          y={Math.max(10, sunY - 11)}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="600"
          fill="var(--sun)"
          fontFamily="var(--font-mono)"
          style={{ letterSpacing: '0.14em' }}
        >
          SUN
        </text>
      </g>

      {/* Earth marker */}
      <g opacity={earthVisible ? 1 : 0.4} pointerEvents="none">
        <circle cx={earthX} cy={earthY} r="9" fill="var(--earth)" opacity="0.12" />
        <circle
          cx={earthX}
          cy={earthY}
          r="5.5"
          fill="none"
          stroke="var(--earth)"
          strokeWidth="0.9"
          strokeOpacity="0.8"
          strokeDasharray={earthVisible ? undefined : '1.5 1.5'}
        />
        <circle cx={earthX} cy={earthY} r="3" fill="var(--earth)" />
        <text
          x={earthX}
          y={Math.min(H - PAD.b - 6, earthY + 15)}
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="600"
          fill="var(--earth)"
          fontFamily="var(--font-mono)"
          style={{ letterSpacing: '0.14em' }}
        >
          EARTH
        </text>
      </g>

      {[
        ['N', 0],
        ['E', 90],
        ['S', 180],
        ['W', 270],
      ].map(([label, az]) => (
        <text
          key={label as string}
          x={xFor(az as number)}
          y={H - 5}
          textAnchor="middle"
          fontSize="8"
          fill="var(--muted-foreground)"
          fillOpacity="0.8"
          fontFamily="var(--font-mono)"
          style={{ letterSpacing: '0.14em' }}
        >
          {label}
        </text>
      ))}

      {timeLabel && (
        <text
          x={W - PAD.r - 6}
          y={PAD.t + 12}
          textAnchor="end"
          fontSize="8"
          fill="var(--muted-foreground)"
          fontFamily="var(--font-mono)"
          style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          {timeLabel}
        </text>
      )}
    </svg>
  )
}

function signed(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
}
