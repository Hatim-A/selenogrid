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
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn('relative', px)}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={size === 'sm' ? 7 : 6}
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke={color}
            strokeWidth={size === 'sm' ? 7 : 6}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${v} 100`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="tabular font-semibold tracking-[-0.04em]"
            style={{ fontSize: text, color }}
          >
            {v.toFixed(0)}
            <span className="text-[0.55em] font-medium">%</span>
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10.5px] font-medium text-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[9px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  )
}
