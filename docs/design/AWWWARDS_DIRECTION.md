# SelenoGrid · premium pass — creative direction (draft v1)

> Safety: `pre-awwwards` tag + `backup/pre-awwwards` branch = rollback point.
> Keep **every** behavior, URL state, scroll targets, reduced-motion semantics,
> theme contract and dialog scroll guard (data-lenis-prevent).

## Direction
**Quiet instrument panel, lunar editorial.** Not another generic glass dashboard:
precision instrument language, restrained type, one hero object. Visual drama
comes from the moon, real horizons and event clock; interface recedes.

- Typography: Space Grotesk only for *actual* display headlines; Inter body;
  Instrument Serif italic for one emphasized word within a headline only;
  mono for data, not for every label. Body text raised (≥13px, max-w prose 60ch),
  fewer decorative 8–9px tracked mono.
- Surface: two elevation steps, nearly no shadow except topmost overlays.
  Panel style "surface": border only, quiet bg. No gradient hairlines on every
  card, no per-card site-color glow.
- Motion: one cubic-bezier (0.22,1,0.36,1), opacity/transform only,
  purposeful: reveal on section entry, weight-driven rank shift, cinematic
  landing scrub; no repetitive ambient glow pulse per panel.
- Dark theme: background allowed subtle near-black (e.g. #050608) with warm
  foreground; strongly defined accent hierarchy: Sun amber, Earth steel-blue,
  terrain violet only in data contexts. Light theme: warm paper with same
  instrument feel.
- Buttons: one primary style (foreground solid; amber CTA only on landing);
  secondary quiet outline; tertiary text arrow. Never more than one primary
  on screen.

## IA / anti-clutter
- Compare: one glance "shortlist + weights" flow. Collapse ScenarioBar from
  marketing-sized panel to compact row (active window summary inline) with a
  popover/disclosure for advanced fields; Hero reduced to a single-line title +
  one sentence, or dropped from compare (landing already owns the big hero).
- Decision brief and shortlist visibly one system (no 01/02/03 marketing numbers).
- Weights beside ranking, Pareto as an optional tab beside ranking (not a second
  on-screen chart permanently).
- Landing: bigger moon scale and better use of scroll transitions; keep the
  hero words and only ONE CTA + text link; chapters with calmer visual rhythm.
- Timeline: date scrub is the star, transport bar simplified, next-event list
  visually tied to the cursor (not another big card stack).
- Moon: 3D experience-first. Controls overlay, catalog as an aside collapsed
  to one toolbar on desktop / bottom sheet on mobile.

## Ownership (planned agents, non-overlapping files)
1. Main: tokens/type/buttons + landing hero/Chapters/ScrubMission/CTA.
2. Agent A: Compare flow (ScenarioBar compact, Hero compact, DecisionBrief + CompareView order, SiteCard restyle), no shared CSS.
3. Agent B: Lab views (TimelineView transport+layout, AtlasView toolbar layout, DecisionLab weights+ranking tabs) no shared CSS.
4. Agent C: Dialog + SiteDetail visual and Guide/CustomPoint formatting; keep data-lenis-prevent.

Full functionality, theme coherence, QA per committed pass.
