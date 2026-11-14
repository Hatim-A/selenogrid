# SelenoGrid Method

This document describes exactly how SelenoGrid turns a lunar digital elevation model and a date into site metrics, visibility windows, and an explainable ranking. It is written to be checked, not trusted. The implementation lives in `src/lib/astro.ts`, `src/lib/metrics.ts`, and the offline terrain pipeline in `tools/horizon.c` and `tools/build_sites.mjs`.

The method is a screening method. It is not a flight dynamics model, a power system design, a communications link budget, or a landing hazard assessment.

## 1. Scope
SelenoGrid answers comparative questions of the form:

- For a given start date and mission duration, which sites keep the Sun above their local terrain horizon most often?
- Which sites keep the Earth above the terrain horizon, and for how long?
- When are the next sunset, sunrise, earthset, and earthrise?
- How do terrain slope and horizon relief change the trade?
- How does the ranking change when the user changes the relative importance of sunlight, communications, solar flux, and slope?

It does not answer whether a site is safe to land on, whether a lander can reach it, whether a power system survives the night, or whether a radio link closes. Those require models and data that are outside this build.

## 2. Coordinate frames and elevation data
### 2.1 Selenographic body-fixed frame
A site is specified by planetocentric latitude $\phi$ (degrees, negative in the southern hemisphere), east longitude $\lambda$ (degrees), and elevation $h$ above the 1,737.4 km reference sphere. The body-fixed position vector is

$$
\mathbf{p} = (R_m + h)
\begin{bmatrix}
\cos\phi \cos\lambda \\
\cos\phi \sin\lambda \\
\sin\phi
\end{bmatrix},
\qquad R_m = 1737.4\ \text{km}.
$$

This is a spherical Moon. The DEM is a shape product referenced to that sphere, not an ellipsoid or a geoid.

### 2.2 DEM ingestion
The terrain product is `ldem_80s_20m` from the NASA/GSFC LOLA team, distributed by the PDS Geosciences Node. Its label gives 30,400 x 30,400 samples at 20 m spacing, 16-bit signed little-endian integers, $h = \mathrm{DN} \times 0.5$ m relative to a 1,737.4 km sphere, no-data `-32768`, and a spherical polar stereographic projection covering 80 degrees south to the pole.

The inverse projection used by the C extractor is

$$
\rho = 2 R_m \tan\left(\frac{90^\circ + \phi}{2}\right),
\qquad
x = \rho \sin\lambda,
\qquad
y = \rho \cos\lambda,
$$

with row and column coordinates

$$
\mathrm{row} = 15199.5 - \frac{y}{20},
\qquad
\mathrm{col} = 15199.5 + \frac{x}{20}.
$$

Here $x$ is positive toward the 90 degrees east meridian and $y$ is positive toward the 0 degrees meridian, matching the product's polar stereographic layout. Bilinear interpolation is used between the four surrounding pixels. If any of the four pixels is no-data, the sample is rejected rather than filled. This avoids inventing terrain at the edge of a data gap, but it can create small gaps in the horizon sampling near no-data pixels.

The DEM is a shape model: it stores radius relative to a sphere. The `elevationM` values in SelenoGrid are heights above that sphere, not orthometric heights above a geoid.

### 2.3 J2000 equatorial frame and lunar orientation
The Sun and Moon vectors are computed in the ecliptic frame of date, precessed back to J2000, and rotated into the J2000 mean equatorial frame using the mean obliquity $\varepsilon_0 = 23.4392911^\circ$.

The lunar body-fixed-to-J2000 rotation is the IAU 2009 mean-Earth/polar-axis model:

$$
\mathbf{R}(t) =
\mathbf{R}_z(\alpha_0 + 90^\circ)\,
\mathbf{R}_x(90^\circ - \delta_0)\,
\mathbf{R}_z(W),
$$

where

$$
\begin{aligned}
\alpha_0 &= 269.9949^\circ + 0.0031^\circ T - 0.0028^\circ T^2 + \sum_i A_i \sin E_i,\\
\delta_0 &= 66.5392^\circ + 0.0130^\circ T - 0.0017^\circ T^2 + \sum_i B_i \cos E_i,\\
W &= 38.3213^\circ + 13.17635815^\circ d - 1.4\times10^{-12} d^2 + \sum_i C_i \sin E_i.
\end{aligned}
$$

Here $T$ is Julian centuries from J2000, $d$ is days from J2000, and the 13 periodic terms use the standard IAU arguments. The model includes the 18.6-year precession of the lunar pole and the dominant physical librations. No additional numerical libration model is applied. The DEM label identifies its coordinate system as the mean Earth/polar axis of DE421, which is the same class of frame at the accuracy needed here.

### 2.4 Local horizon frame
At a site, the local basis is

$$
\mathbf{u} = \begin{bmatrix}\cos\phi\cos\lambda\\ \cos\phi\sin\lambda\\ \sin\phi\end{bmatrix},
\quad
\mathbf{e} = \begin{bmatrix}-\sin\lambda\\ \cos\lambda\\ 0\end{bmatrix},
\quad
\mathbf{n} = \begin{bmatrix}-\sin\phi\cos\lambda\\ -\sin\phi\sin\lambda\\ \cos\phi\end{bmatrix}.
$$

For a unit direction $\mathbf{d}$, elevation and azimuth are

$$
el = \arcsin(\mathbf{d}\cdot\mathbf{u}),
\qquad
az = \operatorname{atan2}(\mathbf{d}\cdot\mathbf{e},\ \mathbf{d}\cdot\mathbf{n}).
$$

Azimuth is measured from north toward east, in the range $[0^\circ, 360^\circ)$. Elevation is positive above the local horizontal.

## 3. Ephemeris
### 3.1 Time
Timestamps are parsed as UTC and converted to a Julian Date with

$$
\mathrm{JD} = \frac{t_{\mathrm{Unix\ ms}}}{86400000} + 2440587.5.
$$

The model treats UTC as Terrestrial Time. The difference $\mathrm{TT} - \mathrm{UTC}$ is about 69 s in 2026. The Moon moves roughly 0.55 arcsec per second as seen from Earth, so this simplification is worth about 0.01 degrees in lunar direction, comparable to the stated accuracy target. It is included in the error budget, not hidden.

### 3.2 Sun
The Sun follows Meeus, *Astronomical Algorithms*, chapter 25, low-precision solar coordinates. The model computes the geometric mean longitude, mean anomaly, equation of centre, true longitude, radius vector, and the apparent longitude correction for nutation and aberration. The result is a geocentric ecliptic longitude and distance. The Sun is treated as a point source at that position for direction purposes; its finite distance is used for the angular radius.

Typical solar direction accuracy is about 0.01 degrees over the supported date range.

### 3.3 Moon
The Moon follows Meeus chapter 47, the truncated ELP-2000/82 series: 60 longitude and radius terms, 60 latitude terms, the eccentricity correction factors, and the additive corrections. The result is the geocentric ecliptic longitude, latitude, and distance of the Moon.

The Moon's geocentric position is used to place the Moon's centre in J2000. The site vector is then rotated into the same frame. This yields a topocentric direction from the site to the Sun and to the Earth, rather than a geocentric direction.

### 3.4 Earth
The Earth is at the origin of the J2000 frame. In the lunar body-fixed frame, the vector from the site to the Earth's centre is

$$
\mathbf{r}_{E} = -\left(\mathbf{R}^{T}\mathbf{r}_{m} + \mathbf{p}\right),
$$

where $\mathbf{r}_{m}$ is the Moon's geocentric J2000 position and $\mathbf{p}$ is the site's body-fixed position. The negative sign is important: the vector points from the site toward the Earth, not from the Earth toward the site.

The Earth's angular radius is

$$
\rho_E = \arcsin\left(\frac{R_E}{|\mathbf{r}_E|}\right),
\qquad R_E = 6371\ \text{km}.
$$

The Sun's angular radius is computed the same way with $R_\odot = 696000$ km. At the Moon, the Sun's angular radius is about 0.27 degrees. The Earth's angular radius is about 0.9 to 1.0 degrees depending on the Earth-Moon distance.

### 3.5 What is not modelled
The ephemeris does not apply light-time iteration, relativistic light deflection, annual aberration for the Moon, or a full JPL DE ephemeris. It uses a simplified precession correction: the general precession in ecliptic longitude is subtracted before rotating with the J2000 obliquity. These approximations are acceptable at the 0.02 degree screening level, but they are not a substitute for a flight dynamics ephemeris.

## 4. Terrain horizon
### 4.1 Ray march
For each site, the extractor marches 1,440 azimuth bins, one every 0.25 degrees. Along each azimuth it follows a great circle from the site, starting at 20 m and ending at 220 km. The step is 30 m below 30 km, 60 m from 30 to 80 km, and 120 m beyond 80 km.

At each step it computes the spherical destination,

$$
\phi_2 = \arcsin\left(\sin\phi_1 \cos\delta + \cos\phi_1 \sin\delta \cos az\right),
$$

$$
\lambda_2 = \lambda_1 + \operatorname{atan2}\left(\sin az \sin\delta \cos\phi_1,\ \cos\delta - \sin\phi_1 \sin\phi_2\right),
$$

where $\delta = s/R_m$ is the central angle for surface distance $s$. It then samples the DEM at that latitude and longitude.

### 4.2 Exact elevation angle with curvature
For a target at surface distance $s$ and elevation $h$, seen from a site at elevation $h_0$, the elevation angle is

$$
el(s) = \operatorname{atan2}\left(
(R_m + h)\cos\left(\frac{s}{R_m}\right) - (R_m + h_0),
\ (R_m + h)\sin\left(\frac{s}{R_m}\right)
\right).
$$

This is exact spherical geometry, not the small-angle approximation $h/s$. The curvature term matters at polar scales: at 100 km, the surface drops about 2.9 km below the tangent plane. Using a flat-plane horizon would produce systematically wrong blocking angles.

### 4.3 Horizon profile
For each azimuth bin $b$,

$$
H_b = \max_{s \in \mathcal{S}_b} el(s),
$$

where $\mathcal{S}_b$ is the set of valid DEM samples along that ray. The extractor also stores the distance $d_b$ of the sample that produced the maximum. The shipped profile is a 1,440-element array in degrees, plus a 1,440-element array of distances in kilometres.

At runtime, the horizon at an arbitrary azimuth is linearly interpolated between adjacent bins:

$$
H(az) = (1-f) H_b + f H_{b+1},
\qquad
b = \left\lfloor \frac{az}{0.25^\circ} \right\rfloor,
\quad
f = \frac{az}{0.25^\circ} - b.
$$

The interpolation wraps at 360 degrees. A 0.25 degree bin is about 1 km wide at the 220 km limit, so the interpolation smooths the horizon at that scale. It does not add terrain detail below the bin size.

### 4.4 Slope and aspect
Slope is computed from a local plane fit at eight azimuths and two radii, 500 m and 1,000 m. With eastward and northward offsets $e_i$ and $n_i$, and height differences $dz_i = h_i - h_0$, the independent least-squares gradients are

$$
a = \frac{\sum_i e_i\,dz_i}{\sum_i e_i^2},
\qquad
b = \frac{\sum_i n_i\,dz_i}{\sum_i n_i^2}.
$$

The slope and downslope aspect are

$$
\text{slope} = \arctan\left(\sqrt{a^2+b^2}\right),
\qquad
\text{aspect} = \operatorname{atan2}(-a,\ -b).
$$

This is a local 1 km support, not the slope of an official landing ellipse. A site can have a low point slope and still contain hazardous terrain nearby.

### 4.5 Open-sky fraction
For a horizon elevation $H$ in a narrow azimuth strip, the fraction of the hemisphere above the horizon is $(1-\sin H)/2$. The extractor averages this over all 1,440 bins:

$$
F_{\text{open}} = \frac{1}{1440}\sum_{b=1}^{1440} \frac{1-\sin H_b}{2}.
$$

The result is a dimensionless number between 0 and 1. It describes how much of the sky is unobstructed by terrain, not how much sunlight reaches the site.

### 4.6 Terrain tile
The extractor also produces a 200 x 200 tile centred on each site, with 60 m pixels and a 12 km span. The tile stores height, min-max stretched to 8 bits, encoded as base64 in `public/data/sites.json`. The browser can render it as shaded relief or as an interactive perspective surface. The 3D view uses the same 8-bit heights, resampled to 100 x 100 vertices, with a vertical exaggeration of 2.1 for legibility; drag rotates the view. The tile is a locator and context image, not a hazard map.

The Moon explorer globe uses the NASA SVS CGI Moon Kit 2K color texture (`lroc_color_2k.jpg`, centered on 0° longitude) for global context only. Site markers are placed from the same representative latitude and longitude as every other view. The globe texture does not feed any metric; all computed values still come from the 20 m LOLA horizons and ephemeris. Credit: NASA Scientific Visualization Studio / LROC WAC.

### 4.7 Truncation and gaps
The 220 km limit is a design choice. It captures the terrain that dominates the local horizon for these sites, but distant high relief beyond 220 km is not sampled. No formal truncation test has been performed. Near no-data pixels, the bilinear sampler rejects the sample, so a ray can skip a small patch rather than interpolate across it. The horizon is the maximum of the valid samples, so a rejected sample cannot create a false high ridge, but it can miss a real one.

## 5. Visibility rule
A body is visible when its upper limb is above the terrain horizon:

$$
el_{\text{center}}(az) + \rho > H(az),
$$

where $\rho$ is the body's angular radius. For the Sun, $\rho \approx 0.27^\circ$. For the Earth, $\rho \approx 0.9^\circ$ to $1.0^\circ$.

The rule is **permissive about declaring a site dark**: a site is marked Sun-dark or Earth-dark only when the entire disk is below the terrain. This is useful for screening because it avoids false negatives at the edge of a window. It can also overstate usable solar power and link quality when only a small part of the disk is exposed. The method therefore reports the rule explicitly and treats percentages as an upper bound on clear-disk availability, not a power or data-rate guarantee.

The solar flux proxy makes part of this conservative: if the Sun's centre is below the horizon, the proxy is zero even when the upper limb is visible. That prevents a grazing limb from producing a positive flux value. It does not model the partial disk, limb darkening, or incidence angle on a tilted array.

## 6. Scenario sampling and metrics
### 6.1 Sample grid
A scenario has a start instant $t_0$, a duration $D$ in days, and a step $\Delta t$ in hours. The number of intervals is

$$
N_{\text{int}} = \operatorname{round}\left(\frac{D \cdot 86400000}{\Delta t \cdot 3600000}\right),
$$

and the number of samples is $N = N_{\text{int}} + 1$. The sample times are $t_i = t_0 + i\Delta t$ for $i=0,\dots,N_{\text{int}}$. The default step is 3 hours; the UI also offers 1 and 6 hours.

The ephemeris and lunar orientation are evaluated once per timestep and shared across all sites. The per-site work is the local projection, horizon lookup, and visibility test. This is why 12 sites remain interactive in the browser.

### 6.2 Sunlight and Earth visibility percentages
$$
\text{sunlightPercent} = \frac{100}{N}\sum_{i=1}^{N} \mathbf{1}[\text{Sun visible at } t_i],
$$

$$
\text{earthPercent} = \frac{100}{N}\sum_{i=1}^{N} \mathbf{1}[\text{Earth visible at } t_i].
$$

These are sample fractions, not integrals. With uniform sampling they approximate the fraction of time in the window. They are quantized by the step: one sample is $100/N$ percentage points. For 30 days at 3 hours, $N=241$, so one sample is about 0.42 percentage points. For 365 days at 6 hours, $N=1461$, so one sample is about 0.068 percentage points.

A visibility window shorter than the step can fall entirely between samples and be missed. The percentages should be read with that in mind.

### 6.3 Solar flux proxy
The normalized flux proxy is

$$
f_i =
\begin{cases}
\max(0,\ \sin el_i), & \text{if the Sun is visible at } t_i,\\
0, & \text{otherwise},
\end{cases}
\qquad
\text{fluxMean} = \frac{1}{N}\sum_{i=1}^{N} f_i.
$$

This is a geometric proxy in $[0,1]$, not irradiance in W/m². It ignores the Earth-Sun distance correction, limb darkening, atmospheric extinction (there is no atmosphere), albedo, and the orientation of a solar array. It is useful for ranking sites under the same simplified assumption, not for sizing a power system.

### 6.4 Continuous windows
A window is a maximal run of consecutive samples with the same visibility state. The run start and end are placed at the midpoints between the last hidden sample and the first visible sample, and between the last visible sample and the first hidden sample. This avoids claiming a transition exactly at a sample time.

A window is marked `clipped` when it touches the start or end of the scenario. A clipped window may continue outside the simulated interval. The longest Sun and Earth windows are the maximum durations in the scenario.

Because window edges are sample midpoints, their uncertainty is up to one half-step on each side, or one full step in duration. At the default 3 hour step, a longest-window duration has up to about 3 hours of edge uncertainty. Event times, described next, are refined separately.

### 6.5 Event refinement
For each site, the engine scans the sample states for the first transition of each type:

- Sun visible to hidden: next sunset.
- Sun hidden to visible: next sunrise.
- Earth visible to hidden: next earthset.
- Earth hidden to visible: next earthrise.

The bracketing samples define an interval. The engine bisects that interval for 18 iterations using the full ephemeris and horizon test, then returns the midpoint. For a 3 hour bracket, the final interval is $10800/2^{18} \approx 0.041$ s, so the returned time is well under one second of numerical resolution. The limiting error is the physical model and the DEM, not the bisection.

`nextSunset` and the other fields mean "the first transition of this type after the scenario start", not "the next event in a state machine". If the site is currently sunlit, `nextSunset` is the immediate one and `nextSunrise` is the one after it. The UI should show the state-appropriate event, and it should say which state the site is in at the start.

### 6.6 Daily summaries
For the Timeline heatmap, the scenario is divided into $\lceil D \rceil$ days. Each sample interval is assigned to the day containing its midpoint. Sun hours, Earth hours, and flux-hours are accumulated, then flux is divided by 24 to produce a daily mean. Sun and Earth hours are capped at 24.

The heatmap is a visualization of the sampled states, not an independent calculation. It inherits the step size and the visibility rule.

## 7. TOPSIS ranking
### 7.1 Decision matrix
There are $m=12$ sites and $n=4$ criteria. The decision matrix is $X = [x_{ij}]$, where

| Criterion | Symbol | Direction |
| --- | --- | --- |
| Sunlight percentage | $x_{i1}$ | benefit, higher is better |
| Earth visibility percentage | $x_{i2}$ | benefit, higher is better |
| Mean solar flux proxy | $x_{i3}$ | benefit, higher is better |
| Local slope in degrees | $x_{i4}$ | cost, lower is better |

Sunlight and Earth visibility are percentages. Flux is dimensionless. Slope is in degrees. Vector normalization removes the units.

### 7.2 Vector normalization
$$
r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^{m} x_{kj}^2}}.
$$

If the denominator is zero for a criterion, every entry in that column is set to zero. Such a criterion carries no information and contributes no spread.

### 7.3 Weights
The user supplies four non-negative weights $w_1,\dots,w_4$. They are normalized to sum to one:

$$
\tilde{w}_j = \frac{w_j}{\sum_{k=1}^{4} w_k}.
$$

If all weights are zero, the implementation falls back to equal weights. The weighted normalized matrix is

$$
v_{ij} = \tilde{w}_j r_{ij}.
$$

The weights are preferences, not physical constants. They are not calibrated against mission requirements, and they are not learned from data. The UI exposes them so the user can see how the ranking responds.

### 7.4 Ideal best and ideal worst
For each criterion, the ideal best $v_j^+$ and ideal worst $v_j^-$ are the maximum and minimum of the weighted column. For a cost criterion such as slope, the direction is reversed: the minimum is the ideal best and the maximum is the ideal worst.

$$
v_j^+ =
\begin{cases}
\max_i v_{ij}, & \text{benefit},\\
\min_i v_{ij}, & \text{cost},
\end{cases}
\qquad
v_j^- =
\begin{cases}
\min_i v_{ij}, & \text{benefit},\\
\max_i v_{ij}, & \text{cost}.
\end{cases}
$$

### 7.5 Distances and closeness
$$
d_i^+ = \sqrt{\sum_{j=1}^{4}\left(v_{ij}-v_j^+\right)^2},
\qquad
d_i^- = \sqrt{\sum_{j=1}^{4}\left(v_{ij}-v_j^-\right)^2}.
$$

$$
C_i = \frac{d_i^-}{d_i^+ + d_i^-}.
$$

$C_i$ lies in $[0,1]$, with larger values closer to the ideal best. Sites are ranked by decreasing $C_i$. If $d_i^+ + d_i^- = 0$, the site is identical to both the ideal best and the ideal worst on every criterion; the implementation assigns the neutral value $C_i = 0.5$ to avoid division by zero. This is a degenerate case and carries no preference information.

TOPSIS does not model correlation between criteria. Sunlight percentage and solar flux proxy are correlated; a site with clear skies tends to score well on both. Keeping both is deliberate, because one measures availability and the other measures a crude intensity proxy, but it does mean the effective weight on "good Sun" is larger than either slider suggests. A future version could decorrelate the criteria or report a variance inflation diagnostic.

### 7.6 What the ranking means
The closeness coefficient is a relative score within the 12-site set. It is not a probability, a safety margin, or a mission feasibility score. A site can rank first under one weighting and mid-pack under another. That sensitivity is a feature of the tool, not a bug, but it means the ranking must be presented with the weights and the underlying numbers visible.

The UI should show the per-criterion values and the ideal/worst distances so a user can see why a site moved. A ranking without that context would be a black box, which is exactly what this project is trying to avoid.

## 8. Pareto frontier
The Pareto view uses two objectives: maximize sunlight percentage and maximize Earth visibility percentage. Site $A$ dominates site $B$ if

$$
\text{sun}_A \ge \text{sun}_B
\quad\text{and}\quad
\text{earth}_A \ge \text{earth}_B,
$$

with at least one strict inequality. A site is on the frontier if no other site dominates it. Sites that are dominated by at least one other site are off the frontier.

If two sites have identical values on both objectives, neither strictly dominates the other, so both are non-dominated under this definition. The UI can mark the duplicate explicitly.

The Pareto frontier is independent of the TOPSIS weights. It answers a different question: which sites are not worse on both power availability and communications availability? It does not include slope or flux. A site can be on the Pareto frontier and still be a poor choice because of steep terrain. The full ranking is the place to see that trade.

The frontier is computed on the 12 sampled sites, not on a continuous design space. It is a comparison of the shipped representatives, not a proof that no better point exists inside a region.

## 9. Validation and error budget
### 9.1 Astronomy comparison
The engine was compared with JPL Horizons at a Shackleton-area site (89.67 degrees south, 129.78 degrees east, h = 0) on 2026-11-14 at 12:00 UTC. Differences are SelenoGrid minus Horizons.

| Quantity | SelenoGrid | JPL Horizons | Difference |
| --- | ---: | ---: | ---: |
| Sun azimuth | 350.754 deg | 350.742 deg | +0.012 deg |
| Sun elevation | 1.884 deg | 1.882 deg | +0.002 deg |
| Earth azimuth | 228.316 deg | 228.314 deg | +0.002 deg |
| Earth elevation | -4.345 deg | -4.341 deg | -0.004 deg |
| Earth angular diameter | 6482.7 arcsec | 6490.5 arcsec | -7.8 arcsec |

The largest angular residual in this comparison is 0.012 degrees in Sun azimuth. The Earth angular diameter differs by 7.8 arcsec, or about 0.12 percent. Typical accuracy is stated as about 0.02 degrees for Sun and Earth directions.

These residuals are not a formal uncertainty budget. They include differences in time scale, reference frame, ephemeris, and the query configuration used for Horizons. They are evidence that the engine is fit for comparative screening at the stated level, not a traceable calibration.

### 9.2 Error budget
| Source | Treatment | Expected effect |
| --- | --- | --- |
| Solar and lunar ephemeris | Meeus ch. 25 and truncated ELP-2000/82 | About 0.01 to 0.02 deg in body directions |
| Lunar orientation | IAU 2009 mean-Earth/polar-axis model | Within the overall sub-0.02 deg residual; not separately isolated |
| Time scale | UTC treated as TT | About 0.01 deg in lunar direction in 2026 |
| Precession and frame | Simplified precession to J2000 | Small at the 0.02 deg level; not formally bounded |
| DEM horizontal resolution | 20 m pixels, bilinear sampling | Terrain below 20 m is invisible; horizon can shift near sharp ridges |
| DEM vertical resolution | 0.5 m DN scaling | Quantization is small; product vertical accuracy is not independently assessed here |
| Horizon binning | 0.25 deg bins, linear interpolation | Smooths the horizon at about 1 km at the 220 km limit |
| Ray sampling | 30 to 120 m steps | Thin ridges or pits between samples can be missed |
| Range truncation | 220 km | Distant relief beyond 220 km is not sampled; no formal truncation test |
| Visibility boundary | Upper-limb rule | Permissive; can overstate usable disk fraction near a transition |
| Event time | 18-step bisection | Well under 1 s numerically; model and DEM dominate |
| Window duration | Sample midpoints | Up to one time step of edge uncertainty |
| Scenario percentage | Sample fraction | One sample is 100/N percentage points; short windows can be missed |
| TOPSIS weights | User preferences | No statistical uncertainty; rank can change with weights |

The dominant terrain uncertainty is not the 0.5 m quantization. It is the 20 m horizontal resolution, the unmodelled sub-pixel roughness, and the fact that a representative point is not an ellipse. A different point a few kilometres away can have a different horizon and a different ranking.

### 9.3 What is not validated
The terrain horizon has not been compared against an independent illumination product, ShadowCam observations, or published per-site illumination time series. The astronomy engine has been compared with Horizons, but the combined terrain-plus-ephemeris visibility has not been end-to-end validated. That is the most important next validation step. Until it is done, the visibility percentages should be treated as a transparent screening estimate, not a measured fact.

## 10. Assumptions and limitations
1. **Spherical Moon.** The DEM and all geometry use a 1,737.4 km sphere. Local ellipsoidal or geoid effects are ignored.
2. **No atmosphere.** There is no refraction, scattering, or atmospheric extinction. This is appropriate for the Moon but means the model does not include any site-specific atmospheric effect.
3. **No light-time or full ephemeris.** The Sun and Moon are computed with a truncated analytic theory. The validation residuals bound the result at the screening level.
4. **No terrain below 20 m.** Rocks, boulders, small craters, and roughness below the DEM resolution are invisible to the horizon and slope calculations.
5. **No lander height.** The site is a point on the surface. A lander's mast or solar array height is not modelled.
6. **No thermal model.** Surface and component temperatures, night survival, and heater power are not modelled.
7. **No power system.** Array area, pointing, degradation, battery capacity, and eclipse management are not modelled.
8. **No communications link budget.** Antenna gain, data rate, weather at the Earth station, and relay architecture are not modelled.
9. **No radio interference.** Earth-Sun geometry near the same line of sight is not treated as an interference or noise source.
10. **No delta-v or transport model.** The ranking says nothing about whether a lander can reach the site or return.
11. **No human factors.** Suit mobility, workday duration, habitat placement, and operational risk are not modelled.
12. **No landing ellipses.** Representative points are not official region centres, and slope variability inside an ellipse is not evaluated.
13. **3D is a local visual aid, not a model.** The detail dialog includes an interactive perspective rendering of the 12 km LOLA tile, with a vertical exaggeration. It is generated directly from the same elevation samples used for slope and hillshade. It is not a global terrain model, a landing simulation, or a hazard visualization.
14. **Sampled scenarios.** Percentages, windows, and event detection inherit the chosen time step. Short windows can be missed.
15. **Subjective weights.** TOPSIS weights are user preferences. The ranking is not a mission recommendation.

## 11. Reproducibility
### 11.1 Data
Download `ldem_80s_20m.img` and its label from the PDS Geosciences Node:

```text
https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/
```

The image is about 1.85 GB. The label documents the 0.5 m DN scaling, the 1,737.4 km reference radius, and the polar stereographic projection.

### 11.2 Terrain extraction
```bash
cc -O2 -o tools/horizon tools/horizon.c -lm
./tools/horizon data/lola/ldem_80s_20m.img 30400 20 tools/sites.raw.json tools/sites.csv
```

`tools/sites.csv` has one row per site: `id,lat,lon,refine`. The optional `refine` flag can snap a point to the local maximum within a small search radius. The shipped sites use `refine = 0`, so the coordinates are exactly the representative points.

### 11.3 Site merge
```bash
node tools/build_sites.mjs
```

This reads `tools/sites.raw.json` and `tools/sites-meta.json` and writes `public/data/sites.json`. The output is deterministic except for the `generatedAt` timestamp. The merge script checks that every raw site has metadata and that every metadata entry has a raw site.

### 11.4 Astronomy spot checks
```bash
node --experimental-strip-types tools/check_astro2.mjs
```

The script prints Sun and Earth azimuth/elevation and Earth angular diameter at three dates. It is a spot check, not a full regression suite.

### 11.5 Static build
```bash
npm install
npm run build
```

The build runs TypeScript and Vite and writes a static `dist/`. There is no server component and no runtime API key. All browser computation is local.

## 12. References
- Smith, D. E., et al. (2010). The Lunar Orbiter Laser Altimeter Investigation on the Lunar Reconnaissance Orbiter Mission. *Space Science Reviews* 150, 209-241. <https://doi.org/10.1007/s11214-009-9512-y>
- Barker, M. K., et al. (2016). A new lunar digital elevation model from the Lunar Orbiter Laser Altimeter and SELENE Terrain Camera. *Icarus* 273, 346-355. <https://doi.org/10.1016/j.icarus.2015.07.039>
- Meeus, J. (1998). *Astronomical Algorithms*, 2nd ed. Willmann-Bell. ISBN 978-0-943396-61-3.
- Archinal, B. A., et al. (2011). Report of the IAU Working Group on Cartographic Coordinates and Rotational Elements: 2009. *Celestial Mechanics and Dynamical Astronomy* 109, 101-135. <https://doi.org/10.1007/s10569-010-9320-4>
- Peña-Asensio, E., Neira-Acosta, Á.-S., and Sánchez-Lozano, J. M. (2025). Evaluating potential landing sites for the Artemis III mission using a multi-criteria decision making approach. *Acta Astronautica* 226, 469-478. <https://arxiv.org/abs/2406.19863>
- NASA (28 October 2024). NASA Provides Update on Artemis III Moon Landing Regions. <https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/>
- NASA/JPL. JPL Horizons. <https://ssd.jpl.nasa.gov/horizons/>

Full annotations and caveats are in [SOURCES.md](SOURCES.md).
