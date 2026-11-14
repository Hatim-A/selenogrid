import { Check, Info, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Site } from '@/types'

export function SitePicker({
  sites,
  selected,
  onChange,
  onCustom,
}: {
  sites: Site[]
  selected: string[]
  onChange: (ids: string[]) => void
  onCustom?: () => void
}) {
  const nasa = sites.filter((s) => s.kind === 'nasa')
  const reference = sites.filter((s) => s.kind === 'reference')
  const all = sites.map((s) => s.id)

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  return (
    <section
      id="site-picker"
      className="scroll-mt-20 rounded-2xl border border-border bg-card/45 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold">Sites in comparison</h2>
            <Badge variant="outline" className="font-mono">
              {selected.length} / {sites.length}
            </Badge>
          </div>
          <p className="mt-1 max-w-xl text-[10.5px] leading-relaxed text-muted-foreground">
            Nine NASA candidate regions plus nine literature, science and PSR reference sites.
            Coordinates are representative LOLA terrain points, not official landing ellipses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => onChange(nasa.map((s) => s.id))}>
            NASA nine
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange(reference.map((s) => s.id))}>
            References
          </Button>
          <Button variant="outline" size="sm" onClick={() => onChange(all)}>
            All {sites.length}
          </Button>
          {onCustom && (
            <Button variant="secondary" size="sm" onClick={onCustom}>
              + Custom point
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {sites.map((site) => {
          const active = selected.includes(site.id)
          return (
            <button
              key={site.id}
              type="button"
              onClick={() => toggle(site.id)}
              aria-pressed={active}
              title={site.summary}
              className={cn(
                'group inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-all',
                active
                  ? 'border-transparent bg-secondary text-foreground shadow-sm'
                  : 'border-border bg-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              <span
                className={cn('size-2 rounded-full transition-transform', active && 'scale-110')}
                style={{ backgroundColor: site.color, opacity: active ? 1 : 0.55 }}
              />
              {site.shortName}
              {active && <Check className="size-3 text-muted-foreground" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2.5 text-[9.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-3" />
          NASA candidate regions announced 28 Oct 2024
        </span>
        <span className="inline-flex items-center gap-1">
          <Info className="size-3" />
          Representative coordinates · not flight-certified
        </span>
      </div>
    </section>
  )
}
