# SelenoGrid: submission sheet (copy-paste)

Everything below is ready for the Space Apps project form. Links verified
public, no login, no password. Save Progress often; Submit for Judging by
23:59 local on Sunday 15 November 2026.

---

## Project name

```
SelenoGrid
```

## Summary (934 / 1500 characters, 150 words)

```
SelenoGrid is a browser-based navigator for lunar south-pole landing sites. It puts 18 terrain points on one screen: the nine NASA Artemis candidate regions plus nine science and permanently shadowed reference sites. Choose a date and a window from 30 to 365 days, and it recomputes locally: sunlight share, direct-to-Earth visibility, longest continuous windows, time to the next sunset or earthset, slope, and horizon relief. Every site carries a 1,440-bin horizon ray-marched on the real 20 m LOLA elevation model, and Sun and Earth geometry is checked against JPL Horizons to about 0.02 degrees. A transparent weighted ranking, with visible weights and a Pareto frontier, shows which sites survive a given priority mix. A timeline heatmap, a 3D Moon, and any custom coordinate south of 80.15 S make the trade-off legible for planners, educators, and the public. No backend: the whole model runs in the browser from open NASA data.
```

## Project demonstration (choose ONE link)

Recommended, the 7-slide deck (title slide plus six content slides, no more
than 7):

```
https://hatim-a.github.io/selenogrid/deck.html
```

Alternative, the 30.0-second video:

```
https://hatim-a.github.io/selenogrid/demo-30s.mp4
```

Judges open the deck and press Right Arrow (or space) to advance. Speaker notes
are hidden by default; press N to show them.

## Project link

```
https://hatim-a.github.io/selenogrid/
```

Source repository (also public):

```
https://github.com/Hatim-A/selenogrid
```

## Project details (2499 characters)

```
What it does
SelenoGrid compares lunar south-pole landing sites and dates in one workspace. A scenario bar sets the landing date, start hour, mission length (30, 90, 180, or 365 days), and sampling step. From that it computes, for every site: sunlight share of the window, direct-to-Earth visibility, longest unbroken Sun and Earth windows, the next sunset, sunrise, earthset and earthrise, local slope, and horizon relief. Terrain comes from a 1,440-bin horizon per site, ray-marched on the real LOLA 20 m elevation model out to 220 km with lunar curvature included. Sun and Earth positions come from a Meeus/IAU astronomy engine masked by that horizon, and they are validated against JPL Horizons to about 0.02 degrees.

How it works
Everything is client-side. A precomputed metrics file ships with the site dataset, and any change to date, window, sites, or weights recomputes live in the browser. The decision layer is a transparent TOPSIS ranking over four criteria (sunlight, Earth visibility, solar flux proxy, and slope as a cost), with exposed weights, presets, and a Pareto frontier that is independent of the weights. No learned model, no hidden coefficients.

Benefits and impact
Mission planners get a fast screening layer: shortlist sites for a specific window and see which trade-offs dominate. Educators and the public get an intuitive view of why south-pole lighting and communication are hard, with plain-language explanations next to expert numbers. The method, data provenance, and limits are in the app, so a result can be inspected and argued with rather than trusted blindly.

Tools and technology
React 19, TypeScript, and Vite; Tailwind CSS v4 with Radix primitives; Three.js for the Moon globe; Recharts and custom SVG/canvas for horizons and heatmaps; Lenis for smooth scrolling. Data preparation used Python and C tooling. Fonts: Inter, Space Grotesk, Instrument Serif. Hosted as a static site on GitHub Pages with no backend and no API keys.

Creativity and considerations
The creative bet is that a landing site is a schedule, not a pin, so the interface is built around time: event clocks, a scrubbable 180-day film, a daily heatmap, and time-to-sunset metrics. We deliberately kept the ranking explainable instead of optimizing a single opaque score, and we stated limits in the product: representative points rather than official ellipses, screening accuracy rather than flight dynamics, no thermal or power sizing, and lower-resolution custom pins clearly labelled.
```

## Use of Super Intelligence (SI)

Check the options that describe **code assistance only**. Suggested options and
wording:

- Select the option for **code generation / coding assistance** (AI coding
  assistants were used for interface code and prose drafts under human
  direction).
- Do **not** select image generation, audio generation, or video generation:
  none was used.
- If the form offers a free-text field, use:

```
AI coding assistants (OpenCode, Muse Spark) were used for interface code and
prose drafting under human direction. All science code, the terrain pipeline,
the ephemerides, the visibility rule, and the validation were human-designed.
No AI-generated images, audio, or video are used: every screenshot is a capture
of the running app and the demo video is a screen recording of the live site.
No NASA logos, flags, or mission identifiers appear in generated content.
```

Full disclosure for the repository: `/AI_DISCLOSURE.md`.

## NASA data links

| Link text | URL |
| --- | --- |
| LRO LOLA south polar DEM, 20 m (PDS Geosciences) | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ |
| LOLA DEM product label (data contract) | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.lbl |
| NASA Artemis III candidate landing regions | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ |
| NASA JPL Horizons (validation) | https://ssd.jpl.nasa.gov/horizons/ |
| NASA SVS CGI Moon Kit, LROC color mosaic | https://svs.gsfc.nasa.gov/4720 |
| NASA LRO LOLA mission overview | https://science.nasa.gov/mission/lro/lola/ |
| NASA Artemis III redefinition, October 2026 | https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/ |
| NASA Artemis IV overview | https://www.nasa.gov/mission/artemis-iv/ |
| LOLA instrument paper (Smith et al. 2010) | https://doi.org/10.1007/s11214-009-9512-y |
| IAU lunar orientation model (Archinal et al. 2011) | https://doi.org/10.1007/s10569-010-9320-4 |

## Space Agency Partner and other data

| Link text | URL |
| --- | --- |
| React | https://github.com/facebook/react |
| TypeScript | https://github.com/microsoft/TypeScript |
| Vite | https://github.com/vitejs/vite |
| Tailwind CSS | https://github.com/tailwindlabs/tailwindcss |
| Radix UI primitives | https://github.com/radix-ui/primitives |
| Three.js | https://github.com/mrdoob/three.js |
| Recharts | https://github.com/recharts/recharts |
| Lenis smooth scroll | https://github.com/darkroomengineering/lenis |
| lucide icons | https://github.com/lucide-icons/lucide |
| Inter typeface (SIL OFL) | https://github.com/rsms/inter |
| Space Grotesk typeface (SIL OFL) | https://github.com/floriankarsten/space-grotesk |
| Instrument Serif typeface (SIL OFL) | https://github.com/Instrument/instrument-serif |
| Fontsource (self-hosted font packages) | https://github.com/fontsource/fontsource |
| TOPSIS site-selection precedent (Peña-Asensio et al.) | https://arxiv.org/abs/2406.19863 |
| Meeus, Astronomical Algorithms (ISBN record) | https://books.google.com/books/about/Astronomical_Algorithms.html?id=WSo6PgAACAAJ |

## Final checks before Submit for Judging

1. Project name, summary, and details pasted; character counter green.
2. Demonstration link opens in a private window with no login prompt.
3. Project link opens the live app, and the repo link is public.
4. SI options reflect code assistance only.
5. Both data tables have at least one entry and every URL opens.
6. Terms and originality boxes checked.
7. Click Save Progress, then Submit for Judging, and keep the confirmation.
