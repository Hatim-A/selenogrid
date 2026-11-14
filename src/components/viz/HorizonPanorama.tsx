import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

interface Props {
  site: Site
  sunAz: number
  sunEl: number
  earthAz: number
  earthEl: number
  sunVisible?: boolean
  earthVisible?: boolean
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

export function HorizonPanorama({
  site,
  sunAz,
  sunEl,
  earthAz,
  earthEl,
  sunVisible = true,
  earthVisible = true,
  className,
  timeLabel,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const groundId = `ground-${uid}`
  const skyId = `sky-${uid}`

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
          <stop offset="0%" stopColor={site.color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={site.color} stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--earth)" stopOpacity="0.035" />
          <stop offset="100%" stopColor="var(--earth)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect
        x={PAD.l}
        y={PAD.t}
        width={PLOT_W}
        height={PLOT_H}
        rx="6"
        fill="var(--background)"
      />
      <rect x={PAD.l} y={PAD.t} width={PLOT_W} height={PLOT_H} rx="6" fill={`url(#${skyId})`} />

      {[0, 10, 20].map((el) => (
        <g key={el}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yFor(el)}
            y2={yFor(el)}
            stroke="var(--border)"
            strokeDasharray={el === 0 ? '3 4' : '2 6'}
          />
          <text
            x={PAD.l - 5}
            y={yFor(el) + 3}
            textAnchor="end"
            fontSize="8"
            fill="var(--muted-foreground)"
            fontFamily="var(--font-mono)"
          >
            {el}°
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${groundId})`} />
      <path d={line} fill="none" stroke={site.color} strokeOpacity="0.9" strokeWidth="1.4" />

      {/* Sun marker */}
      <g opacity={sunVisible ? 1 : 0.4}>
        <circle cx={sunX} cy={sunY} r="11" fill="var(--sun)" opacity="0.13" />
        <circle
          cx={sunX}
          cy={sunY}
          r="4.6"
          fill="var(--sun)"
          stroke={sunVisible ? 'none' : 'var(--background)'}
          strokeWidth="1"
          strokeDasharray={sunVisible ? undefined : '1.5 1.5'}
        />
        <text
          x={sunX}
          y={Math.max(10, sunY - 9)}
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fill="var(--sun)"
          style={{ letterSpacing: '0.04em' }}
        >
          SUN
        </text>
      </g>

      {/* Earth marker */}
      <g opacity={earthVisible ? 1 : 0.4}>
        <circle
          cx={earthX}
          cy={earthY}
          r="5.5"
          fill="none"
          stroke="var(--earth)"
          strokeWidth="0.8"
          strokeDasharray={earthVisible ? undefined : '1.5 1.5'}
        />
        <circle cx={earthX} cy={earthY} r="3" fill="var(--earth)" />
        <text
          x={earthX}
          y={Math.min(H - PAD.b - 6, earthY + 14)}
          textAnchor="middle"
          fontSize="8"
          fontWeight="600"
          fill="var(--earth)"
          style={{ letterSpacing: '0.04em' }}
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
          fontSize="8.5"
          fill="var(--muted-foreground)"
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      ))}

      {timeLabel && (
        <text
          x={W - PAD.r - 4}
          y={PAD.t + 11}
          textAnchor="end"
          fontSize="8.5"
          fill="var(--muted-foreground)"
          fontFamily="var(--font-mono)"
        >
          {timeLabel}
        </text>
      )}
    </svg>
  )
}
