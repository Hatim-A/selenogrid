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

  const submit = (event: FormEvent) => {
    event.preventDefault()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary">
              <MapPinPlus className="size-4 text-earth" />
            </span>
            <div>
              <DialogTitle>Pin a custom coordinate</DialogTitle>
              <DialogDescription className="mt-0.5">
                Sample a new south-polar point live in your browser.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5 px-5 pb-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                Latitude (°S)
              </span>
              <input
                type="number"
                step="0.01"
                min={Math.abs(LIMITS.maxLat)}
                max={Math.abs(LIMITS.minLat)}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[11px]"
                aria-label="Custom point latitude"
              />
              <span className="font-mono text-[8px] text-muted-foreground">
                south latitude, 80.15–90.00
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                Longitude (°E)
              </span>
              <input
                type="number"
                step="0.01"
                min={-180}
                max={180}
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[11px]"
                aria-label="Custom point longitude"
              />
              <span className="font-mono text-[8px] text-muted-foreground">
                −180 to +180 · negative = west
              </span>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">
              Label <span className="font-normal">(optional)</span>
            </span>
            <input
              type="text"
              maxLength={48}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My candidate point"
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-[16px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 sm:text-[11px]"
            />
          </label>

          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <div className="flex items-start gap-2">
              <Database className="mt-0.5 size-3.5 shrink-0 text-earth" />
              <p className="text-[9.5px] leading-relaxed text-muted-foreground">
                The point is analysed against the LOLA <strong>640 m</strong> south-polar grid
                loaded in your browser, not the 20 m grid used for the curated sites. Elevation,
                slope, horizon, Sun/Earth windows and the local 3D tile are recomputed locally. It
                is a fast screening point, not a landing-ellipse assessment. Custom pins stay in
                this browser session; a refresh clears them.
              </p>
            </div>
          </div>

          {(localError || error) && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[10px] text-danger">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {localError || error}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <span className="font-mono text-[8px] text-muted-foreground">
              LOLA · in-browser · static site
            </span>
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <MapPinPlus />}
                {busy ? 'Sampling terrain…' : 'Pin & analyze'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
