import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RevealProps = {
  children: ReactNode
  className?: string
  /** Transition delay in ms — staggers grouped reveals. */
  delay?: number
  /** Vertical travel distance in px. Transform-only, so no layout shift. */
  y?: number
  /** Horizontal travel distance in px. Defaults to 0. */
  x?: number
  /** Disconnect the observer after the first reveal. Defaults to true. */
  once?: boolean
  /** IntersectionObserver threshold. Defaults to 0.04. */
  threshold?: number
  /** IntersectionObserver root margin. Defaults to '0px 0px -8% 0px'. */
  rootMargin?: string
  style?: CSSProperties
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  x = 0,
  once = true,
  threshold = 0.04,
  rootMargin = '0px 0px -8% 0px',
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true)
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { rootMargin, threshold },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [once, rootMargin, threshold])

  return (
    <div
      ref={ref}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{
        transitionDelay: delay ? `${delay}ms` : undefined,
        // Inline transform wins over the class default so `y` / `x` are
        // configurable without touching global CSS. Transform + opacity only:
        // no layout shift. Cleared once visible so resting state is exact.
        ...(visible
          ? undefined
          : { opacity: 0, transform: `translate(${x}px, ${y}px)` }),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
