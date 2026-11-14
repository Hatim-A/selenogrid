import { BookOpen, Clock3, HelpCircle, LayoutGrid, Orbit } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type View = 'compare' | 'timeline' | 'atlas' | 'method'

const NAV: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'compare', label: 'Compare', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: Clock3 },
  { id: 'atlas', label: 'Moon', icon: Orbit },
  { id: 'method', label: 'Method', icon: BookOpen },
]

export function Header({
  view,
  onView,
  theme,
  onTheme,
  onGuide,
}: {
  view: View
  onView: (view: View) => void
  theme: 'light' | 'dark'
  onTheme: () => void
  onGuide: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 glass">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onView('compare')}
          className="flex items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SelenoGrid home"
        >
          <Logo />
          <span className="leading-none">
            <span className="block text-[15px] font-semibold tracking-[-0.03em]">SelenoGrid</span>
            <span className="mt-1 block font-mono text-[7.5px] tracking-[0.16em] text-muted-foreground">
              LUNAR SITE LAB
            </span>
          </span>
        </button>

        <nav className="ml-3 hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-2.5 py-1 font-mono text-[9px] tracking-wide text-muted-foreground lg:inline-flex">
            <span className="size-1.5 rounded-full bg-success" />
            LOLA 20 m · IN-BROWSER
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGuide}
            aria-label="Open the 60-second guide"
            className="gap-1.5 px-2.5 text-muted-foreground"
          >
            <HelpCircle className="size-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </Button>
          <ThemeToggle theme={theme} onToggle={onTheme} />
        </div>
      </div>

      <nav
        aria-label="Mobile primary"
        className="no-scrollbar overflow-x-auto border-t border-border/50 px-3 pb-2 md:hidden"
      >
        <div className="flex min-w-max items-center gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
