import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/55 backdrop-blur-[8px] backdrop-saturate-150 data-[state=open]:animate-fade-in',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      {/* Centering wrapper (instead of -translate-1/2 on the panel) so the
          entrance animation never fights the centering transform. On mobile
          this docks as a bottom sheet. Focus trap is kept: Radix traps focus
          within DialogPrimitive.Content regardless of the wrapper. */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
        <DialogPrimitive.Content
          className={cn(
            'pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-float)] outline-none data-[state=open]:animate-fade-up sm:max-h-[88vh] sm:max-w-2xl sm:rounded-3xl',
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="absolute top-4 right-4 z-10 inline-flex size-8 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X className="size-3.5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 border-b border-border px-6 py-5 pr-14', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold tracking-[-0.02em]', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-[12.5px] leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
