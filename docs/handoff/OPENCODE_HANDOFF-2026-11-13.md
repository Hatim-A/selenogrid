> **Archived 2026-11-13 planning note.** This file is preserved for provenance. It is not current product documentation; see [`docs/handoff/README.md`](./README.md).

# SelenoGrid — OpenCode Handoff

## Read this first

The human is participating solo in the **2026 NASA Space Apps Challenge** under
the **Meknès, Morocco** Local Event. The team is already live on Space Apps
Connect as **SelenoGrid**, for the official challenge **Lunar Landing Site
Navigator**.

The authoritative evolving record is [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).
Read it before editing anything, claim ownership of files before editing, and
append material changes and validation results to its change log.

## What has been completed

- Team name: **SelenoGrid**.
- Solo team profile was created and published on Space Apps Connect.
- Challenge: **Lunar Landing Site Navigator**.
- Public description is already published:

  > SelenoGrid is a solo project for the Lunar Landing Site Navigator challenge.
  > It will help compare lunar south-pole landing sites and mission dates using
  > sunlight, Earth visibility, terrain, and communication-window
  > visualizations, with transparent calculations and cited NASA/JPL data.

- Original team-profile graphics exist:
  - `brand/selenogrid-profile.svg`
  - `brand/selenogrid-profile.png`
- `brand/lunalens-profile.*` are obsolete reference assets. Preserve them;
  do not use or overwrite them.
- There is no application implementation yet and this directory was not a Git
  repository when last checked. Confirm the current state before initializing or
  changing project tooling.

## The product to build

### One-sentence definition

SelenoGrid is a transparent lunar south-pole landing-site comparison tool that
helps a user choose a site and date by making sunlight, Earth visibility, and
terrain/horizon trade-offs understandable in seconds.

### The demo story

An imagined mission has a schedule slip. The user compares a small set of
south-pole candidate sites for a selected landing date and duration. SelenoGrid
shows, side by side:

1. Sun and Earth positions on an intuitive local-horizon compass.
2. Power and direct-to-Earth communication windows over the selected period.
3. A clear operational score/recommendation with its stated assumptions.
4. A visible methodology/source trail so the numbers are auditable.

The important experience is **rapid comparison**, not a generic Moon map or an
AI chatbot.

### Required MVP

- A curated, small set of south-pole candidate sites (initially three; research
  and cite their coordinates before committing them).
- Date/time and mission-duration controls.
- Sun and Earth relative-to-local-horizon views.
- Timeline/chart of Sun elevation and Earth elevation, with visible windows
  above a clearly stated threshold.
- Side-by-side site comparison and a plain-language recommendation.
- A Sources & Method page/panel that names datasets, assumptions, units, and
  limitations.

### Do not build in the MVP

- A generic LLM/chatbot.
- Full 3D lunar simulation, global arbitrary-coordinate search, a route planner,
  autonomous landing, or flight software.
- Claims of terrain occlusion, local shadow, or real mission readiness that are
  not directly supported by the calculations/data.

## Official brief and sources

Official challenge page:
https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/

The brief asks for rapid comparison of site/date scenarios, showing Sun and
Earth relative to the horizon, power-generation potential, and direct-to-Earth
communication potential. It encourages, but does not require, terrain-aware
horizons and multiple visualizations.

Use these sources and cite every one in the product:

| Resource | Intended role |
| --- | --- |
| JPL Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html | Numerical source of truth for Sun and Earth observer-table azimuth/elevation over time. |
| JPL Horizons manual: https://ssd.jpl.nasa.gov/horizons/manual.html | Semantics, units, observer/site configuration, and validation. |
| LROC QuickMap: https://quickmap.lroc.asu.edu/ | Research/validation for chosen site context and lunar terrain. Do not depend on its live UI at runtime. |
| NASA Moon Trek: https://trek.nasa.gov/moon/ | Research/visual validation. Do not depend on its live UI at runtime. |
| NASA Space Apps legal terms: https://www.spaceappschallenge.org/legal/ | Submission, citation, and licensing requirements. |

## Non-negotiable scientific/data rules

1. **Horizons is the numerical source of truth.** Prefer an observer table
   containing apparent, airless azimuth/elevation for the Sun and Earth from
   each selected lunar site. Preserve raw responses and parsing code/data.
2. **Do not call Horizons from browser JavaScript.** NASA API documentation
   says its APIs may not be embedded in websites due to CORS policy. Either:
   - use a small server-side proxy/cache, or
   - use a versioned, precomputed dataset for demo scenarios.
3. **Do not guess Horizons coordinate syntax or results.** Validate one known
   query manually against the Horizons web UI/manual before building a parser.
4. **First MVP is geometric/airless unless proven otherwise.** Label the horizon
   exactly that. Terrain-aware horizon/shadow is a stretch feature only after a
   tested LOLA-derived profile is available.
5. **Explain calculations; do not invent them.** Display assumptions such as
   elevation thresholds, time step, Earth-centre visibility choice, and scoring
   weights. Do not have AI create scientific conclusions.
6. **Cite every source.** Keep an in-app source list and a repository README
   source register. Keep an OSI-approved license in the eventual repository.

## Recommended technical approach

Choose the least risky stack already installed and document it. A good fast
architecture is a responsive web app with a static/precomputed data layer:

```
UI controls (site, date, duration)
        ↓
scenario selector / optional backend cache
        ↓
versioned Horizons-derived time series
        ↓
comparison cards + horizon compass + timeline + methodology panel
```

For a polished hackathon demo, data can cover specific bounded date windows and
the UI should plainly identify these as demo scenarios. If building a backend,
cache by `(site, start, duration, step)` and store raw Horizons output alongside
the parsed series.

Suggested data shape:

```ts
type ScenarioPoint = {
  timeUtc: string;
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  earthAzimuthDeg: number;
  earthElevationDeg: number;
};
```

Use `null` rather than fabricated data when a source value is unavailable.

## Recommended build order

1. Inspect the workspace and select the fastest installed frontend stack.
2. Research/cite three sites and create a `data/sites.json` with source URLs,
   coordinates, and a short factual rationale for each.
3. Validate one manual Horizons Sun query and one Earth query. Record exact
   request parameters, raw responses, parser, output units, and timestamp.
4. Produce a small, deterministic scenario dataset for the three sites.
5. Build the static visual shell before polishing: compare cards, one horizon
   compass, and a timeline.
6. Wire controls only to data we actually have; clearly constrain date ranges.
7. Add methodology, citations, and an uncertainty/limitations panel.
8. Add the recommendation rule after its components are visible and testable.
9. Test a complete demo path and record commands/screenshots in the ledger.

## UX guidance

- Lead with one question: **“Which site stays powered and connected longest for
  this landing window?”**
- Put the answer/result above charts, followed by evidence.
- Use a dark lunar interface, but preserve accessibility: high contrast, no
  color-only state, clear units and UTC labels.
- A clean 2D horizon compass plus animation/timeline is more valuable than an
  unfinished 3D globe.
- Include tooltips or a short “Why this matters” explanation for sunlight,
  Earth visibility, and the south-pole geometry.
- Never represent preliminary score as a NASA mission decision.

## Collaboration protocol

- The human is the decision-maker and presenter.
- Codex handles product scope, research review, source validation, UX/pitch,
  and implementation review when present.
- OpenCode should own discrete implementation files/features and avoid editing
  `PROJECT_CONTEXT.md` at the same time as another agent.
- Before work: add an `Active work` row in `PROJECT_CONTEXT.md`.
- After work: append changed paths, source additions, tests, and remaining risk.
- Do not remove prior graphics or unrelated files.

## Immediate next task recommendation

Start with the **research + data slice**, not a broad UI:

> Select and source three candidate lunar south-pole sites; prove a single
> Horizons Sun/Earth observer-table workflow for one site; then commit a small,
> cited data fixture and a short `METHOD.md` explaining it.

This will de-risk the entire project. Only then build the polished comparison UI.

