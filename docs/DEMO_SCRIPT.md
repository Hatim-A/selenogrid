# SelenoGrid Demo Script

**Target length:** 3:00 of live demo inside the 5-minute pitch. **Format:** live screen share with spoken narration. **Audience:** NASA Space Apps judges and a general stream audience.

**Run of show (5:00 + 2:00 Q&A):** 0:00 to 0:45 hook and problem (PITCH.md slide 1), 0:45 to 3:45 this demo script, 3:45 to 4:45 validation beat plus close (slides 3 and 5), 4:45 to 5:00 buffer. If the live demo fails at any point, play `docs/demo-30s.mp4` and keep narrating.

## Before recording

- Open the app in a clean browser window at 1440 x 900, zoom 100 percent. Hide bookmarks and notifications.
- Set the scenario to **2026-11-14 12:00 UTC**, **90 days**, **3 hour step**. Let the first computation finish completely.
- Open the app on the **landing story** (default view). For a cold open, scroll the hero and film, then click **Open the mission lab**. To skip straight to the tool, open `?view=compare`. In **Compare**, nine NASA sites are preloaded. Close the detail dialog and any popovers. Close the 30-second guide if it is open.
- Open a second tab with the same scenario already computed. This is the backup, not the primary.
- Have a static screenshot of the Compare ranking and the Pareto plot ready in a third tab.
- Do not refresh during the demo. Do not change the date unless the live compute is fast and you have rehearsed it.
- Check that the projector or stream can read the smallest labels. If not, zoom the browser to 110 percent before recording.

## 0:00 to 0:20 | Hook: the problem

**On screen:** Compare view at the top. Scroll past the hero to the scenario bar; nine NASA sites are preloaded. Click **See the ranking** once to show the answer-first jump, then return to the scenario bar. The header **Guide** button opens the same route for judges.

**Narration:**

> NASA has nine candidate regions near the lunar south pole. But a landing site is not a dot on a map. It is a schedule: when the Sun is up, when Earth is in view, how steep the ground is, and when the next sunset cuts the mission. SelenoGrid puts those trade-offs on one screen: scenario first, then the answer, then the evidence.

**Do not:** open with the tech stack. Open with the decision.

## 0:20 to 0:55 | Compare sites

**On screen:**

1. Point to the scenario bar: **2026-11-14**, **90 days**, **3 h**.
2. Scroll to the **Decision brief**. Read the best-fit site, score, and one-sentence trade-off.
3. Click the **Malapert Massif** card.
4. In the detail dialog, point to the 360 degree horizon panorama, then the sunlight and Earth visibility percentages, then the next sunset and next earthset values.
5. Point to the local slope and horizon relief. Toggle **3D** in Terrain context and drag the surface once.
6. Close the dialog.

**Narration:**

> Here is the scenario bar: date, a 90-day mission, and a three-hour step. Every card is one site. I'll open Malapert Massif. The horizon panorama is the actual 360-degree terrain profile from 20-metre LOLA data. The card shows sunlight and Earth visibility percentages, the longest continuous windows, and the next sunset and earthset. Malapert has a very low slope and a wide sky, but look at the horizon: terrain still controls the exact event times. Close the dialog, and every card stays comparable.

**If the dialog is slow:** keep the card visible and narrate the same numbers from the card summary. Do not wait in silence.

## 0:55 to 1:30 | Timeline and animation

**On screen:**

1. Click the **Timeline** tab.
2. Point to one row and explain that it is one site.
3. Point to a bright block, then a dark block.
4. Press **Play**. Let the animation run for about five seconds.
5. Pause on a visible transition. Point to the event clock below the chart.
6. Scrub one day forward and back.

**Narration:**

> The Timeline view turns the same numbers into time. Each row is a site, each column is a day. Bright cells are sunlit or Earth-visible; dark cells are not. Press play and the scenario animates. The event clock below the chart is the refined next sunset, sunrise, earthset, or earthrise. This is where a good average can hide a bad week. A site with 70 percent sunlight can still lose the Sun right when the crew needs it. Scrub to the transition and the event clock updates.

**If animation is slow:** leave it paused, point to two adjacent days, and say: "The same transition is visible in the static heatmap; play is a convenience, not the calculation."

## 1:30 to 2:05 | OR ranking and Pareto

**On screen:**

1. Click **Compare**. Scroll to the ranking table and Pareto plot.
2. Point to the four weights: sunlight, Earth visibility, solar flux, slope.
3. Drag the **Slope** weight to the right. Let the ranking update.
4. Point to a site that moved, then point to the Pareto frontier.
5. Point to a dominated site off the frontier.

**Narration:**

> Now the decision layer. The ranking uses four criteria: sunlight, Earth visibility, solar flux, and slope as a cost. TOPSIS normalizes them, compares each site to an ideal best and worst, and produces a closeness score. I can change what matters. Watch the rank move when I put more weight on slope. The Pareto plot is the check: sunlight versus Earth visibility, with dominated sites off the frontier. No single score is the answer. The weights are a preference, and you can see them.

**If the rank does not visibly change:** say: "This scenario is not sensitive to that weight, which is itself useful. The Method view shows the per-criterion distances so we can see why." Do not claim a change that did not happen.

## 2:05 to 2:40 | Atlas, Method, validation

**On screen:**

1. Click **Moon**. Drag the 3D globe once, hover two or three markers, then click a marker. Switch to **2D Atlas** for one beat, then back.
2. Open the **Method** view. Scroll to the validation table.
3. Point to the Sun and Earth residuals.
4. Scroll to the limitations list. Point to "no thermal model" and "representative points, not ellipses."
5. Point to the plain-language summary and the TOPSIS formula block.

**Narration:**

> The Moon view puts the points back on a real lunar globe. The reference sites, including Shackleton, Amundsen and the PSR floors, give the NASA regions a familiar comparison. The globe texture is NASA's LROC color map, but every curated number still comes from the 20-metre terrain model. You can also pin a custom coordinate and sample the 640-metre grid live. Open Method and the whole calculation is here: the DEM contract, the horizon geometry, the limb rule, and the validation. Against JPL Horizons, Sun and Earth directions agree to about one hundredth of a degree. That is screening accuracy, not flight dynamics. The limitations are listed in the same view, including what the model does not do. The method is written in plain language, then in formulas.

**If the Atlas is slow:** use the site cards and say: "The Atlas is a spatial index; the same data is in the cards." Do not skip the validation table.

## 2:40 to 3:00 | Close

**On screen:** Return to **Compare**. Wide shot of the cards and the ranking. Cursor rests. Do not scroll.

**Narration:**

> SelenoGrid is a transparent screening layer for the south pole: real LOLA terrain, real Sun and Earth geometry, and an OR ranking you can inspect and change. Not a landing certification. A better first question. Thank you.

## Backup line if live compute is slow

Use this only if the app is visibly computing and you need to keep the demo moving:

> The browser is recomputing 18 sites across ninety days. While that finishes, here is the same scenario precomputed.

Then switch to the pre-warmed backup tab or the static screenshot. Say that it is precomputed. Do not claim it is live. If a control stalls for more than two seconds, keep narrating the method and move to the next section rather than refreshing.

## Timing discipline

| Time | Section | Hard stop |
| --- | --- | --- |
| 0:00 | Hook | 0:20 |
| 0:20 | Compare | 0:55 |
| 0:55 | Timeline | 1:30 |
| 1:30 | OR ranking and Pareto | 2:05 |
| 2:05 | Atlas, Method, validation | 2:40 |
| 2:40 | Close | 3:00 |

If you are running long, cut the Atlas hover, not the validation table. The validation is the credibility beat.
