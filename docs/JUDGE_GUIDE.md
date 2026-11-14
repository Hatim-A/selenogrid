# SelenoGrid — Judge Guide

**What it is:** A browser-based screening workbench for lunar south-pole landing sites. It compares 18 curated points using real LOLA terrain, computed Sun/Earth geometry, and a transparent TOPSIS ranking (a standard multi-criteria scoring method). You can also pin any coordinate south of 80.15°S and sample it live from a 640 m LOLA grid. Static React app; no backend, no API keys, no learned weights.

**One-sentence claim:** For a chosen date and mission length, SelenoGrid shows which sites keep the Sun and Earth above their own terrain horizon, when the next sunset or earthset occurs, and how the ranking changes when you change what matters.

**Mission note:** NASA's 2024 nine-region set is used as a public reference set. NASA redefined Artemis III in 2026 as a low Earth orbit test flight and moved the first crewed south-pole landing to Artemis IV, targeted for 2028.

**Links:** [Live demo](https://hatim-a.github.io/selenogrid/) · [Method](METHOD.md) · [Sources](SOURCES.md). The in-app **Guide** button opens a shorter four-step version.

## 60-second route

Start on the **landing story** (the default view): scroll the hero, the four pinned chapters, and the scrubbed-mission film, then click **Open the mission lab**. In **Compare**, the nine NASA regions are preloaded; open the site library from **Edit sites** to add references, choose **All 18**, or add a live custom coordinate. The order moves from the decision to the evidence.

| # | Step | Do this | What to look for |
| --- | --- | --- | --- |
| 1 | **Scenario bar** | Pick a landing date, a 90-day window, and 3 h sampling; change one control. | *Everyone:* the whole app answers “what if this date and window?” and recomputes in the browser. *Technical:* one sample grid is shared by all sites; percentages are sample fractions, event times are bisection-refined off that grid. |
| 2 | **Decision brief** | Read the winner, its fit score, the three metric chips, and the trade-off panel; then use the leader rows to see the other criteria. | *Everyone:* a shortlist in one glance. *Technical:* “best fit” is TOPSIS under the current weights, not objective truth; the leader rows are single-criterion leaders. Earth visibility is line of sight, not a link budget. |
| 3 | **Site cards** | Scan the 360° horizon panoramas and the sunlight/Earth percentages. | *Everyone:* the jagged line is the local skyline; the Sun and Earth dots show whether they clear it. *Technical:* each panorama is 1,440 horizon bins; markers sit at the start of the window; cards show sampled window percentages and next-event countdowns. |
| 4 | **Detail dialog** | Open a card. Read the horizon and event clock, then switch **Terrain context** from MAP to 3D and drag it. | *Everyone:* the event clock answers “how long until sunset or earthset?” *Technical:* next event from scenario start; the 3D view is a 12 km LOLA tile, 60 m/px, 2.1× vertical exaggeration—visual only. |
| 5 | **Timeline** | Close the dialog, open **Timeline**, press Play, scrub one day, and pause on a transition. | *Everyone:* a good average can hide a bad week. *Technical:* daily heatmap of sampled states; the cursor drives transition cards for the next four events; animation adds no new computation. |
| 6 | **Moon explorer** | Open **Moon**; toggle **3D Moon** and **2D Atlas**, rotate the globe, and hover a marker. Try **Pin mode** or **Custom point**. | *Everyone:* where the sites sit, and why the pole is crowded. *Technical:* the globe texture is NASA SVS CGI Moon Kit context; the 2D atlas is an 80 m LOLA hillshade; curated metrics use 20 m horizons while custom pins use the live 640 m browser grid. |
| 7 | **Decision lab** | Back on **Compare**, drag the slope weight, then try a preset; watch the ranking and Pareto plot. | *Everyone:* there is no single “best” without priorities. *Technical:* four normalized weights; slope is a cost; Pareto is sunlight vs Earth visibility and is weight-independent; scores are relative to the selected set. |
| 8 | **Method** | Open **Method**, scroll the validation table, then the limitations. | *Everyone:* the app states what it does not know. *Technical:* JPL Horizons residuals, error budget, 220 km horizon truncation, and no independent end-to-end illumination validation. |

## Why this is credible

- **Real terrain, not a basemap.** NASA/GSFC LOLA `ldem_80s_20m`: 20 m/pixel, 30,400 × 30,400 samples, 0.5 m per DN, referenced to a 1,737.4 km sphere. Each site gets 1,440 horizon bins at 0.25°, ray-marched to 220 km with exact spherical elevation and lunar curvature.
- **Computed sky, independently checked.** Sun and Moon follow Meeus chapters 25 and 47; lunar orientation is IAU 2009; the Earth direction is topocentric. The residual check is below.
- **Transparent ranking.** Four criteria—sunlight %, Earth visibility %, solar flux proxy, and slope (cost)—are vector-normalized and weighted. Ideal best and worst are explicit; weights are visible and normalized; the Pareto frontier is reported separately. No learned weights.
- **Runs on open data.** The curated dataset is about 1.2 MB and the custom-pin grid is 1.8 MB, so the 1.8 GB DEM is not needed to run the app. No backend or API keys; the terrain pipeline is reproducible from the DEM with `tools/horizon.c` and `tools/build_sites.mjs`.
- **Limits are in the app.** No thermal, power-system, link-budget, delta-v, or human-factors model. The terrain horizon has not been validated against an independent illumination product, and representative points are not landing ellipses.

**JPL Horizons spot check** — Shackleton-area site (89.67°S, 129.78°E, h = 0) on 2026-11-14 at 12:00 UTC. Differences are SelenoGrid minus Horizons:

| Quantity | Residual |
| --- | ---: |
| Sun azimuth | +0.012° |
| Sun elevation | +0.002° |
| Earth azimuth | +0.002° |
| Earth elevation | −0.004° |
| Earth angular diameter | −7.8″ |

The largest direction residual is **0.012°**; typical Sun/Earth direction accuracy is about **0.02°**. This is a spot check, not a formal uncertainty budget: screening accuracy, not flight dynamics.

## What is real vs. what is a visual aid

| Layer | Status | Judge takeaway |
| --- | --- | --- |
| Terrain, horizon, slope | **Real data** | 20 m LOLA elevations and 1,440-bin horizons; a shape product, not a certified hazard map. |
| Sun/Earth geometry and visibility | **Computed; geometry validated** | Meeus/IAU 2009, topocentric Earth; ~0.02° vs JPL Horizons. Visibility adds the terrain horizon; the combined result is not end-to-end validated. |
| 2D atlas | **Real terrain, rendered** | 80 m LOLA south-polar hillshade for context; analysis horizons still use the 20 m DEM. |
| 3D Moon globe texture | **Visual context** | NASA SVS CGI Moon Kit (`lroc_color_2k.jpg`); optimized for aesthetics, not science. It feeds no metric. |
| Site markers | **Representative points** | Chosen terrain points, not official region centres or landing ellipses. A different point in the same region can change the ranking. |
| Local 3D terrain | **Visual aid** | 12 km tile at 60 m/px, 2.1× vertical exaggeration; not a landing simulation or hazard visualization. |
| Custom pin | **Live screening** | 640 m browser grid, 1,440-bin horizon, own Sun/Earth windows and tile; coarser than curated 20 m sites and session-only. |
| TOPSIS score | **Preference-dependent** | Relative to the selected sites and current weights; not a probability, safety margin, or mission recommendation. |
| Timeline heatmap | **Visualization of computed samples** | Inherits the time step and visibility rule; it is not an independent calculation. |

## Challenge mapping

| Challenge objective | Where it is covered | Honest status |
| --- | --- | --- |
| Curated sites + custom coordinates | 18 points: nine NASA regions plus nine literature/science/PSR references; live custom pin south of 80.15°S | The UI ships the curated set and samples custom pins live from a 640 m LOLA browser grid. The offline 20 m pipeline is still available for high-resolution additions. |
| Multi-site comparison | Compare cards, ranking table, Pareto plot | Up to 18 curated sites plus custom pins; scores are relative to the selected set. |
| Flexible dates and times | Scenario bar | Any date 2024–2035; start time 00/06/12/18 UTC; 30/90/180/365-day windows; 1/3/6 h sampling. |
| Sun/Earth horizon positions | 360° panoramas, sky tracks | Sun and Earth markers plotted against the local terrain horizon at 0.25° bins. |
| Time to sunset/earthset | Detail event clock, Timeline transitions | Next event after the scenario start, refined by bisection; “Beyond window” when none occurs. |
| Power/comm metrics | Sunlight %, flux proxy, longest Sun window; Earth visibility %, longest Earth window | Screening proxies, not power sizing or a communications link budget. |
| 2D maps and 3D visuals | 2D atlas, horizon panoramas, hillshade; 3D globe and local terrain | Globe is a locator; local terrain is a visual aid; numbers come from the 2D terrain model. |
| Temporal animation | Timeline heatmap with play and scrub; transition cards below | Animates sampled daily summaries; it does not add a new simulation. |
| Accessibility for experts/public | Plain-language brief and units; Method formulas and assumptions; keyboard/focus/reduced-motion and non-color encoding support | One interface with layered detail, not a public/expert toggle; not formally WCAG-certified. |

## Five questions judges may ask

**Is this just a map?**
No. A map shows where the terrain is; SelenoGrid computes whether the Sun and Earth clear each site’s own 360° horizon for a chosen date and mission length, then turns that into visibility percentages, event times, and a weighted ranking. The Moon explorer is an entry point; the time-dependent comparison is the product.

**Why TOPSIS?**
It handles mixed units, is transparent, and has precedent in the Artemis site-selection literature. Every step—normalization, weights, ideal best/worst, closeness—is visible, and the Pareto view exposes the trade-off a single score compresses. It is a shortlist aid, not a claim of optimality.

**How accurate is it?**
At a Shackleton-area site, the largest Sun/Earth direction residual against JPL Horizons was 0.012°, with about 0.02° typical. That is screening accuracy, not flight dynamics; the terrain horizon is a separate error source at 20 m DEM resolution and 0.25° bins. The combined terrain-plus-ephemeris visibility has not yet been checked against an independent illumination product.

**Why not ML?**
There is no labelled ground truth of successful south-pole landings, so training on 18 points or synthetic labels would be less honest than explicit geometry. The hard part here is data provenance and terrain/geometry, not classification. ML could later calibrate weights or emulate high-fidelity illumination, but only with validation data we do not have.

**What is next?**
Validate the 640 m custom-pin path against independent illumination products and add an optional high-resolution 20 m custom pipeline for shortlisted coordinates. Validate the combined terrain-plus-ephemeris visibility against ShadowCam or other illumination products. Add thermal, power, and link-budget models, plus a sensitivity sweep over points and weights.

## Three things this is not

- **Not a public/expert mode toggle.** There is one interface; it puts the plain-language summary first and the numbers, units, formulas, and assumptions one layer down.
- **Not a 20 m custom analysis.** Custom pins use a 640 m browser grid. They are screening points; the curated sites use 20 m horizons. A high-resolution custom point still requires the offline pipeline.
- **Not analysis-grade 3D.** The globe is a locator and the local terrain view is a perspective aid; every quantitative result comes from the 2D LOLA horizons and ephemeris.

> **Bottom line:** use SelenoGrid to shortlist a site for a date window, teach the trade-off, or sanity-check a higher-fidelity study—not to certify a landing.
