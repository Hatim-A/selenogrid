import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/** Smoothstep easing — gentle accel/decel so scrubbed motion feels filmic. */
function easeInOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/**
 * Eased 0..1 scroll progress of a tall (sticky-friendly) section.
 *
 * Math: progress = -rect.top / (rect.height - viewportHeight), so a wrapper
 * of e.g. 300vh containing a `sticky top-0 h-screen` stage scrubs 0 → 1
 * exactly across the pin distance. rAF-throttled on scroll + resize,
 * SSR-safe (returns 0 outside the browser).
 */
export function useScrub(ref: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    let queued = false

    const measure = () => {
      queued = false
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const total = rect.height - vh
      const raw = total <= 0 ? (rect.top >= 0 ? 0 : 1) : -rect.top / total
      const next = easeInOut(raw)
      // Deadband: avoid re-rendering on sub-pixel scroll jitter.
      setProgress((prev) => (Math.abs(prev - next) < 0.0004 ? prev : next))
    }

    const request = () => {
      if (queued) return
      queued = true
      raf = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      window.cancelAnimationFrame(raf)
    }
  }, [ref])

  return progress
}

export default useScrub
