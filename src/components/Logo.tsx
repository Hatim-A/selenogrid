import { useId } from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <defs>
        <linearGradient
          id={`logo-grad-${uid}`}
          x1="7"
          y1="4"
          x2="26"
          y2="29"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--sun)" />
          <stop offset="1" stopColor="var(--earth)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="var(--card)" stroke="var(--border)" />
      <path
        d="M16 5.5a10.5 10.5 0 1 0 10.5 10.5A8.3 8.3 0 0 1 16 5.5Z"
        fill={`url(#logo-grad-${uid})`}
      />
      <path d="M16 10v12M10 16h12" stroke="var(--foreground)" strokeOpacity=".5" strokeWidth=".9" />
      <circle cx="22" cy="10" r="1.5" fill="var(--earth)" />
    </svg>
  )
}
