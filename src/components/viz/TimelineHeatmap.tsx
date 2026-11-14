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
      sun: computed.getPropertyValue('--sun').trim() || '#c98212',
      earth: computed.getPropertyValue('--earth').trim() || '#4f8fd8',
      border: computed.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.08)',
      grid: computed.getPropertyValue('--grid-line').trim() || 'rgba(128,128,128,0.12)',
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
        ctx.globalAlpha = 0.22
        ctx.beginPath()
        ctx.roundRect(2, y0 - 3, width - 4, ROW_H - 1, 7)
        ctx.fill()
        ctx.globalAlpha = 1
        // hairline accent in the site color
        ctx.fillStyle = site.color
        ctx.beginPath()
        ctx.roundRect(2, y0 - 3, 2.5, ROW_H - 1, 2)
        ctx.fill()
      } else if (row > 0) {
        // faint hairline between unselected rows
        ctx.strokeStyle = colorMap.grid
        ctx.globalAlpha = 0.7
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(2, y0 - 3.5)
        ctx.lineTo(width - 2, y0 - 3.5)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.textAlign = 'left'
      ctx.fillStyle = isSelected ? colorMap.fg : colorMap.muted
      ctx.font = `${isSelected ? 600 : 450} 11px "Inter Variable", system-ui, sans-serif`
      ctx.fillText(site.shortName.slice(0, 16), 8, y0 + 14)

      const lanes: [number, 'sun' | 'earth', string][] = [
        [y0 + 1, 'sun', 'SUN'],
        [y0 + 1 + LANE_H + 3, 'earth', 'EARTH'],
      ]
      ctx.textAlign = 'right'
      ctx.font = '600 6.5px ui-monospace, "SF Mono", monospace'
      for (const [laneY, kind, tag] of lanes) {
        ctx.fillStyle = colorMap.muted
        ctx.globalAlpha = 0.75
        ctx.fillText(tag, LABEL_W - 5, laneY + LANE_H / 2 + 0.5)
        ctx.globalAlpha = 1
        for (let d = 0; d < days; d++) {
          const day = m?.days[Math.min(d, (m?.days.length ?? 1) - 1)]
          const hours = day ? (kind === 'sun' ? day.sunHours : day.earthHours) : 0
          const x = LABEL_W + d * dayW
          const w = Math.max(0.7, dayW - 0.45)
          ctx.fillStyle = colorMap.border
          ctx.globalAlpha = 0.55
          ctx.beginPath()
          ctx.roundRect(x, laneY, w, LANE_H, 2.5)
          ctx.fill()
          if (hours > 0.05) {
            ctx.globalAlpha = 0.14 + 0.86 * Math.min(1, hours / 24)
            ctx.fillStyle = kind === 'sun' ? colorMap.sun : colorMap.earth
            ctx.beginPath()
            ctx.roundRect(x, laneY, w, LANE_H, 2.5)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
      }
      ctx.textAlign = 'left'
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
        ctx.globalAlpha = 0.8
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, TOP - 8)
        ctx.lineTo(x, height - BOTTOM)
        ctx.stroke()
        ctx.globalAlpha = 1
        if (x - lastLabelX > 34) {
          lastLabelX = x
          ctx.fillStyle = colorMap.muted
          ctx.font = '600 8.5px ui-monospace, "SF Mono", monospace'
          ctx.fillText(
            new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
              .format(date)
              .toUpperCase(),
            x + 4,
            TOP - 14,
          )
        }
      }
    }

    // cursor
    const cursorX = LABEL_W + (cursorHour / (days * 24)) * plotW
    ctx.strokeStyle = colorMap.fg
    ctx.globalAlpha = 0.75
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
    ctx.font = '600 8px ui-monospace, "SF Mono", monospace'
    const tw = ctx.measureText(label).width + 12
    const px = Math.min(width - tw - 2, Math.max(LABEL_W, cursorX - tw / 2))
    ctx.fillStyle = colorMap.card
    ctx.strokeStyle = colorMap.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(px, 0.5, tw, 15, 7.5)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = colorMap.fg
    ctx.fillText(label, px + 6, 8.5)
  }, [sites, metricsById, days, startMs, cursorHour, selectedId, width, height, plotW, theme])

  const dayW = plotW / days

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div ref={wrapRef} className="relative w-full min-w-[600px] select-none">
        <canvas
          ref={canvasRef}
          className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          role="img"
          tabIndex={0}
          aria-label="Daily sunlight and Earth-visibility heatmap for the selected sites. Use left and right arrows to scrub, and up and down arrows to change site."
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault()
              const delta = e.key === 'ArrowLeft' ? -24 : 24
              onCursor(Math.min(days * 24, Math.max(0, cursorHour + delta)))
              return
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const index = sites.findIndex((site) => site.id === selectedId)
              const next = (index + (e.key === 'ArrowDown' ? 1 : -1) + sites.length) % sites.length
              const site = sites[next]
              if (site) {
                onSelect(site.id)
                onCursor(Math.floor(cursorHour / 24) * 24 + 12)
              }
            }
          }}
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

        <div className="mt-1.5 flex items-center justify-between font-mono text-[8px] tracking-[0.1em] text-muted-foreground/70 uppercase">
          <span>
            <kbd className="rounded border border-border bg-secondary/60 px-1 py-px">←</kbd>{' '}
            <kbd className="rounded border border-border bg-secondary/60 px-1 py-px">→</kbd> scrub
            · <kbd className="rounded border border-border bg-secondary/60 px-1 py-px">↑</kbd>{' '}
            <kbd className="rounded border border-border bg-secondary/60 px-1 py-px">↓</kbd> change
            site
          </span>
          <span className="hidden sm:inline">Click a cell to focus that day</span>
        </div>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-48 rounded-xl border border-border bg-popover/95 p-3 shadow-[var(--shadow-float)] backdrop-blur"
            style={{
              left: Math.min(Math.max(8, hover.x + 14), width - 200),
              top: Math.max(4, hover.y - 72),
            }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em]">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: hover.site.color }} />
              {hover.site.shortName}
            </div>
            <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
              {fmtDayUtc(startMs + hover.day * 86_400_000)}
              <span className="text-muted-foreground/60">
                {' '}
                · day {hover.day + 1} / {days}
              </span>
            </div>
            <div className="mt-2 space-y-1 border-t border-border/60 pt-2 font-mono text-[9.5px] tabular-nums">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sun">
                  <span className="h-1 w-1 rounded-full bg-sun" />
                  Sun
                </span>
                <span>
                  {fmtHours(metricsById.get(hover.site.id)?.days[hover.day]?.sunHours ?? 0)} / 24 h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-earth">
                  <span className="h-1 w-1 rounded-full bg-earth" />
                  Earth
                </span>
                <span>
                  {fmtHours(metricsById.get(hover.site.id)?.days[hover.day]?.earthHours ?? 0)} / 24 h
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
