import type Lenis from 'lenis'

/**
 * Module singleton for the app-wide Lenis instance.
 *
 * `<SmoothScroll>` (src/components/landing/SmoothScroll.tsx) is the ONLY
 * writer: it calls `setLenis()` on mount and clears it on unmount.
 * Everyone else reads via `getLenis()` or, preferably, the two helpers below.
 *
 * Radix dialogs: no `stop()`/`start()` wiring here on purpose. Dialog content
 * that scrolls on its own should set `data-lenis-prevent` on the scrollable
 * node - Lenis then applies `overscroll-behavior: contain` there (see
 * src/lenis.css) and leaves nested scrolling to the native handler.
 * `useScrub` reads `getBoundingClientRect`, which Lenis keeps in sync via
 * native scroll, so scrub math is unaffected.
 */

let lenisInstance: Lenis | null = null

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Internal: register (or clear) the singleton. Called by `<SmoothScroll>`. */
export function setLenis(instance: unknown): void {
  lenisInstance = (instance ?? null) as Lenis | null
}

/** Read the live Lenis instance, if smoothing is active. */
export function getLenis(): unknown {
  return lenisInstance
}

/**
 * Smooth-scroll to a section by element id (leading `#` tolerated).
 * Uses Lenis with a sticky-header offset; falls back to an instant native
 * jump when Lenis is absent or the user prefers reduced motion.
 */
export function scrollToSection(id: string): void {
  if (typeof document === 'undefined') return
  const key = id.startsWith('#') ? id.slice(1) : id
  const element = document.getElementById(key)
  if (!element) return
  const lenis = lenisInstance
  if (lenis && !prefersReducedMotion()) {
    lenis.scrollTo(element, { offset: -70, duration: 1.4, easing: easeInOutCubic })
    return
  }
  element.scrollIntoView({ behavior: 'auto' })
}

/** Jump to the top of the page immediately (Lenis-tracked when active). */
export function scrollTopInstant(): void {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate: true })
    return
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}

/** Smooth-scroll to the top through Lenis (no native fighting). */
export function scrollTopSmooth(): void {
  if (typeof window === 'undefined') return
  if (lenisInstance && !prefersReducedMotion()) {
    lenisInstance.scrollTo(0, { duration: 1.2, easing: easeInOutCubic })
    return
  }
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/** Smooth-scroll to an element through Lenis (no native fighting). */
export function scrollToElement(element: HTMLElement | null): void {
  if (!element || typeof document === 'undefined') return
  if (lenisInstance && !prefersReducedMotion()) {
    lenisInstance.scrollTo(element, { offset: -70, duration: 1.3, easing: easeInOutCubic })
    return
  }
  element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}
