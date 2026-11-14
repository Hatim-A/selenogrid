import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface StarfieldProps {
  /** Star-count multiplier. Defaults to 1. */
  density?: number
  /** Drift + twinkle speed multiplier. Defaults to 1. */
  speed?: number
  className?: string
}

interface Star {
  /** Horizontal position, 0..1 of canvas width. */
  x: number
  /** Vertical position, 0..1 of canvas height. */
  y: number
  /** Depth layer, 0.2 (far) .. 1 (near). Scales size, drift and parallax. */
  z: number
  /** Radius in CSS px. */
  r: number
  phase: number
  /** Twinkle rate in rad/s. */
  twinkle: number
  /** 0 = section ink, 1 = amber sun, 2 = ice-blue earth. */
  tint: 0 | 1 | 2
  base: number
}

const TAU = Math.PI * 2

function parseRgb(css: string): [number, number, number] {
  const m = /(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/.exec(css)
  if (!m) return [241, 237, 227]
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/**
 * Full-bleed canvas starfield: twinkling depth-layered stars, slow drift and
 * pointer parallax. DPR-aware, pauses when offscreen, and renders a single
 * static frame under `prefers-reduced-motion`. Star ink inherits the section
 * text color so it reads on both midnight and paper themes.
 */
export function Starfield({ density = 1, speed = 1, className }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof window === 'undefined') return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let stars: Star[] = []
    let inks = ['#ffffff', '#f0b45c', '#8ec5ff']
    let w = 0
    let h = 0
    let raf = 0
    let running = false
    let onscreen = true
    let last = 0
    // Smoothed pointer parallax (-1..1), plus its target.
    let px = 0
    let py = 0
    let tx = 0
    let ty = 0

    const resolveInks = () => {
      const dark = document.documentElement.classList.contains('dark')
      const base = parseRgb(getComputedStyle(canvas).color)
      const sun: [number, number, number] = dark ? [240, 180, 92] : [143, 87, 0]
      const earth: [number, number, number] = dark ? [142, 197, 255] : [0, 89, 166]
      inks = [
        `rgb(${base[0]}, ${base[1]}, ${base[2]})`,
        `rgb(${sun[0]}, ${sun[1]}, ${sun[2]})`,
        `rgb(${earth[0]}, ${earth[1]}, ${earth[2]})`,
      ]
    }

    const build = () => {
      const count = Math.max(
        40,
        Math.min(520, Math.round(((w * h) / 6500) * Math.max(0, density))),
      )
      const next: Star[] = []
      for (let i = 0; i < count; i++) {
        const z = 0.2 + Math.random() * 0.8
        const roll = Math.random()
        next.push({
          x: Math.random(),
          y: Math.random(),
          z,
          r: 0.35 + z * 1.05,
          phase: Math.random() * TAU,
          twinkle: 0.6 + Math.random() * 2.2,
          tint: roll < 0.7 ? 0 : roll < 0.85 ? 1 : 2,
          base: 0.25 + Math.random() * 0.55,
        })
      }
      // Group by tint so fillStyle changes 3x per frame, not per star.
      next.sort((a, b) => a.tint - b.tint)
      stars = next
    }

    const paint = (t: number, still = false) => {
      ctx.clearRect(0, 0, w, h)
      let currentTint = -1
      for (const s of stars) {
        if (s.tint !== currentTint) {
          currentTint = s.tint
          ctx.fillStyle = inks[currentTint] ?? '#ffffff'
        }
        const twinkle = still
          ? 1
          : 0.55 + 0.45 * Math.sin(t * 0.001 * s.twinkle * speed + s.phase)
        ctx.globalAlpha = Math.min(1, Math.max(0, s.base * twinkle + 0.08))
        const x = s.x * w + px * 16 * s.z
        const y = s.y * h + py * 10 * s.z
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, TAU)
        ctx.fill()
        if (s.z > 0.93) {
          // Faint cross sparkle on the nearest stars only.
          ctx.globalAlpha *= 0.45
          ctx.lineWidth = 1
          ctx.strokeStyle = inks[currentTint] ?? '#ffffff'
          const arm = s.r * 3.2
          ctx.beginPath()
          ctx.moveTo(x - arm, y)
          ctx.lineTo(x + arm, y)
          ctx.moveTo(x, y - arm)
          ctx.lineTo(x, y + arm)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }

    const frame = (t: number) => {
      if (!running) return
      const dt = Math.min(0.05, last === 0 ? 0.016 : (t - last) / 1000)
      last = t
      const k = Math.min(1, dt * 2.2)
      px += (tx - px) * k
      py += (ty - py) * k
      for (const s of stars) {
        s.y -= dt * 0.0045 * speed * s.z
        if (s.y < -0.02) {
          s.y = 1.02
          s.x = Math.random()
        }
      }
      paint(t)
      raf = window.requestAnimationFrame(frame)
    }

    const start = () => {
      if (running || reduced) return
      running = true
      last = 0
      raf = window.requestAnimationFrame(frame)
    }

    const stop = () => {
      running = false
      window.cancelAnimationFrame(raf)
    }

    const resize = () => {
      const host = canvas.parentElement
      const cw = canvas.clientWidth || host?.clientWidth || window.innerWidth
      const ch = canvas.clientHeight || host?.clientHeight || window.innerHeight
      if (cw === 0 || ch === 0) return
      w = cw
      h = ch
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      resolveInks()
      build()
      // Always leave a composed frame behind (matters for reduced-motion,
      // paused-offscreen, and pre-IO states).
      paint(0, true)
    }

    const onPointer = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2
      ty = (e.clientY / window.innerHeight - 0.5) * 2
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else if (onscreen) start()
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        onscreen = entry.isIntersecting
        if (onscreen && !document.hidden) start()
        else stop()
      },
      { threshold: 0 },
    )

    // Re-resolve ink when the theme class flips (canvas can't use CSS vars).
    const mo = new MutationObserver(() => {
      resolveInks()
      if (reduced) paint(0, true)
    })

    const host = canvas.parentElement ?? canvas
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    io.observe(canvas)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    resize()

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [density, speed])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 block h-full w-full',
        className,
      )}
    />
  )
}

export default Starfield
