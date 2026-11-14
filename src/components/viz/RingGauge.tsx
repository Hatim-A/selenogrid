import { cn } from '@/lib/utils'

export function RingGauge({
  value,
  label,
  color = 'var(--earth)',
  size = 'md',
  hint,
}: {
  value: number
  label: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  hint?: string
}) {
  const v = Math.max(0, Math.min(100, value))
  const px = size === 'lg' ? 'size-28' : size === 'sm' ? 'size-16' : 'size-20'
  const text = size === 'lg' ? 22 : size === 'sm' ? 13 : 17
  const trackWidth = size === 'sm' ? 6 : 5
  const valueWidth = size === 'sm' ? 7 : 6
  return (
    <div
      role="img"
      aria-label={`${label}: ${v.toFixed(0)} percent${hint ? `. ${hint}` : ''}`}
      className="flex flex-col items-center gap-1.5"
    >
      <div className={cn('relative', px)}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={trackWidth}
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke={color}
            strokeWidth={valueWidth}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${v} 100`}
            className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="tabular font-display leading-none font-medium tracking-[-0.02em]"
            style={{ fontSize: text, color }}
          >
            {v.toFixed(0)}
            <span className="text-[0.55em]">%</span>
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-medium text-foreground">{label}</div>
        {hint && (
          <div className="mt-0.5 font-mono text-[8.5px] text-muted-foreground">{hint}</div>
        )}
      </div>
    </div>
  )
}
