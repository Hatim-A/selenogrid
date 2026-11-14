import { Code2, Globe2 } from 'lucide-react'
import { Logo } from '@/components/Logo'

export function Footer({ onMethod }: { onMethod: () => void }) {
  return (
    <footer className="mt-12 border-t border-border py-7">
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Logo className="size-6" />
            <span className="text-[12px] font-semibold tracking-[-0.02em]">SelenoGrid</span>
            <span className="font-mono text-[8px] text-muted-foreground">v1.0</span>
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-muted-foreground">
            A lunar south-pole landing-site comparison lab built for NASA Space Apps Challenge 2026,
            Meknes. Real LOLA terrain, standard ephemerides, transparent operations research.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-[9.5px] sm:grid-cols-3">
          <div>
            <div className="font-mono text-[7.5px] tracking-[0.1em] text-muted-foreground uppercase">
              Explore
            </div>
            <button
              type="button"
              onClick={onMethod}
              className="mt-1.5 block text-muted-foreground hover:text-foreground"
            >
              Method & data
            </button>
            <a
              href={`${import.meta.env.BASE_URL}data/sites.json`}
              download
              className="mt-1 block text-muted-foreground hover:text-foreground"
            >
              Site dataset
            </a>
            <a
              href="https://github.com/Hatim-A/selenogrid/blob/main/docs/JUDGE_GUIDE.md"
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-muted-foreground hover:text-foreground"
            >
              Judge guide
            </a>
          </div>
          <div>
            <div className="font-mono text-[7.5px] tracking-[0.1em] text-muted-foreground uppercase">
              Sources
            </div>
            <a
              href="https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 block text-muted-foreground hover:text-foreground"
            >
              LOLA PDS
            </a>
            <a
              href="https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/"
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-muted-foreground hover:text-foreground"
            >
              NASA regions
            </a>
          </div>
          <div>
            <div className="font-mono text-[7.5px] tracking-[0.1em] text-muted-foreground uppercase">
              Event
            </div>
            <a
              href="https://www.spaceappschallenge.org/2026/"
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Globe2 className="size-3" />
              Space Apps 2026
            </a>
            <span className="mt-1 flex items-center gap-1 text-muted-foreground">
              <Code2 className="size-3" />
              Solo build
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-1 border-t border-border/60 pt-3 text-[8px] leading-relaxed text-muted-foreground/80 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Not affiliated with NASA. Representative terrain points, not official landing ellipses or
          flight-certified analysis.
        </span>
        <span className="font-mono">NASA Space Apps Challenge 2026 · Meknes</span>
      </div>
      </div>
    </footer>
  )
}
