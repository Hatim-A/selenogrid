import { useEffect, useRef, useState } from 'react'
import { fmtDayUtc, fmtHours } from '@/lib/format'
import type { Site, SiteMetrics } from '@/types'

interface Props {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  days: number
  startMs: number
  cursorHour: number
  selectedId: string
  onSelect: (id: string) => void
  onCursor: (hour: number) => void
  theme: 'light' | 'dark'
}

const LABEL_W = 132
const RIGHT_PAD = 14
const TOP = 26
const ROW_H = 34
const LANE_H = 10
const BOTTOM = 18

interface Hover {
  site: Site
  day: number
  x: number
  y: number
}

export function TimelineHeatmap({
  sites,
  metricsById,
  days,
  startMs,
  cursorHour,
  selectedId,
  onSelect,
  onCursor,
  theme,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(900)
  const [hover, setHover] = useState<Hover | null>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const height = TOP + sites.length * ROW_H + BOTTOM
  const plotW = Math.max(120, width - LABEL_W - RIGHT_PAD)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const computed = getComputedStyle(canvas)
    const colorMap = {
      sun: computed.getPropertyValue('--sun').trim() || '#f5a623',
      earth: computed.getPropertyValue('--earth').trim() || '#4aa8ff',
      border: computed.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.08)',
      muted: computed.getPropertyValue('--muted-foreground').trim() || '#9b9ba3',
      fg: computed.getPropertyValue('--foreground').trim() || '#f5f5f7',
      card: computed.getPropertyValue('--card').trim() || '#111216',
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.font = '10px "Inter Variable", system-ui, sans-serif'
    ctx.textBaseline = 'middle'

    const dayW = plotW / days

    sites.forEach((site, row) => {
      const y0 = TOP + row * ROW_H
      const m = metricsById.get(site.id)
      const isSelected = site.id === selectedId
      if (isSelected) {
        ctx.fillStyle = colorMap.border
        ctx.globalAlpha = 0.28
        ctx.fillRect(0, y0 - 3, width, ROW_H - 2)
        ctx.globalAlpha = 1
      }

      ctx.fillStyle = isSelected ? colorMap.fg : colorMap.muted
      ctx.font = `${isSelected ? 600 : 450} 11px "Inter Variable", system-ui, sans-serif`
      ctx.fillText(site.shortName.slice(0, 18), 8, y0 + 14)

      const lanes: [number, 'sun' | 'earth'][] = [
        [y0 + 1, 'sun'],
        [y0 + 1 + LANE_H + 3, 'earth'],
      ]
      for (const [laneY, kind] of lanes) {
        for (let d = 0; d < days; d++) {
          const day = m?.days[Math.min(d, (m?.days.length ?? 1) - 1)]
          const hours = day ? (kind === 'sun' ? day.sunHours : day.earthHours) : 0
          const x = LABEL_W + d * dayW
          ctx.fillStyle = colorMap.border
          ctx.fillRect(x, laneY, Math.max(0.7, dayW - 0.45), LANE_H)
          if (hours > 0.05) {
            ctx.globalAlpha = 0.16 + 0.84 * Math.min(1, hours / 24)
            ctx.fillStyle = kind === 'sun' ? colorMap.sun : colorMap.earth
            ctx.fillRect(x, laneY, Math.max(0.7, dayW - 0.45), LANE_H)
            ctx.globalAlpha = 1
          }
        }
      }
    })

    // month boundaries and top labels
    let lastMonth = -1
    let lastLabelX = -100
    for (let d = 0; d < days; d++) {
      const date = new Date(startMs + d * 86_400_000)
      const month = date.getUTCMonth()
      if (month !== lastMonth) {
        lastMonth = month
        const x = LABEL_W + d * dayW
        ctx.strokeStyle = colorMap.border
        ctx.beginPath()
        ctx.moveTo(x, TOP - 8)
        ctx.lineTo(x, height - BOTTOM)
        ctx.stroke()
        if (x - lastLabelX > 34) {
          lastLabelX = x
          ctx.fillStyle = colorMap.muted
          ctx.font = '8.5px "SF Mono", ui-monospace, monospace'
          ctx.fillText(
            new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(date),
            x + 3,
            TOP - 14,
          )
        }
      }
    }

    // cursor
    const cursorX = LABEL_W + (cursorHour / (days * 24)) * plotW
    ctx.strokeStyle = colorMap.fg
    ctx.globalAlpha = 0.7
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cursorX, TOP - 10)
    ctx.lineTo(cursorX, height - BOTTOM)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = colorMap.fg
    ctx.beginPath()
    ctx.arc(cursorX, TOP - 10, 2.5, 0, Math.PI * 2)
    ctx.fill()

    // cursor date pill
    const label = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(startMs + cursorHour * 3_600_000))
    const tw = ctx.measureText(label).width + 10
    const px = Math.min(width - tw - 2, Math.max(LABEL_W, cursorX - tw / 2))
    ctx.fillStyle = colorMap.card
    ctx.strokeStyle = colorMap.border
    ctx.beginPath()
    ctx.roundRect(px, 1, tw, 14, 7)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = colorMap.fg
    ctx.font = '8px "SF Mono", ui-monospace, monospace'
    ctx.fillText(label, px + 5, 8.5)
  }, [sites, metricsById, days, startMs, cursorHour, selectedId, width, height, plotW, theme])

  const dayW = plotW / days

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <canvas
        ref={canvasRef}
        className="block w-full"
        role="img"
        aria-label="Daily sunlight and Earth-visibility heatmap for the selected sites."
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const row = Math.floor((y - TOP) / ROW_H)
          if (row < 0 || row >= sites.length || x < LABEL_W) {
            setHover(null)
            return
          }
          const site = sites[row]
          const day = Math.min(days - 1, Math.floor((x - LABEL_W) / dayW))
          setHover({ site, day, x, y })
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const row = Math.floor((y - TOP) / ROW_H)
          if (row < 0 || row >= sites.length || x < LABEL_W) return
          const site = sites[row]
          const day = Math.min(days - 1, Math.max(0, Math.floor((x - LABEL_W) / dayW)))
          onSelect(site.id)
          onCursor(day * 24 + 12)
        }}
      />

      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-44 rounded-lg border border-border bg-popover/95 p-2.5 shadow-xl backdrop-blur"
          style={{
            left: Math.min(Math.max(8, hover.x + 14), width - 184),
            top: Math.max(4, hover.y - 58),
          }}
        >
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: hover.site.color }} />
            {hover.site.shortName}
          </div>
          <div className="mt-0.5 text-[9px] text-muted-foreground">
            {fmtDayUtc(startMs + hover.day * 86_400_000)}
          </div>
          <div className="mt-1.5 space-y-0.5 font-mono text-[9px]">
            <div className="flex justify-between">
              <span className="text-sun">Sun</span>
              <span>
                {fmtHours(metricsById.get(hover.site.id)?.days[hover.day]?.sunHours ?? 0)} / 24 h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-earth">Earth</span>
              <span>
                {fmtHours(metricsById.get(hover.site.id)?.days[hover.day]?.earthHours ?? 0)} / 24 h
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
