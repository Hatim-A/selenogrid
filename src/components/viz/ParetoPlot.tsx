import { useMemo, useState } from 'react'
import { fmtPct } from '@/lib/format'
import type { ParetoPoint } from '@/types'

const W = 640
const H = 360
const PAD = { l: 48, r: 24, t: 24, b: 48 }
const PW = W - PAD.l - PAD.r
const PH = H - PAD.t - PAD.b

export function ParetoPlot({
  points,
  highlightId,
  onSelect,
}: {
  points: ParetoPoint[]
  highlightId?: string
  onSelect: (id: string) => void
}) {
  const [hover, setHover] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)

  const { xMin, xMax, yMin, yMax, ticks } = useMemo(() => {
    if (points.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100, ticks: [0, 25, 50, 75, 100] }
    }
    const xs = points.map((p) => p.metrics.sunlightPct)
    const ys = points.map((p) => p.metrics.earthPct)
    const x0 = Math.max(0, Math.floor((Math.min(...xs) - 4) / 10) * 10)
    const x1 = Math.min(100, Math.ceil((Math.max(...xs) + 4) / 10) * 10)
    const y0 = Math.max(0, Math.floor((Math.min(...ys) - 5) / 10) * 10)
    const y1 = Math.min(100, Math.ceil((Math.max(...ys) + 5) / 10) * 10)
    const tick = (a: number, b: number) => {
      const out: number[] = []
      const span = b - a
      for (let i = 0; i <= 4; i++) out.push(Math.round((a + (span * i) / 4) / 5) * 5)
      return Array.from(new Set(out))
    }
    return {
      xMin: x0,
      xMax: x1 === x0 ? x0 + 10 : x1,
      yMin: y0,
      yMax: y1 === y0 ? y0 + 10 : y1,
      ticks: tick(y0, y1),
    }
  }, [points])

  const x = (v: number) => PAD.l + ((v - xMin) / (xMax - xMin)) * PW
  const y = (v: number) => PAD.t + PH - ((v - yMin) / (yMax - yMin)) * PH

  const frontier = points
    .filter((p) => p.onFrontier)
    .sort((a, b) => a.metrics.sunlightPct - b.metrics.sunlightPct)
  const frontierPath = frontier
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.metrics.sunlightPct)},${y(p.metrics.earthPct)}`)
    .join(' ')

  const activeId = hover ?? focus
  const hovered = points.find((p) => p.site.id === activeId)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="group"
        aria-label="Pareto frontier of sunlight versus Earth visibility. Select a site to open its analysis."
      >
        <defs>
          <linearGradient id="pareto-fade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--sun)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="var(--earth)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="pareto-frontier-stroke" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--sun)" />
            <stop offset="100%" stopColor="var(--earth)" />
          </linearGradient>
        </defs>
        <rect
          x={PAD.l}
          y={PAD.t}
          width={PW}
          height={PH}
          rx="10"
          fill="url(#pareto-fade)"
          stroke="var(--border)"
        />

        {ticks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={PAD.l}
              x2={PAD.l + PW}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="11"
              fill="var(--muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              {t}%
            </text>
          </g>
        ))}

        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = Math.round((xMin + (xMax - xMin) * f) / 5) * 5
          return (
            <g key={`x${f}`}>
              <line
                x1={x(v)}
                x2={x(v)}
                y1={PAD.t}
                y2={PAD.t + PH}
                stroke="var(--border)"
                strokeOpacity="0.6"
                strokeWidth="1"
              />
              <text
                x={x(v)}
                y={H - PAD.b + 19}
                textAnchor="middle"
                fontSize="11"
                fill="var(--muted-foreground)"
                fontFamily="var(--font-mono)"
              >
                {v}%
              </text>
            </g>
          )
        })}

        {frontier.length > 1 && (
          <g fill="none" strokeLinecap="round">
            <path
              d={frontierPath}
              stroke="url(#pareto-frontier-stroke)"
              strokeOpacity="0.28"
              strokeWidth="5"
            />
            <path
              d={frontierPath}
              stroke="url(#pareto-frontier-stroke)"
              strokeOpacity="0.85"
              strokeWidth="1.6"
            />
          </g>
        )}

        {points.map((p) => {
          const active = p.site.id === highlightId
          const lit = p.site.id === activeId
          const showLabel = active || p.onFrontier
          return (
            <g
              key={p.site.id}
              onMouseEnter={() => setHover(p.site.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setFocus(p.site.id)}
              onBlur={() => setFocus(null)}
              onClick={() => onSelect(p.site.id)}
              className="cursor-pointer outline-none [&:focus-visible_.focus-ring]:opacity-100"
              tabIndex={0}
              role="button"
              aria-label={`${p.site.name}: ${fmtPct(p.metrics.sunlightPct)} sunlight, ${fmtPct(
                p.metrics.earthPct,
              )} Earth visibility${p.onFrontier ? ', on the frontier' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(p.site.id)
                }
              }}
            >
              <circle
                cx={x(p.metrics.sunlightPct)}
                cy={y(p.metrics.earthPct)}
                r={p.onFrontier || active ? 14 : 11}
                fill="transparent"
              />
              <circle
                className="focus-ring"
                cx={x(p.metrics.sunlightPct)}
                cy={y(p.metrics.earthPct)}
                r={12.5}
                fill="none"
                stroke="var(--ring)"
                strokeWidth="1.6"
                opacity="0"
              />
              {active && (
                <circle
                  cx={x(p.metrics.sunlightPct)}
                  cy={y(p.metrics.earthPct)}
                  r={11.5}
                  fill={p.site.color}
                  opacity="0.16"
                />
              )}
              {p.onFrontier && (
                <circle
                  cx={x(p.metrics.sunlightPct)}
                  cy={y(p.metrics.earthPct)}
                  r={active ? 9.5 : 8.5}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={active ? 0.7 : 0.4}
                  strokeWidth={active ? 1.5 : 1.1}
                />
              )}
              <circle
                cx={x(p.metrics.sunlightPct)}
                cy={y(p.metrics.earthPct)}
                r={active || lit ? 6 : 5}
                fill={p.site.color}
                stroke="var(--card)"
                strokeWidth="2"
                style={{ transition: 'r 180ms ease' }}
              />
              {showLabel && (
                <text
                  x={x(p.metrics.sunlightPct)}
                  y={y(p.metrics.earthPct) - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={active ? 650 : 500}
                  fill={active ? 'var(--foreground)' : 'var(--muted-foreground)'}
                >
                  {p.site.shortName}
                </text>
              )}
            </g>
          )
        })}

        <text
          x={PAD.l + PW / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize="12"
          fill="var(--muted-foreground)"
          letterSpacing="0.02em"
        >
          Sun visible over mission window (%)
        </text>
        <text
          transform={`translate(16 ${PAD.t + PH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="12"
          fill="var(--muted-foreground)"
          letterSpacing="0.02em"
        >
          Earth visible (%)
        </text>

        {hovered && (
          <g pointerEvents="none">
            <rect
              x={Math.min(
                x(hovered.metrics.sunlightPct) + 12,
                PAD.l + PW - 158,
              )}
              y={Math.max(4, y(hovered.metrics.earthPct) - 56)}
              width="152"
              height="48"
              rx="8"
              fill="var(--popover)"
              stroke="var(--border)"
            />
            <text
              x={
                Math.min(x(hovered.metrics.sunlightPct) + 22, PAD.l + PW - 148)
              }
              y={Math.max(4, y(hovered.metrics.earthPct) - 56) + 18}
              fontSize="10"
              fontWeight="600"
              fill="var(--popover-foreground)"
            >
              {hovered.site.shortName}
              {hovered.onFrontier ? ' · ringed' : ''}
            </text>
            <text
              x={
                Math.min(x(hovered.metrics.sunlightPct) + 22, PAD.l + PW - 148)
              }
              y={Math.max(4, y(hovered.metrics.earthPct) - 56) + 33}
              fontSize="9"
              fill="var(--muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              Sun {fmtPct(hovered.metrics.sunlightPct)} · Earth{' '}
              {fmtPct(hovered.metrics.earthPct)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
