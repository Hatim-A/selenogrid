import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Database, Loader2, MapPinPlus, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const LIMITS = { minLat: -90, maxLat: -80.15 }

function validate(lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'Enter numeric latitude and longitude.'
  if (lat > LIMITS.maxLat || lat < LIMITS.minLat) {
    return 'Custom points must be south of 80.15°S to stay inside the LOLA polar grid.'
  }
  if (lon < -180 || lon > 180) return 'Longitude must be between −180° and 180°.'
  return null
}

export function CustomPointDialog({
  open,
  onOpenChange,
  initialLat,
  initialLon,
  busy,
  error,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialLat?: number | null
  initialLon?: number | null
  busy: boolean
  error: string | null
  onCreate: (lat: number, lon: number, name?: string) => void
}) {
  const [lat, setLat] = useState('89.50')
  const [lon, setLon] = useState('0.00')
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLat(Math.abs(initialLat ?? -89.5).toFixed(2))
    setLon((initialLon ?? 0).toFixed(2))
    setName('')
    setLocalError(null)
  }, [open, initialLat, initialLon])

  const createFromState = () => {
    const latNum = -Math.abs(Number(lat))
    const lonNum = Number(lon)
    const issue = validate(latNum, lonNum)
    if (issue) {
      setLocalError(issue)
      return
    }
    setLocalError(null)
    onCreate(latNum, lonNum, name.trim() || undefined)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    createFromState()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 max-sm:top-auto max-sm:bottom-2 max-sm:max-h-[calc(100dvh-1rem)] max-sm:translate-y-0 max-sm:rounded-b-2xl">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-secondary/60">
              <MapPinPlus className="size-4 text-earth" aria-hidden />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display text-[19px] leading-tight">
                Pin a custom coordinate
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Sample a new south-polar point live in your browser.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Latitude (°S)
              </span>
              <input
                type="number"
                step="0.01"
                min={Math.abs(LIMITS.maxLat)}
                max={Math.abs(LIMITS.minLat)}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="tabular h-10 rounded-xl border border-border bg-background px-3 font-mono text-[16px] outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[12px]"
                aria-label="Custom point latitude"
              />
              <span className="font-mono text-[8px] tracking-wide text-muted-foreground">
                south latitude, 80.15–90.00
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Longitude (°E)
              </span>
              <input
                type="number"
                step="0.01"
                min={-180}
                max={180}
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="tabular h-10 rounded-xl border border-border bg-background px-3 font-mono text-[16px] outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[12px]"
                aria-label="Custom point longitude"
              />
              <span className="font-mono text-[8px] tracking-wide text-muted-foreground">
                −180 to +180 · negative = west
              </span>
            </label>
          </div>

          <label className="mt-3 flex flex-col gap-1.5">
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Label <span className="font-normal normal-case">(optional)</span>
            </span>
            <input
              type="text"
              maxLength={48}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My candidate point"
              aria-label="Custom point label"
              className="h-10 rounded-xl border border-border bg-background px-3 text-[16px] outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[12px]"
            />
          </label>

          <div className="mt-3 rounded-2xl border border-border bg-secondary/40 p-3.5">
            <div className="flex items-start gap-2">
              <Database className="mt-0.5 size-3.5 shrink-0 text-earth" aria-hidden />
              <p className="max-w-prose text-[10px] leading-relaxed text-muted-foreground">
                The point is analysed against the LOLA <strong className="font-medium text-foreground/80">640 m</strong> south-polar
                grid loaded in your browser, not the 20 m grid used for the curated
                sites. Elevation, slope, horizon, Sun/Earth windows and the local 3D
                tile are recomputed locally. It is a fast screening point, not a
                landing-ellipse assessment. Custom pins stay in this browser session;
                a refresh clears them.
              </p>
            </div>
          </div>

          {(localError || error) && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-[10.5px] text-danger"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {localError || error}
            </div>
          )}
        </form>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card/60 px-5 py-3.5 sm:px-6">
          <span className="hidden font-mono text-[8px] tracking-wide text-muted-foreground sm:inline">
            LOLA · in-browser · static site
          </span>
          <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:items-center sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={createFromState}
              className="w-full sm:w-auto"
            >
              {busy ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <MapPinPlus aria-hidden />
              )}
              {busy ? 'Sampling terrain…' : 'Pin & analyze'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
