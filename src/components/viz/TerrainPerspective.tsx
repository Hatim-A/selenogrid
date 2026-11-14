import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Site } from '@/types'

const W = 800
const H = 600
const EXAGGERATION = 2.1

type Palette = { stops: [number, [number, number, number]][] }

const DARK: Palette = {
  stops: [
    [0, [10, 13, 18]],
    [0.45, [38, 44, 55]],
    [0.76, [112, 122, 138]],
    [1, [230, 236, 244]],
  ],
}
const LIGHT: Palette = {
  stops: [
    [0, [226, 224, 218]],
    [0.45, [196, 190, 179]],
    [0.76, [140, 132, 120]],
    [1, [92, 86, 78]],
  ],
}

function samplePalette(stops: Palette['stops'], t: number): [number, number, number] {
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i]
    const [p0, c0] = stops[i - 1]
    if (t <= p1) {
      const f = Math.max(0, Math.min(1, (t - p0) / (p1 - p0)))
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ]
    }
  }
  return stops[stops.length - 1][1]
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/**
 * A small, dependency-free perspective renderer for the 12 km LOLA tile.
 * The geometry is a real height field, vertically exaggerated for legibility.
 */
export function TerrainPerspective({ site, theme }: { site: Site; theme: 'light' | 'dark' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null)
  const [yaw, setYaw] = useState(-28)
  const [pitch, setPitch] = useState(47)
  const [dragging, setDragging] = useState(false)

  const field = useMemo(() => {
    const raw = Uint8Array.from(atob(site.tile.base64), (c) => c.charCodeAt(0))
    const step = Math.max(1, Math.round(site.tile.size / 100))
    const n = Math.floor(site.tile.size / step)
    const height = new Float32Array(n * n)
    const range = site.tile.maxM - site.tile.minM || 1
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        height[j * n + i] =
          site.tile.minM + (raw[(j * step) * site.tile.size + i * step] / 255) * range
      }
    }
    return {
      n,
      height,
      stepM: step * site.tile.pixelM,
      extentM: site.tile.size * site.tile.pixelM,
      midM: (site.tile.minM + site.tile.maxM) / 2,
    }
  }, [site])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const isDark = theme === 'dark'
    const bg = ctx.createRadialGradient(W / 2, H * 0.5, 40, W / 2, H * 0.5, W * 0.64)
    bg.addColorStop(0, isDark ? '#171c26' : '#faf8f4')
    bg.addColorStop(0.55, isDark ? '#0d1016' : '#edeae3')
    bg.addColorStop(1, isDark ? '#06070a' : '#dcd7ce')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    const { n, height, stepM, extentM, midM } = field
    const yawR = (yaw * Math.PI) / 180
    const pitchR = (pitch * Math.PI) / 180
    const cy = Math.cos(yawR)
    const sy = Math.sin(yawR)
    const sp = Math.sin(pitchR)
    const cp = Math.cos(pitchR)

    const scale =
      Math.min(W / 1.414, H / (1.414 * sp + 0.62 * cp)) * 0.92
    const tint = hexRgb(site.color)
    const palette = theme === 'dark' ? DARK : LIGHT
    const light = [-0.55, -0.62, 0.56]
    const lightLen = Math.hypot(light[0], light[1], light[2])

    const xs = new Float32Array(n * n)
    const ys = new Float32Array(n * n)
    const depths = new Float32Array(n * n)
    const baseZ = ((site.tile.minM - midM) / extentM) * EXAGGERATION - 0.055
    const baseY = new Float32Array(n * n)
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i
        const x = i / (n - 1) - 0.5
        const y = j / (n - 1) - 0.5
        const z = ((height[k] - midM) / extentM) * EXAGGERATION
        const rx = x * cy - y * sy
        const ry = x * sy + y * cy
        xs[k] = W / 2 + rx * scale
        ys[k] = H * 0.55 - ry * sp * scale - z * cp * scale
        baseY[k] = H * 0.55 - ry * sp * scale - baseZ * cp * scale
        depths[k] = ry * cp - z * sp
      }
    }

    // The block's side walls give the height field a physical edge.
    ctx.fillStyle = isDark ? 'rgba(62, 72, 89, 0.98)' : 'rgba(126, 117, 104, 0.92)'
    const skirt = (a: number, b: number) => {
      ctx.beginPath()
      ctx.moveTo(xs[a], ys[a])
      ctx.lineTo(xs[b], ys[b])
      ctx.lineTo(xs[b], baseY[b])
      ctx.lineTo(xs[a], baseY[a])
      ctx.closePath()
      ctx.fill()
    }
    for (let i = 0; i < n - 1; i++) {
      skirt(i, i + 1)
      const k = (n - 1) * n + i
      skirt(k, k + 1)
    }
    for (let j = 0; j < n - 1; j++) {
      const k = j * n
      skirt(k, k + n)
      skirt(k + n - 1, k + 2 * n - 1)
    }

    const cells: { d: number; i: number; j: number }[] = []
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const k = j * n + i
        cells.push({ d: depths[k], i, j })
      }
    }
    cells.sort((a, b) => b.d - a.d)

    const minH = site.tile.minM
    const range = site.tile.maxM - site.tile.minM || 1
    for (const cell of cells) {
      const { i, j } = cell
      const k = j * n + i
      const hx = height[j * n + Math.min(n - 1, i + 1)] - height[j * n + Math.max(0, i - 1)]
      const hy = height[Math.min(n - 1, j + 1) * n + i] - height[Math.max(0, j - 1) * n + i]
      const nx = -hx / (2 * stepM)
      const ny = -hy / (2 * stepM)
      const lambert = Math.max(
        0,
        (nx * light[0] + ny * light[1] + light[2]) / (Math.hypot(nx, ny, 1) * lightLen),
      )
      const shade = 0.34 + 0.82 * lambert
      const t = (height[k] - minH) / range
      const [br, bg, bb] = samplePalette(palette.stops, Math.min(1, Math.max(0, t)))
      const r = Math.min(255, br * (1 - 0.08) + tint[0] * 0.08) * shade
      const g = Math.min(255, bg * (1 - 0.08) + tint[1] * 0.08) * shade
      const b = Math.min(255, bb * (1 - 0.08) + tint[2] * 0.08) * shade

      ctx.fillStyle = `rgb(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)})`
      ctx.beginPath()
      ctx.moveTo(xs[k], ys[k])
      ctx.lineTo(xs[k + 1], ys[k + 1])
      ctx.lineTo(xs[k + n + 1], ys[k + n + 1])
      ctx.lineTo(xs[k + n], ys[k + n])
      ctx.closePath()
      ctx.fill()
    }

    // A faint rim separates the block from the stage.
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.24)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i])
    for (let j = 1; j < n; j++) ctx.lineTo(xs[j * n + n - 1], ys[j * n + n - 1])
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(xs[(n - 1) * n + i], ys[(n - 1) * n + i])
    for (let j = n - 2; j > 0; j--) ctx.lineTo(xs[j * n], ys[j * n])
    ctx.closePath()
    ctx.stroke()

    // Site marker: the highest point of the tile is not necessarily the site,
    // so mark the tile centre with a small pin.
    const center = (n >> 1) * n + (n >> 1)
    ctx.beginPath()
    ctx.arc(xs[center], ys[center], 4.2, 0, Math.PI * 2)
    ctx.fillStyle = site.color
    ctx.fill()
    ctx.lineWidth = 1.6
    ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.65)'
    ctx.stroke()
  }, [field, site.color, site.tile.minM, site.tile.maxM, theme, yaw, pitch])

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, yaw, pitch }
    setDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    setYaw(drag.current.yaw - dx * 0.35)
    setPitch(Math.max(28, Math.min(76, drag.current.pitch + dy * 0.22)))
  }
  const endDrag = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // pointer capture already released
      }
    }
    drag.current = null
    setDragging(false)
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-[#08090c]">
      <canvas
        ref={canvasRef}
        className="block aspect-[4/3] w-full touch-none"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        role="img"
        aria-label={`Interactive 3D perspective of the 12 km LOLA terrain tile around ${site.name}. Drag to orbit.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setYaw((v) => v - 5)
          if (e.key === 'ArrowRight') setYaw((v) => v + 5)
          if (e.key === 'ArrowUp') setPitch((v) => Math.min(76, v + 3))
          if (e.key === 'ArrowDown') setPitch((v) => Math.max(28, v - 3))
          if (e.key.startsWith('Arrow')) e.preventDefault()
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_62%,rgba(0,0,0,0.18))]" />
      <div className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/55 px-2 py-1 font-mono text-[7.5px] tracking-wide text-white/75 backdrop-blur">
        3D SURFACE · DRAG TO ORBIT
      </div>
      <div className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 backdrop-blur">
        <span className="h-px w-6 bg-white/70" />
        <span className="font-mono text-[8px] tracking-wide text-white/80">12 km</span>
      </div>
    </div>
  )
}
