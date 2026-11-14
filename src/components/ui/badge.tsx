import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] leading-[1.5] font-medium tracking-[0.01em] whitespace-nowrap select-none [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-transparent text-muted-foreground',
        sun: 'border-transparent bg-[var(--sun-soft)] text-sun',
        earth: 'border-transparent bg-[var(--earth-soft)] text-earth',
        terrain: 'border-transparent bg-[var(--terrain-soft)] text-terrain',
        success: 'border-transparent bg-[var(--success-soft)] text-success',
        danger: 'border-transparent bg-[var(--danger-soft)] text-danger',
        glass: 'border-white/10 bg-white/5 text-foreground/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
