import {
  DEG,
  EARTH_RADIUS_KM,
  SUN_RADIUS_KM,
  RAD,
  apply,
  bodyToInertialMatrix,
  dateToJD,
  jdToDate,
  localBasis,
  moonVectorJ2000,
  siteVectorBody,
  skyState,
  sunVectorJ2000,
  transpose,
  type Vec3,
} from '@/lib/astro'
import type { DaySummary, Scenario, Site, SiteMetrics, SiteSample, Window } from '@/types'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const BIN_DEG = 360 / 1440

/** Linear interpolation of the 0.25° terrain horizon, with wrap-around. */
export function horizonAt(site: Site, azDeg: number): number {
  const x = (((azDeg % 360) + 360) % 360) / BIN_DEG
  const i = Math.floor(x)
  const f = x - i
  const a = site.horizonDeg[i % 1440]
  const b = site.horizonDeg[(i + 1) % 1440]
  return a + (b - a) * f
}

function dot3(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function unit3(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}

function azEl(dir: Vec3, up: Vec3, east: Vec3, north: Vec3) {
  const u = unit3(dir)
  const el = Math.asin(Math.max(-1, Math.min(1, dot3(u, up)))) * RAD
  const az = ((Math.atan2(dot3(u, east), dot3(u, north)) * RAD) % 360 + 360) % 360
  return { az, el }
}

function angularRadius(radiusKm: number, distanceKm: number) {
  return Math.asin(radiusKm / distanceKm) * RAD
}

/** Visibility of a body's upper limb above the terrain horizon. */
export function visibleAt(site: Site, jd: number, body: 'sun' | 'earth') {
  const sky = skyState(
    { lat: site.lat, lon: site.lon, elevKm: site.elevationM / 1000 },
    jd,
  )
  const el = body === 'sun' ? sky.sunEl : sky.earthEl
  const az = body === 'sun' ? sky.sunAz : sky.earthAz
  const radius = body === 'sun' ? sky.sunAngRadius : sky.earthAngRadius
  return el + radius > horizonAt(site, az)
}

/** Bisect a visibility transition to roughly one second. */
export function refineTransition(
  site: Site,
  tA: number,
  tB: number,
  body: 'sun' | 'earth',
  targetVisible: boolean,
): number {
  let a = dateToJD(new Date(tA))
  let b = dateToJD(new Date(tB))
  for (let i = 0; i < 18; i++) {
    const m = (a + b) / 2
    if (visibleAt(site, m, body) === targetVisible) b = m
    else a = m
  }
  return jdToDate((a + b) / 2).getTime()
}

interface Prepared {
  site: Site
  p: Vec3
  up: Vec3
  east: Vec3
  north: Vec3
  sun: SiteSample[]
  earth: SiteSample[]
}

/**
 * Compute Sun and Earth visibility for each site over a scenario window.
 *
 * The expensive ephemeris + lunar orientation is evaluated once per timestep
 * and shared across all sites; only the local az/el projection is per-site.
 */
export function computeSiteMetrics(sites: Site[], scenario: Scenario): SiteMetrics[] {
  const startMs = Date.parse(scenario.startIso)
  const stepMs = scenario.stepHours * HOUR_MS
  const intervals = Math.round((scenario.days * DAY_MS) / stepMs)
  const steps = intervals + 1
  const startJD = dateToJD(new Date(startMs))

  const prepared: Prepared[] = sites.map((site) => {
    const basis = localBasis(site.lat, site.lon)
    return {
      site,
      p: siteVectorBody({ lat: site.lat, lon: site.lon, elevKm: site.elevationM / 1000 }),
      up: basis.up,
      east: basis.east,
      north: basis.north,
      sun: new Array(steps),
      earth: new Array(steps),
    }
  })

  for (let i = 0; i < steps; i++) {
    const t = startMs + i * stepMs
    const jd = startJD + (i * stepMs) / DAY_MS
    const R = bodyToInertialMatrix(jd)
    const Rt = transpose(R)
    const moonI = moonVectorJ2000(jd)
    const sunI = sunVectorJ2000(jd)
    const sunRel: Vec3 = [sunI[0] - moonI[0], sunI[1] - moonI[1], sunI[2] - moonI[2]]
    const sunBody = apply(Rt, sunRel)
    const moonBody = apply(Rt, moonI)
    const sunDist = Math.hypot(sunRel[0], sunRel[1], sunRel[2])
    const sunRad = angularRadius(SUN_RADIUS_KM, sunDist)

    for (const p of prepared) {
      const sVec: Vec3 = [sunBody[0] - p.p[0], sunBody[1] - p.p[1], sunBody[2] - p.p[2]]
      const eVec: Vec3 = [
        -(moonBody[0] + p.p[0]),
        -(moonBody[1] + p.p[1]),
        -(moonBody[2] + p.p[2]),
      ]
      const s = azEl(sVec, p.up, p.east, p.north)
      const e = azEl(eVec, p.up, p.east, p.north)
      const earthDist = Math.hypot(eVec[0], eVec[1], eVec[2])
      const earthRad = angularRadius(EARTH_RADIUS_KM, earthDist)

      const sunH = horizonAt(p.site, s.az)
      const earthH = horizonAt(p.site, e.az)
      const sunClear = s.el + sunRad - sunH
      const earthClear = e.el + earthRad - earthH

      const sVis = sunClear > 0
      const eVis = earthClear > 0
      p.sun[i] = {
        t,
        sunAz: s.az,
        sunEl: s.el,
        earthAz: e.az,
        earthEl: e.el,
        sunVisible: sVis,
        earthVisible: eVis,
        sunClearance: sunClear,
        earthClearance: earthClear,
        flux: sVis ? Math.max(0, Math.sin(s.el * DEG)) : 0,
      }
      p.earth[i] = p.sun[i]
    }
  }

  return prepared.map((p) => {
    const samples = p.sun
    let sunCount = 0
    let earthCount = 0
    let fluxSum = 0
    let sunElSum = 0
    let earthElSum = 0
    let maxSunEl = -90
    let maxEarthEl = -90
    for (const s of samples) {
      if (s.sunVisible) sunCount++
      if (s.earthVisible) earthCount++
      fluxSum += s.flux
      sunElSum += s.sunEl
      earthElSum += s.earthEl
      if (s.sunEl > maxSunEl) maxSunEl = s.sunEl
      if (s.earthEl > maxEarthEl) maxEarthEl = s.earthEl
    }

    const sunWindows = buildWindows(samples, 'sunVisible', startMs, startMs + scenario.days * DAY_MS)
    const earthWindows = buildWindows(
      samples,
      'earthVisible',
      startMs,
      startMs + scenario.days * DAY_MS,
    )

    const findTransition = (key: 'sunVisible' | 'earthVisible', to: boolean) => {
      for (let i = 1; i < samples.length; i++) {
        if (samples[i][key] !== samples[i - 1][key] && samples[i][key] === to) {
          const body = key === 'sunVisible' ? 'sun' : 'earth'
          return refineTransition(
            p.site,
            samples[i - 1].t,
            samples[i].t,
            body,
            to,
          )
        }
      }
      return null
    }

    const days = buildDays(samples, scenario, startMs)

    return {
      siteId: p.site.id,
      start: startMs,
      end: startMs + scenario.days * DAY_MS,
      stepMs,
      samples,
      days,
      sunlightPct: (sunCount / samples.length) * 100,
      earthPct: (earthCount / samples.length) * 100,
      fluxMean: fluxSum / samples.length,
      meanSunEl: sunElSum / samples.length,
      meanEarthEl: earthElSum / samples.length,
      maxSunEl,
      maxEarthEl,
      longestSunHours: longest(sunWindows),
      longestEarthHours: longest(earthWindows),
      sunWindows,
      earthWindows,
      nextSunset: findTransition('sunVisible', false),
      nextSunrise: findTransition('sunVisible', true),
      nextEarthset: findTransition('earthVisible', false),
      nextEarthrise: findTransition('earthVisible', true),
      startSunVisible: samples[0].sunVisible,
      startEarthVisible: samples[0].earthVisible,
      startSunEl: samples[0].sunEl,
      startEarthEl: samples[0].earthEl,
      startSunAz: samples[0].sunAz,
      startEarthAz: samples[0].earthAz,
    }
  })
}

function buildWindows(
  samples: SiteSample[],
  key: 'sunVisible' | 'earthVisible',
  start: number,
  end: number,
): Window[] {
  const out: Window[] = []
  let runStart: number | null = samples[0][key] ? start : null
  let clipped = samples[0][key]

  for (let i = 1; i < samples.length; i++) {
    if (samples[i][key] === samples[i - 1][key]) continue
    const cross = (samples[i - 1].t + samples[i].t) / 2
    if (samples[i][key]) {
      runStart = cross
      clipped = false
    } else if (runStart !== null) {
      out.push({ start: runStart, end: cross, clipped })
      runStart = null
    }
  }
  if (runStart !== null) out.push({ start: runStart, end, clipped: true })
  if (out.length === 0) return [{ start, end: start, clipped: true }]
  return out
}

function longest(windows: Window[]): number {
  let max = 0
  for (const w of windows) {
    const h = (w.end - w.start) / HOUR_MS
    if (h > max) max = h
  }
  return max
}

function buildDays(samples: SiteSample[], scenario: Scenario, start: number): DaySummary[] {
  const n = Math.ceil(scenario.days)
  const out: DaySummary[] = Array.from({ length: n }, (_, i) => ({
    t: start + i * DAY_MS,
    sunHours: 0,
    earthHours: 0,
    flux: 0,
  }))
  for (let i = 0; i < samples.length - 1; i++) {
    const s = samples[i]
    const mid = (s.t + samples[i + 1].t) / 2
    const d = Math.min(n - 1, Math.max(0, Math.floor((mid - start) / DAY_MS)))
    const dt = (samples[i + 1].t - s.t) / HOUR_MS
    if (s.sunVisible) out[d].sunHours += dt
    if (s.earthVisible) out[d].earthHours += dt
    out[d].flux += s.flux * dt
  }
  for (const d of out) {
    d.flux /= 24
    d.sunHours = Math.min(24, d.sunHours)
    d.earthHours = Math.min(24, d.earthHours)
  }
  return out
}
