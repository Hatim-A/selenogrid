import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  r: number
  depth: number
  base: number
  amp: number
  phase: number
  speed: number
  color: string
}

type Meteor = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
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
      depth: 0.02 + rand() * 0.1,
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
 * Living deep-space backdrop behind the whole app. The starfield reacts to
 * scrolling: stars parallax at different depths, stretch with scroll
 * velocity, and fast scrolls spawn meteors. Nebula washes breathe with
 * overall page progress. A hairline progress spine tracks the page.
 * Decorative only; static under reduced motion or in light theme.
 */
export function SpaceBackdrop({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const warmRef = useRef<HTMLDivElement>(null)
  const coolRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const progressEl = progressRef.current
    const onScrollProgress = () => {
      if (!progressEl) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      progressEl.style.transform = `scaleX(${p.toFixed(4)})`
    }
    onScrollProgress()
    window.addEventListener('scroll', onScrollProgress, { passive: true })
    window.addEventListener('resize', onScrollProgress)
    return () => {
      window.removeEventListener('scroll', onScrollProgress)
      window.removeEventListener('resize', onScrollProgress)
    }
  }, [])

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
    const meteors: Meteor[] = []
    let raf = 0
    let w = 0
    let h = 0
    let lastY = window.scrollY
    let velocity = 0
    let seed = 0x51ed2719
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0xffffffff
    }

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
      stars = buildStars(Math.round(190 * density), w, h)
      paint(window.scrollY, 0, 0)
    }

    const paint = (scrollY: number, t: number, stretch: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        let y = (s.y - scrollY * s.depth) % h
        if (y < 0) y += h
        const tw = reduced ? 1 : 0.72 + 0.28 * Math.sin(s.phase + (t / 1000) * s.speed)
        const a = Math.max(0, Math.min(1, s.base + s.amp * (tw - 0.72)))
        const len = s.r + stretch * (0.4 + s.depth * 8)
        ctx.beginPath()
        if (len > s.r + 0.4) {
          ctx.moveTo(s.x, y - len / 2)
          ctx.lineTo(s.x, y + len / 2)
          ctx.strokeStyle = `rgba(${s.color},${(a * 0.85).toFixed(3)})`
          ctx.lineWidth = s.r
          ctx.lineCap = 'round'
          ctx.stroke()
        } else {
          ctx.arc(s.x, y, s.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${s.color},${a.toFixed(3)})`
          ctx.fill()
        }
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        const fade = m.life / m.maxLife
        const tail = 60 + (1 - fade) * 40
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail * 0.02, m.y - m.vy * tail * 0.02)
        grad.addColorStop(0, `rgba(255,244,220,${(0.9 * fade).toFixed(3)})`)
        grad.addColorStop(1, 'rgba(255,244,220,0)')
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * tail * 0.02, m.y - m.vy * tail * 0.02)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.4
        ctx.lineCap = 'round'
        ctx.stroke()
      }
    }

    if (reduced) {
      resize()
      return () => window.removeEventListener('resize', resize)
    }

    const loop = (t: number) => {
      raf = window.requestAnimationFrame(loop)
      if (document.hidden) return
      const y = window.scrollY
      const instant = y - lastY
      lastY = y
      velocity += (instant - velocity) * 0.12
      const speed = Math.abs(velocity)
      const stretch = Math.min(26, speed * 1.6)

      if (speed > 9 && meteors.length < 6 && rand() < 0.16) {
        const angle = (velocity > 0 ? 1 : -1) * (Math.PI / 2 + (rand() - 0.5) * 0.5)
        const magnitude = 9 + rand() * 9
        meteors.push({
          x: rand() * w,
          y: rand() * h * 0.7,
          vx: Math.cos(angle) * magnitude,
          vy: Math.abs(Math.sin(angle)) * magnitude,
          life: 1,
          maxLife: 0.7 + rand() * 0.5,
        })
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.x += m.vx
        m.y += m.vy
        m.life -= 1 / 60 / m.maxLife
        if (m.life <= 0) meteors.splice(i, 1)
      }

      paint(y, t, stretch)

      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0
      const breathe = 0.5 + 0.5 * Math.sin(t / 5200)
      if (warmRef.current) {
        warmRef.current.style.opacity = (0.35 + 0.65 * Math.sin(progress * Math.PI) * breathe).toFixed(3)
      }
      if (coolRef.current) {
        coolRef.current.style.opacity = (0.3 + 0.7 * (1 - Math.sin(progress * Math.PI)) * (1 - breathe * 0.5)).toFixed(3)
      }
      const wrap = wrapRef.current
      if (wrap) wrap.style.transform = `translate3d(0,${(y * 0.05).toFixed(1)}px,0)`
    }

    resize()
    raf = window.requestAnimationFrame(loop)
    window.addEventListener('resize', resize)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      if (wrapRef.current) wrapRef.current.style.transform = ''
    }
  }, [dark])

  return (
    <>
      <div
        ref={progressRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-sun via-earth to-sun"
        style={{ transform: 'scaleX(0)' }}
      />
      {dark && (
        <div
          ref={wrapRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black will-change-transform"
        >
          <div className="backdrop-nebula-a absolute -top-[12%] left-1/2 h-[46rem] w-[80rem] max-w-none -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(96,138,205,0.13),transparent)] blur-3xl" />
          <div
            ref={warmRef}
            className="absolute top-[30%] -left-[14rem] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,rgba(234,165,46,0.07),transparent)] blur-3xl"
            style={{ opacity: 0.6 }}
          />
          <div
            ref={coolRef}
            className="absolute right-[-12rem] bottom-[-8rem] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(closest-side,rgba(140,120,230,0.09),transparent)] blur-3xl"
            style={{ opacity: 0.6 }}
          />
          <canvas ref={canvasRef} className="absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_42%,transparent_55%,rgba(0,0,0,0.5)_100%)]" />
        </div>
      )}
    </>
  )
}
