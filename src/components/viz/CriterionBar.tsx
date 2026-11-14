import { cn } from '@/lib/utils'

export function CriterionBar({
  label,
  value,
  display,
  max = 100,
  color = 'var(--sun)',
  weight,
  cost = false,
  className,
}: {
  label: string
  value: number
  display: string
  max?: number
  color?: string
  weight?: number
  cost?: boolean
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      role="img"
      aria-label={`${label}: ${display}`}
      className={cn('space-y-1.5', className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-medium text-foreground/85">
          {label}
          {cost && (
            <span className="ml-1.5 rounded-full border border-border px-1.5 py-px align-middle font-mono text-[8px] tracking-[0.08em] text-muted-foreground uppercase">
              lower is better
            </span>
          )}
        </span>
        <span className="tabular font-mono text-[11px] font-semibold text-foreground">
          {display}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {weight !== undefined && (
        <div className="tabular font-mono text-[9px] text-muted-foreground">
          weight {(weight * 100).toFixed(0)}%
        </div>
      )}
    </div>
  )
}
