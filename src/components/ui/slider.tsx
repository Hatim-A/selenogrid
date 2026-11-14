import * as SliderPrimitive from '@radix-ui/react-slider'
import type * as React from 'react'
import { cn } from '@/lib/utils'

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn(
        'relative flex w-full touch-none items-center py-1 select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary ring-1 ring-inset ring-border/50">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-earth shadow-[0_0_12px_-2px_var(--earth)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 cursor-grab rounded-full border-2 border-background bg-earth shadow-[0_0_0_4px_var(--earth-soft),0_1px_4px_rgba(0,0,0,0.35)] transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing active:scale-105 disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  )
}

export { Slider }
