import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type AuroraVariant = 'hero' | 'chapter' | 'film' | 'cta'

const AURORA_TUNING: Record<AuroraVariant, { a: CSSProperties; b: CSSProperties }> = {
  hero: {
    a: {
      left: '-25vmax',
      top: '-24vmax',
      width: '150vmax',
      height: '62vmax',
      opacity: 0.42,
    },
    b: {
      right: '-25vmax',
      bottom: '-26vmax',
      width: '150vmax',
      height: '58vmax',
      opacity: 0.38,
    },
  },
  chapter: {
    a: { left: '-24vmax', top: '-30vmax', opacity: 0.32, transform: 'scale(0.85)' },
    b: { right: '-26vmax', bottom: '-30vmax', opacity: 0.28, transform: 'scale(0.85)' },
  },
  film: {
    a: { left: '-10vmax', top: '-32vmax', opacity: 0.4, transform: 'scaleX(1.6)' },
    b: { right: '-12vmax', bottom: '-34vmax', opacity: 0.36, transform: 'scaleX(1.6)' },
  },
  cta: {
    a: { left: '8%', top: '-70%', opacity: 0.42, transform: 'scale(0.9)' },
    b: { right: '8%', bottom: '-80%', opacity: 0.38, transform: 'scale(0.9)' },
  },
}

/**
 * Absolute-inset aurora wash: two huge blurred gradient blobs drifting on
 * GPU-only keyframes, plus a cinematic vignette. Decorative - no layout
 * impact. Render inside a relative parent.
 */
export function AuroraField({ variant = 'hero' }: { variant?: AuroraVariant }) {
  const tuning = AURORA_TUNING[variant] ?? AURORA_TUNING.hero
  return (
    <div aria-hidden="true" className="lp-aurora">
      <div className="lp-aurora-a" style={tuning.a} />
      <div className="lp-aurora-b" style={tuning.b} />
      <div className="lp-vignette" />
    </div>
  )
}

type GlowTone = 'sun' | 'earth' | 'mix'

const GLOW_GRADIENTS: Record<GlowTone, string> = {
  sun: 'linear-gradient(90deg, transparent, var(--sun), transparent)',
  earth: 'linear-gradient(90deg, transparent, var(--earth), transparent)',
  mix: 'linear-gradient(90deg, transparent, var(--sun), var(--earth), transparent)',
}

/**
 * Hairline divider with an animated shimmer sweep. Decorative - no layout
 * impact beyond its own 1px height.
 */
export function GlowDivider({ tone = 'mix' }: { tone?: GlowTone }) {
  return (
    <div
      aria-hidden="true"
      className="lp-shimmer-line pointer-events-none h-px w-full"
      style={{ background: GLOW_GRADIENTS[tone] ?? GLOW_GRADIENTS.mix }}
    />
  )
}

/**
 * Decorative rotating dashed orbit ring. Absolutely centered on its nearest
 * positioned ancestor; pass sizing/position overrides via className.
 */
export function OrbitRing({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('lp-orbit-ring pointer-events-none', className)} />
}

export default AuroraField
