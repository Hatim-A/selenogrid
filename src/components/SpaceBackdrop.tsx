import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  r: number
  base: number
  amp: number
  phase: number
  speed: number
  color: string
}

const STAR_COLORS = ['255,255,255', '255,255,255', '186,214,255', '255,224,178', '214,198,255']

function buildStars(count: number, w: number, h: number): Star[] {
  const stars: Star[] = []
  let seed = 0x2f6e2b1
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0xffffffff
  }
  for (let i = 0; i < count; i++) {
    const giant = rand() > 0.965
    stars.push({
      x: rand() * w,
      y: rand() * h,
      r: giant ? 1.4 + rand() * 0.9 : 0.3 + rand() * 0.9,
      base: 0.25 + rand() * 0.5,
      amp: 0.15 + rand() * 0.3,
      phase: rand() * Math.PI * 2,
      speed: 0.25 + rand() * 0.9,
      color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
    })
  }
  return stars
}

/**
 * Fixed deep-space backdrop rendered behind the whole app: a twinkling
 * starfield canvas plus two slow-drifting nebula washes. Decorative only.
 */
export function SpaceBackdrop({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dark) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let stars: Star[] = []
    let raf = 0
    let w = 0
    let h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const density = Math.min(1.4, Math.max(0.6, (w * h) / (1600 * 1000)))
      stars = buildStars(Math.round(170 * density), w, h)
      if (reduced) paint(0)
    }

    const paint = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        const tw = reduced ? 1 : 0.72 + 0.28 * Math.sin(s.phase + (t / 1000) * s.speed)
        const a = Math.max(0, Math.min(1, s.base + s.amp * (tw - 0.72)))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.color},${a.toFixed(3)})`
        ctx.fill()
      }
    }

    const onScroll = () => {
      const el = wrapRef.current
      if (el) el.style.transform = `translate3d(0,${(window.scrollY * 0.06).toFixed(1)}px,0)`
    }

    resize()
    if (!reduced) {
      const loop = (t: number) => {
        if (document.hidden) {
          raf = window.requestAnimationFrame(loop)
          return
        }
        paint(t)
        raf = window.requestAnimationFrame(loop)
      }
      raf = window.requestAnimationFrame(loop)
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    window.addEventListener('resize', resize)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      if (wrapRef.current) wrapRef.current.style.transform = ''
    }
  }, [dark ])

  if (!dark) return null

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      <div className="backdrop-nebula-a absolute -top-[12%] left-1/2 h-[46rem] w-[80rem] max-w-none -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(96,138,205,0.13),transparent)] blur-3xl" />
      <div className="backdrop-nebula-b absolute top-[30%] -left-[14rem] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,rgba(234,165,46,0.055),transparent)] blur-3xl" />
      <div className="backdrop-nebula-b absolute right-[-12rem] bottom-[-8rem] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(closest-side,rgba(140,120,230,0.07),transparent)] blur-3xl" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,transparent_55%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  )
}
