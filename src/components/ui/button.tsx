import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Signal amber: the one ownable action color. Dark-on-amber in dark mode,
        // white-on-amber in light mode for contrast.
        default:
          'bg-sun text-white shadow-sm ring-1 ring-inset ring-black/10 hover:brightness-[1.07] active:scale-[0.985] dark:text-[#1c1305] dark:ring-white/10 dark:hover:brightness-[1.05]',
        secondary:
          'border border-border bg-secondary text-secondary-foreground hover:bg-muted active:scale-[0.985]',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-muted active:scale-[0.985]',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.985]',
        accent: 'bg-accent text-accent-foreground hover:brightness-[1.05] active:scale-[0.985]',
        destructive:
          'bg-destructive text-white shadow-sm hover:brightness-[1.06] active:scale-[0.985]',
        link: 'text-earth underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 [&_svg]:size-4',
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        xs: 'h-7 px-2.5 text-xs [&_svg]:size-3.5',
        lg: 'h-10 px-5 text-sm [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner + soft shimmer and blocks interaction. Ignored with asChild. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'
  if (asChild) {
    return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  }
  return (
    <Comp
      className={cn(
        buttonVariants({ variant, size, className }),
        loading && 'relative cursor-wait overflow-hidden',
      )}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
      {loading && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
