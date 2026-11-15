> **Archived 2026-11-13 planning note.** This file is preserved for provenance. It is not current product documentation; see [`docs/handoff/README.md`](./README.md).

# SelenoGrid — Shared Project Ledger

> **Purpose:** the single source of truth for every human and AI working in this
> folder. Read it before beginning work; update it after every material decision
> or change. Keep entries concise, factual, and safe to publish.

## Project identity

| Field | Decision |
| --- | --- |
| Product | **SelenoGrid** |
| NASA Space Apps 2026 challenge | **Lunar Landing Site Navigator** |
| Team | Solo human builder, assisted by Codex and OpenCode |
| Status | Team created and published on Space Apps Connect — planning phase |
| Source brief | https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ |

## One-sentence product

SelenoGrid is a transparent lunar south-pole landing-site comparison tool that
helps users select a site and date by visualizing sunlight for power, Earth
visibility for communications, and terrain/horizon constraints.

## Product boundaries

### Must demonstrate

- Compare a deliberately small set of lunar south-pole candidate landing sites.
- Let a user choose a landing date and mission duration.
- Show Sun and Earth positions relative to the local horizon.
- Show power and direct-to-Earth communication windows over time.
- Explain a recommendation with visible calculations, assumptions, uncertainty,
  and citations.

### Explicitly out of scope

- A generic chatbot or AI-generated scientific conclusions.
- A full 3D Moon simulation or arbitrary-coordinate global search.
- A route planner, autonomous landing system, or operational flight software.
- Uncited or fabricated NASA data, visualizations, or claims.

## Working agreement

1. **Read this file first.** Claim a task in `Active work` before editing code.
2. **One owner per file at a time.** Do not concurrently edit the same file.
3. **Use small, reversible changes.** Record changed paths and validation below.
4. **Keep science auditable.** Cite every NASA/third-party source and distinguish
   measured data, calculations, assumptions, and illustrative mock data.
5. **AI explains; calculations decide.** Any AI text must be grounded in outputs
   and sources already visible in the product.
6. **No secrets here.** Never record API keys, tokens, passwords, or personal data.

## Conversation and decision log

| Date (Africa/Casablanca) | Owner | Entry |
| --- | --- | --- |
| 2026-11-12 | Codex + human | Reviewed all 14 published challenges. Recommended the Lunar Landing Site Navigator because it has a focused, mission-relevant core, lends itself to a compelling live demo, and can be built rigorously in a weekend. |
| 2026-11-13 | Human + Codex | Selected the Lunar Landing Site Navigator challenge and created this shared ledger for coordination with OpenCode. |
| 2026-11-13 | Human + OpenCode | Created the original LunaLens team-profile artwork for Space Apps Connect. |
| 2026-11-13 | Human + OpenCode | Simplified the team-profile artwork to a single-horizon, lens-ring composition for stronger thumbnail recognition. |
| 2026-11-13 | Human + Codex | Replaced the existing `LunaLens` name with **SelenoGrid**: a neutral, technical name that reflects lunar mapping and site comparison. The existing artwork needs its wordmark updated before upload. |
| 2026-11-13 | Human + OpenCode | Rebranded the team-profile artwork to **SelenoGrid** as new files; the LunaLens originals remain untouched. |
| 2026-11-13 | Human | Created the **SelenoGrid** team on Space Apps Connect under the Meknès Local Event, published the public description, and uploaded the rebranded team image. Space Apps confirmed: “Team created successfully.” |

## Active work

| Owner | Task | Files owned | Started | Status |
| --- | --- | --- | --- | --- |
| OpenCode | Rebrand the team-profile graphic to SelenoGrid (SVG + PNG) | New files under `brand/`; do not overwrite the LunaLens originals | 2026-11-13 | Done — 2026-11-13 15:14 |
| Human | Publish the SelenoGrid team profile on Space Apps Connect | Team page and uploaded image | 2026-11-13 | Done — 2026-11-13 15:17 |
| OpenCode | Research/data slice: cite three sites, validate Horizons observer workflow, build fixture and METHOD.md | `data/`, `scripts/`, `METHOD.md`, `PROJECT_CONTEXT.md` | 2026-11-13 | In progress |

## Change log

Add one row for every material change. For code, include the validation command
or manual check that passed.

| Date/time (Africa/Casablanca) | Owner | What changed | Paths | Validation |
| --- | --- | --- | --- | --- |
| 2026-11-13 | Codex | Created shared project ledger and recorded confirmed direction. | `PROJECT_CONTEXT.md` | Reviewed for coordination and source-traceability requirements. |
| 2026-11-13 | Codex + human | Drafted the Space Apps Connect team profile for LunaLens. | `PROJECT_CONTEXT.md` | Public description and members-only contact text remain under the 500-character limits. |
| 2026-11-13 14:37 | OpenCode | Created original LunaLens team-profile artwork and 1024 × 1024 PNG export. | `brand/lunalens-profile.svg`, `brand/lunalens-profile.png` | Rendered with `rsvg-convert`; checked 1024 px, 200 px, and 64 px previews. Scene remains recognizable at 64 px; wordmark is crisp at profile-card sizes. |
| 2026-11-13 14:56 | OpenCode | Simplified the team-profile artwork to one horizon, one Earth, one line-of-sight arc, and a thin lens ring; removed the grid, extra ridge, contours, and secondary labels. | `brand/lunalens-profile.svg`, `brand/lunalens-profile.png` | Re-rendered with `rsvg-convert`; checked 1024 px, 200 px, and 64 px previews. Lens badge, horizon, and Earth remain recognizable at 64 px. |
| 2026-11-13 | Codex + human | Renamed the project from LunaLens to SelenoGrid after finding the original name already in use. | `PROJECT_CONTEXT.md` | Basic exact-name web search did not surface a SelenoGrid product; this is not legal trademark clearance. |
| 2026-11-13 15:14 | OpenCode | Rebranded the team-profile artwork: updated the SVG title, replaced the two-tone wordmark with **SelenoGrid**, and reduced the wordmark from 58 px to 50 px so it fits inside the lower lens arc. LunaLens files were not modified. | `brand/selenogrid-profile.svg`, `brand/selenogrid-profile.png` | `xmllint --noout` passed; `rsvg-convert` produced a 1024 × 1024 sRGB PNG; checked 1024 px, 200 px, and 64 px previews. |
| 2026-11-13 15:17 | Human | Created and published the SelenoGrid team on Space Apps Connect; uploaded `brand/selenogrid-profile.png` as the team image. | Space Apps Connect team page | Site confirmed “Team created successfully.” Live image was fetched back at 300 × 250; the wordmark, horizon, Earth, and line-of-sight arc remain intact in the platform crop. |
| 2026-11-13 | Codex | Created a comprehensive continuation brief for OpenCode. | `OPENCODE_HANDOFF.md` | Cross-checked against the live team state, official challenge brief, and source register. |

## Source register

| Source | Intended use | Status |
| --- | --- | --- |
| [NASA Space Apps — Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) | Challenge requirements and scope | Confirmed |
| [NASA Space Apps legal terms](https://www.spaceappschallenge.org/legal/) | Licensing and source-citation requirements | Confirmed |
| [JPL Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Airless Sun/Earth azimuth-elevation ephemerides for selected lunar sites and times | Confirmed — fetch through a backend/cache or precompute; not directly from browser code |
| [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html) | Interpretation and validation of topocentric airless azimuth/elevation output | Confirmed |
| [LROC QuickMap](https://quickmap.lroc.asu.edu/) | Site research, terrain context, and source citations | Confirmed — research/validation source, not a runtime dependency |
| [NASA Moon Trek](https://trek.nasa.gov/moon/) | 3D terrain exploration and visual validation of selected sites | Confirmed — research/validation source, not a runtime dependency |
| NASA/JPL ephemeris and lunar-terrain sources | Sun/Earth geometry and terrain/horizon calculations | To select and validate before implementation |

## Resource implementation decision

1. **Horizons is the numerical source of truth** for the Sun and Earth apparent
   azimuth/elevation at each site and time. Request the observer table in
   airless mode and retain the raw response used to build every displayed value.
2. **Do not call Horizons directly from browser code.** NASA's API documentation
   states that its APIs may not be embedded in websites under its CORS policy.
   Use a backend endpoint with response caching, or commit a small precomputed
   dataset for the curated demonstration scenarios.
3. **QuickMap and Moon Trek support research and visual validation.** Cite them
   on the methodology page, but do not make the live demo depend on either
   third-party interface.
4. **Terrain occlusion is a stretch feature, not an unstated claim.** The first
   MVP must label its horizon as geometric/airless. A terrain-aware skyline is
   added only after a LOLA-derived horizon profile has been computed and tested
   for the selected sites.

## Space Apps Connect team profile

Published on 2026-11-13. The values below reflect the live team profile:

| Form field | Value |
| --- | --- |
| Team name | `SelenoGrid` |
| Local event | `Meknès (2026 NASA Space Apps Challenge)` |
| Challenge | `Lunar Landing Site Navigator` |
| Accepting team members | Unchecked — this is a solo team. |
| Desired skills/interests | Leave all choices unchecked; the project disciplines are described in the public description instead. |
| Languages | English. Add Arabic and/or French only if the human team owner is comfortable using them. |
| Team image | Uploaded `brand/selenogrid-profile.png` (1024 × 1024). The platform displays a 300 × 250 crop, verified to retain the wordmark and scene. |

**Public description** (under 500 characters):

> SelenoGrid is a solo project for the Lunar Landing Site Navigator challenge. It will help compare lunar south-pole landing sites and mission dates using sunlight, Earth visibility, terrain, and communication-window visualizations, with transparent calculations and cited NASA/JPL data.

**Members-only contact text** (under 500 characters):

> This is a solo team. Please follow the project on Space Apps Connect for updates.

## Brand assets

| Asset | Path | Notes |
| --- | --- | --- |
| Team-profile graphic (vector) | `brand/selenogrid-profile.svg` | Original, editable source; simplified single-horizon lens-ring composition with the SelenoGrid wordmark. |
| Team-profile graphic (PNG) | `brand/selenogrid-profile.png` | 1024 × 1024 sRGB export for Space Apps Connect. |
| Prior LunaLens graphic (vector) | `brand/lunalens-profile.svg` | Preserved unchanged as a reference; not the current brand asset. |
| Prior LunaLens graphic (PNG) | `brand/lunalens-profile.png` | Preserved unchanged as a reference; do not upload under the SelenoGrid name. |

## Next decisions

1. Select the initial three candidate south-pole sites.
2. Choose the calculation/data stack and validate one known geometry result.
3. Define the first demonstrable slice and assign non-overlapping file ownership.
4. Create a public repository with an open-source license before submission.

---

### Update template

```md
| YYYY-MM-DD HH:MM | Owner | Short, concrete decision or change. | `path/changed` | Command or manual check |
```

