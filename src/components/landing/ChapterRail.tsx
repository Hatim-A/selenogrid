import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const ITEMS: { id: string; index: string; label: string }[] = [
  { id: 'top', index: '00', label: 'Top' },
  { id: 'chapter-01', index: '01', label: 'The problem' },
  { id: 'chapter-02', index: '02', label: 'Real terrain' },
  { id: 'chapter-03', index: '03', label: 'Sun & Earth' },
  { id: 'chapter-04', index: '04', label: 'Ranking' },
]

export function ChapterRail({
  active,
  onJump,
}: {
  /** Section id owned by LandingView's scroll-spy. */
  active: string
  onJump: (id: string) => void
}) {
  // Overall page progress 0..1. Drives the spine fill via transform scaleY
  // only (GPU-cheap); rAF-throttled and jitter-deadbanded like useScrub.
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    let queued = false
    const measure = () => {
      queued = false
      const total = document.documentElement.scrollHeight - window.innerHeight
      const next =
        total <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / total))
      setProgress((prev) => (Math.abs(prev - next) < 0.0005 ? prev : next))
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
  }, [])

  return (
    <nav
      aria-label="Page chapters"
      className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 lg:block"
    >
      <ol className="relative flex flex-col items-end gap-4">
        {/* Thin progress spine: track + scroll-driven fill (scaleY only). */}
        <span
          aria-hidden="true"
          className="absolute top-2 right-[3px] bottom-2 w-px bg-foreground/10"
        />
        <span
          aria-hidden="true"
          className="absolute top-2 right-[3px] bottom-2 w-px origin-top bg-gradient-to-b from-sun via-earth to-sun"
          style={{ transform: `scaleY(${progress})` }}
        />
        {ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <li key={item.id} className="relative">
              <button
                type="button"
                onClick={() => onJump(item.id)}
                aria-label={`Jump to ${item.label}`}
                aria-current={isActive ? 'true' : undefined}
                className="group flex min-h-[32px] min-w-[32px] items-center justify-end gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    'font-mono text-[9.5px] tracking-[0.12em] whitespace-nowrap uppercase transition-opacity duration-200 motion-reduce:transition-none',
                    isActive
                      ? 'text-foreground opacity-100'
                      : 'text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:opacity-70',
                  )}
                >
                  {item.index} · {item.label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'block rounded-full transition-all duration-200 motion-reduce:transition-none',
                    isActive
                      ? 'size-2.5 bg-sun shadow-[0_0_12px_0_var(--sun)]'
                      : 'size-1.5 bg-foreground/30 group-hover:scale-125 group-hover:bg-foreground/60',
                  )}
                />
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
