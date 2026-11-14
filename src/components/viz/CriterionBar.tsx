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
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {label}
          {cost && <span className="text-[9px] text-muted-foreground/70">lower is better</span>}
        </span>
        <span className="tabular text-[11px] font-medium text-foreground">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.9 }}
        />
      </div>
      {weight !== undefined && (
        <div className="text-[9px] text-muted-foreground/70">weight {(weight * 100).toFixed(0)}%</div>
      )}
    </div>
  )
}
