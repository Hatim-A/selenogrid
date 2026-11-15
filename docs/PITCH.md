# SelenoGrid Pitch

**Event:** NASA Space Apps Challenge Meknes 2026. **Format:** 5 minute pitch + 2 minute jury Q&A (updated by organizers; was 3 + 2). Required beats: the problem, your solution, NASA data you used, demo, impact and next steps. **Project:** SelenoGrid, solo entrant.

**Pacing:** about 1 minute per slide. Slides 1 and 2 carry the story, slide 3 carries the proof, slide 5 lands the close. Keep one live demo beat inside slide 2 (move a weight slider, watch the rank move) with the submitted deck open in a second tab as backup. Rehearse with a timer.

The through-line: a south-pole landing site is a time-dependent decision, and the public tools do not make that decision legible. SelenoGrid does, with real LOLA terrain, validated Sun/Earth geometry, and an OR layer the user can inspect and change.

## Slide 1 | A landing site is a schedule, not a pin

**Title:** A landing site is a schedule, not a pin

- NASA announced nine candidate regions near the lunar south pole in October 2024. It did not publish official region centres or landing ellipses.
- Every site trades four things: sunlight for power, Earth visibility for direct communications, terrain for landing and mobility, and time to the next sunset or earthset.
- Those trade-offs change with the date, the mission length, and the local horizon. A static map cannot answer "which site, for this window?"
- Public tools tend to show one site at a time, or one variable at a time. Comparing 18 sites across dates is manual, slow, and hard to explain.
- The gap is decision support: a transparent way for engineers and the public to see the same trade and argue about the weights.

**Speaker note:** Do not open with "we built a dashboard." Open with the scheduling problem.

## Slide 2 | What SelenoGrid does

**Title:** One screen, 18 curated sites, any date

- A scenario bar sets the start date, duration (30, 90, 180, or 365 days), and time step (1, 3, or 6 hours). Everything recomputes.
- **Compare** shows up to 18 curated site cards with 360 degree horizon panoramas, sunlight and Earth visibility percentages, longest windows, next sunset and earthset, slope, and relief. Any custom coordinate south of 80.15°S can be added and sampled live.
- A detail dialog exposes the full numbers and assumptions, including an interactive 3D perspective of the local 12 km terrain tile. A ranking table and Pareto plot show the decision layer.
- **Timeline** turns the same data into a daily heatmap with a play control and event markers.
- **Moon** puts the sites on an interactive 3D lunar globe, with a 2D south-polar atlas one click away. **Method** shows the formulas, validation, and limitations. Each view pairs plain-language summaries with the technical detail rather than hiding the data.
- An in-app **30-second guide** and an answer-first **Decision brief**: winner, fit score, three leaders, and a plain-English trade-off, make the first minute legible without dumbing down the method.

**Speaker note:** If time is short, demo Compare and Timeline, then show the weight sliders. The other views are supporting evidence.

## Slide 3 | Built on real data, checked against Horizons

**Title:** Real terrain, real geometry, stated accuracy

- Terrain comes from the NASA/GSFC LRO LOLA south polar DEM: 20 m/pixel, 30,400 x 30,400, int16, 0.5 m per DN, 1,737.4 km sphere, no-data `-32768`.
- Each site gets a 1,440-bin terrain horizon. Rays march to 220 km with exact spherical elevation angles, including lunar curvature. Slope, aspect, open-sky fraction, and relief come from the same DEM.
- Sun and Moon positions use Meeus chapters 25 and 47. Lunar orientation uses the IAU 2009 mean-Earth/polar-axis model. Earth direction is topocentric.
- Validation at a Shackleton-area site: Sun azimuth differs from JPL Horizons by 0.012 degrees, Earth azimuth by 0.002 degrees, Earth angular diameter by 7.8 arcsec.
- Typical accuracy is about 0.02 degrees. That is fit for comparative screening, not flight dynamics.

**Speaker note:** Say the number and the caveat in the same breath. The caveat is what makes the number credible.

## Slide 4 | Transparent OR, not a black box

**Title:** The ranking is a preference, and you can see it

- Four criteria: sunlight percentage, Earth visibility percentage, mean solar flux proxy, and slope as a cost criterion.
- TOPSIS vector-normalizes the criteria, applies user weights, finds an ideal best and worst, and computes a closeness coefficient. Every step is in the Method view.
- The Pareto frontier shows sunlight versus Earth visibility. A site on the frontier is not dominated on both; a site off it is.
- Slope is deliberately a cost, not a benefit. A steep site should not win because it happens to be bright.
- No learned weights, no hidden model. The user can change the weights and watch the rank move. The tool reports when the result is sensitive.

**Speaker note:** This is the answer to "why not ML?" before the judge asks it: there is no labelled ground truth of successful south-pole landings.

## Slide 5 | From hackathon to decision support

**Title:** A screening layer, not a certification

- Use it to shortlist sites for a date window, teach the south-pole trade-off, or sanity-check a higher-fidelity study.
- Next: validate the 640 m custom-pin path against independent illumination products, add high-resolution 20 m custom points for shortlisted coordinates, and add thermal, power, and link-budget models.
- The current limits are explicit: no thermal model, no power sizing, no delta-v, no human factors, no landing ellipses, and representative points rather than official sites.
- The engineering bet is that transparency beats a single score. The data is open, the math is inspectable, and the app runs as a static site with no backend.
- Ask: pilot it with a lunar site-selection or education team, and help us turn the screening layer into a validated comparison tool.

**Speaker note:** End on the limit, not the hype. "Not a certification, a better first question" is the line.

## 30-second spoken version

> NASA has nine candidate regions near the lunar south pole, but a site is not a dot on a map. It is a schedule: when the Sun is up, when Earth is in view, how steep the ground is, and when the next sunset cuts the mission. SelenoGrid compares 18 curated sites on one screen using real 20-metre LOLA terrain and Sun/Earth geometry checked against JPL Horizons, and you can pin any custom coordinate. A plain-English verdict gives the shortlist, a 3D Moon shows where the sites are, and the weight sliders show why the ranking moves. It is transparent, reproducible, and built for engineers and the public. Not a landing certification. A better first question.

## Judge Q&A prep

### 1. Is this just a prettier map?

No. A map shows where the terrain is. SelenoGrid computes when a site can see the Sun and Earth above its own 360 degree horizon, for a chosen date and duration, and turns that into windows, event times, and a ranking. The map is one view. The product is the time-dependent comparison.

### 2. Why TOPSIS?

Because it is transparent, handles mixed units, and matches the published Artemis site-selection precedent (Peña-Asensio et al., 2024/2025). It produces a closeness score relative to an explicit ideal best and worst, and every step can be shown in the UI. It is not a claim of optimality. We expose the weights and the Pareto frontier so the user can see that the rank is a preference.

### 3. How accurate is it?

At a Shackleton-area site on 2026-11-14, Sun azimuth differs from JPL Horizons by 0.012 degrees, Earth azimuth by 0.002 degrees, and Earth angular diameter by 7.8 arcsec. Typical accuracy is about 0.02 degrees. That is screening accuracy, not flight dynamics. The terrain horizon is a separate error source: 20 m DEM, 0.25 degree bins, 30 to 120 m ray sampling, and no independent illumination validation yet.

### 4. Why not ML?

There is no labelled dataset of successful south-pole landings. Training on 18 points or synthetic labels would be less honest than a transparent multi-criteria method. The hard part here is geometry and data provenance, not classification. ML could later calibrate weights or emulate high-fidelity illumination, but it would need validation data we do not have.

### 5. What is novel?

Not the physics and not TOPSIS. The combination is the contribution: real 20 m LOLA terrain horizons, topocentric Sun/Earth geometry, time-to-event metrics, adjustable weights, a Pareto view, and plain-language explanations next to expert numbers, all client-side and reproducible from open data. Most public tools show static maps or single-site illumination. SelenoGrid makes the trade-off legible and arguable.

### 6. How would you validate it?

Three levels. First, astronomy against JPL Horizons, which we have done. Second, combined terrain-plus-ephemeris visibility against independent illumination products, ShadowCam observations, or published per-site time series. Third, sensitivity analysis: resample the DEM, perturb the representative points, and sweep the weights to see how often the ranking changes. A flight use would also need formal uncertainty propagation and hazard data at higher resolution.

### 7. What about Artemis III being an LEO demo?

NASA redefined Artemis III in 2026 as a low Earth orbit test flight and moved the first crewed south-pole landing to Artemis IV, targeted for 2028. That makes the site-selection question more relevant, not less. SelenoGrid is mission-agnostic: the same illumination, communications, and terrain trade applies to Artemis IV, CLPS landers, and future south-pole missions. We use the 2024 nine-region set as a public reference set, not as a claim about the current manifest.

### 8. Can it handle custom coordinates?

Yes. The app ships 18 curated sites, and the Moon explorer and Compare page let you pin any coordinate south of 80.15°S. The custom point is sampled live in the browser from a 640 m LOLA south-polar grid: elevation, slope, 1,440-bin horizon, Sun/Earth windows and a local 3D tile are recomputed locally. That is a screening point, deliberately lower resolution than the 20 m curated sites. A high-resolution custom point still goes through the offline 20 m pipeline (`tools/horizon.c` + `tools/build_sites.mjs`). We expose both boundaries instead of hiding them.

## If a judge pushes on the weakest point

The weakest point is not the astronomy. It is the terrain-to-visibility validation. Say so directly: "The astronomy is checked against Horizons. The combined terrain-plus-ephemeris visibility is not yet checked against an independent illumination product. That is the next validation, and it is why we call this a screening aid." Then explain that the pipeline is reproducible and the limitation is in the app, not buried in a paper.
