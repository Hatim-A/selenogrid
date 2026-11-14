import { Code2, Globe2 } from 'lucide-react'
import { Logo } from '@/components/Logo'

export function Footer({ onMethod }: { onMethod: () => void }) {
  const linkClass =
    'mt-2 block w-fit text-[12px] leading-relaxed text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline'

  return (
    <footer className="mt-14 border-t border-border">
      <div className="w-full px-4 sm:px-8 xl:px-12 2xl:mx-auto 2xl:max-w-[1800px]">
        <div className="grid gap-10 py-10 sm:py-12 md:grid-cols-[1.3fr_repeat(3,0.55fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Logo className="size-7" />
              <span className="font-display text-[16px] font-extrabold tracking-[-0.01em]">SelenoGrid</span>
              <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                v1.0
              </span>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              A lunar south-pole landing-site comparison lab built for NASA Space
              Apps Challenge 2026, Meknes. Real LOLA terrain, standard
              ephemerides, transparent operations research.
            </p>
          </div>

          <div>
            <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/80 uppercase">
              Explore
            </div>
            <button type="button" onClick={onMethod} className={linkClass}>
              Method &amp; data
            </button>
            <a
              href={`${import.meta.env.BASE_URL}data/sites.json`}
              download
              className={linkClass}
            >
              Site dataset
            </a>
            <a
              href="https://github.com/Hatim-A/selenogrid/blob/main/docs/JUDGE_GUIDE.md"
              target="_blank"
              rel="noreferrer"
              className={linkClass}
            >
              Judge guide
            </a>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/80 uppercase">
              Sources
            </div>
            <a
              href="https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"
              target="_blank"
              rel="noreferrer"
              className={linkClass}
            >
              LOLA PDS
            </a>
            <a
              href="https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/"
              target="_blank"
              rel="noreferrer"
              className={linkClass}
            >
              NASA regions
            </a>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground/80 uppercase">
              Event
            </div>
            <a
              href="https://www.spaceappschallenge.org/2026/"
              target="_blank"
              rel="noreferrer"
              className={`${linkClass} inline-flex items-center gap-1.5`}
            >
              <Globe2 className="size-3" />
              Space Apps 2026
            </a>
            <span className={`${linkClass} inline-flex items-center gap-1.5`}>
              <Code2 className="size-3" />
              Solo build
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border/60 py-4 text-[10px] leading-relaxed text-muted-foreground/80 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Not affiliated with NASA. Representative terrain points, not official landing
            ellipses or flight-certified analysis.
          </span>
          <span className="font-mono whitespace-nowrap">
            NASA Space Apps Challenge 2026 · Meknes
          </span>
        </div>
      </div>
    </footer>
  )
}
