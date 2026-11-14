import { useEffect } from 'react'
import type { ReactNode } from 'react'
import Lenis from 'lenis'
import { setLenis } from '@/hooks/useSmoothScroll'
import '../../lenis.css'

/**
 * App-wide buttery smooth scrolling (Lenis).
 *
 * - Inits Lenis once (`duration: 1.25, lerp: 0.09, smoothWheel: true, anchors: true`)
 *   and drives it with its own rAF loop (no extra deps).
 * - Skips entirely under `prefers-reduced-motion` (native scroll untouched).
 * - Re-syncs dimensions on window `load`/`resize` (fonts/images shifting
 *   layout); Lenis `autoResize` covers the rest.
 * - Cleanup destroys the instance and clears the `useSmoothScroll` singleton.
 *
 * Coexistence notes: sticky elements and `useScrub` (getBoundingClientRect)
 * read native scroll, which Lenis keeps in sync - unaffected. Existing
 * `scrollIntoView` calls elsewhere keep working; Lenis observes native
 * scroll. Radix dialogs: scrollable dialog content should set
 * `data-lenis-prevent` (see src/lenis.css); no stop()/start() wiring here.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const lenis = new Lenis({
      duration: 1.25,
      lerp: 0.09,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      smoothWheel: true,
      anchors: true,
    })
    setLenis(lenis)

    let rafId = 0
    const loop = (time: number): void => {
      lenis.raf(time)
      rafId = window.requestAnimationFrame(loop)
    }
    rafId = window.requestAnimationFrame(loop)

    const resync = (): void => {
      lenis.resize()
    }
    window.addEventListener('load', resync)
    window.addEventListener('resize', resync)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('load', resync)
      window.removeEventListener('resize', resync)
      lenis.destroy()
      setLenis(null)
    }
  }, [])

  return <>{children}</>
}
