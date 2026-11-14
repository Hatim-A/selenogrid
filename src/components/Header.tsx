import { useEffect, useState } from 'react'
import { BookOpen, Clock3, HelpCircle, LayoutGrid, Orbit } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type View = 'landing' | 'compare' | 'timeline' | 'atlas' | 'method'

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
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 glass border-b transition-[border-color,box-shadow] duration-300',
        scrolled
          ? 'border-border shadow-[0_16px_44px_-28px_rgba(0,0,0,0.5)]'
          : 'border-border/60',
      )}
    >
      <div className="flex h-12 w-full items-center gap-3 px-4 sm:px-8 xl:px-12 2xl:mx-auto 2xl:max-w-[1800px]">
        <button
          type="button"
          onClick={() => onView('landing')}
          className="group flex items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SelenoGrid home"
        >
          <Logo className="size-7 transition-transform duration-300 group-hover:rotate-[8deg]" />
          <span className="leading-none">
            <span className="block font-display text-[17px] font-bold tracking-[-0.01em]">
              SelenoGrid
            </span>
            <span className="mt-1 block font-mono text-[7.5px] tracking-[0.22em] text-muted-foreground">
              LUNAR SITE LAB
            </span>
          </span>
        </button>

        <nav
          className="ml-2 hidden items-center rounded-full border border-border/70 bg-secondary/40 p-1 md:flex"
          aria-label="Primary"
        >
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
                  'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.14)] ring-1 ring-border/60'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/50 px-2.5 py-1 font-mono text-[9px] tracking-wide text-muted-foreground xl:inline-flex">
            <span className="pulse-dot size-1.5 rounded-full bg-success" />
            LOLA 20 m · IN-BROWSER
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGuide}
            aria-label="Open the 60-second guide"
            className="h-8 gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 text-[12px] font-medium text-foreground/80 hover:bg-secondary hover:text-foreground"
          >
            <HelpCircle className="size-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </Button>
          <div className="rounded-full border border-border/70 bg-card/50 p-0.5 [&_button]:size-7 [&_button]:rounded-full">
            <ThemeToggle theme={theme} onToggle={onTheme} />
          </div>
        </div>
      </div>

      <div className="relative md:hidden">
        <nav
          aria-label="Mobile primary"
          className="no-scrollbar overflow-x-auto px-4 pt-1 pb-2.5"
        >
          <div className="flex min-w-max items-center gap-1.5">
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
                    'inline-flex h-8 min-h-[32px] items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-border/70 bg-card text-foreground shadow-sm'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent"
        />
      </div>

      <span
        aria-hidden
        className="absolute inset-x-0 bottom-[-1px] h-px origin-left bg-gradient-to-r from-sun via-earth to-transparent transition-opacity duration-300"
        style={{
          transform: `scaleX(${progress})`,
          opacity: scrolled ? 0.9 : 0,
        }}
      />
    </header>
  )
}
