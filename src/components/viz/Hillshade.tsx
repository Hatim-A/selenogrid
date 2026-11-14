import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

const DARK_STOPS: [number, [number, number, number]][] = [
  [0, [7, 8, 11]],
  [0.42, [30, 34, 42]],
  [0.72, [94, 103, 117]],
  [1, [208, 214, 223]],
]

function samplePalette(t: number): [number, number, number] {
  for (let i = 1; i < DARK_STOPS.length; i++) {
    const [p1, c1] = DARK_STOPS[i]
    const [p0, c0] = DARK_STOPS[i - 1]
    if (t <= p1) {
      const f = (t - p0) / (p1 - p0)
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ]
    }
  }
  return DARK_STOPS[DARK_STOPS.length - 1][1]
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function Hillshade({
  site,
  className,
  showScale = false,
}: {
  site: Site
  className?: string
  showScale?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { size, base64 } = site.tile
    const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const img = ctx.createImageData(size, size)
    const tint = hexRgb(site.color)
    for (let i = 0; i < raw.length; i++) {
      const [r, g, b] = samplePalette(raw[i] / 255)
      const k = 0.07
      img.data[i * 4] = r * (1 - k) + tint[0] * k
      img.data[i * 4 + 1] = g * (1 - k) + tint[1] * k
      img.data[i * 4 + 2] = b * (1 - k) + tint[2] * k
      img.data[i * 4 + 3] = 255
    }
    canvas.width = size
    canvas.height = size
    ctx.putImageData(img, 0, 0)
  }, [site])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-[#08090c]',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        style={{ filter: 'var(--atlas-filter)' }}
        className="block aspect-square w-full object-cover"
        role="img"
        aria-label={`LOLA hillshade within 12 km of ${site.name}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.35))]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className="block size-3 rounded-full border-2 border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
          style={{ backgroundColor: site.color }}
        />
      </div>
      {showScale && (
        <div className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 backdrop-blur">
          <span className="h-px w-6 bg-white/70" />
          <span className="font-mono text-[8px] tracking-wide text-white/80">3 km</span>
        </div>
      )}
    </div>
  )
}
