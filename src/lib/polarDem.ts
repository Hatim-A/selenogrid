import type { Site, SiteTile, TerrainClass } from '@/types'

const N = 950
const PIX = 640.0
const OFF = (N - 1) / 2.0 // 474.5
const SCALE = 0.5
const R = 1_737_400.0
const DEG = Math.PI / 180.0
const NBINS = 1440

const CUSTOM_PALETTE = [
  '#38bdf8',
  '#f472b6',
  '#34d399',
  '#fb923c',
  '#c084fc',
  '#facc15',
] as const

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

let demCache: Int16Array | null = null
let demPromise: Promise<Int16Array> | null = null

function round(v: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

function encodeBase64(bytes: Uint8Array): string {
  const len = bytes.length
  const parts: string[] = []
  let i = 0
  for (; i + 2 < len; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    parts.push(
      BASE64_CHARS[(v >> 18) & 63] +
        BASE64_CHARS[(v >> 12) & 63] +
        BASE64_CHARS[(v >> 6) & 63] +
        BASE64_CHARS[v & 63],
    )
  }
  if (i < len) {
    let v = bytes[i] << 16
    if (i + 1 < len) v |= bytes[i + 1] << 8
    parts.push(
      BASE64_CHARS[(v >> 18) & 63] +
        BASE64_CHARS[(v >> 12) & 63] +
        (i + 1 < len ? BASE64_CHARS[(v >> 6) & 63] : '=') +
        '=',
    )
  }
  return parts.join('')
}

/**
 * Inverse south-polar stereographic projection from CSS percentages (0..100)
 * on the 7600x7600 / 80 m atlas to selenographic { lat, lon } in degrees.
 */
export function atlasPctToLatLon(
  xPct: number,
  yPct: number,
): { lat: number; lon: number } | null {
  if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return null
  const col7600 = (xPct / 100) * 7599
  const row7600 = (yPct / 100) * 7599
  const x = (col7600 - 3799.5) * 80
  const y = (3799.5 - row7600) * 80
  const r = Math.hypot(x, y)
  const colat = 2 * Math.atan(r / (2 * R))
  const lat = -90 + colat / DEG
  const lon = Math.atan2(x, y) / DEG
  if (lat > -80.15 || lat < -90) return null
  return {
    lat: round(lat, 4),
    lon: round(lon, 4),
  }
}

/**
 * Fetches and caches the 950 x 950 Int16 640 m/px south-polar LOLA DEM grid.
 */
export async function ensurePolarDem(): Promise<Int16Array> {
  if (demCache) return demCache
  if (!demPromise) {
    demPromise = fetch(`${import.meta.env.BASE_URL}data/polar-dem-640m.bin`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Could not load 640 m polar DEM (${res.status})`)
        }
        const buf = await res.arrayBuffer()
        if (buf.byteLength < N * N * 2) {
          throw new Error(
            `Polar DEM truncated (${buf.byteLength} bytes, expected ${N * N * 2})`,
          )
        }
        demCache = new Int16Array(buf, 0, N * N)
        return demCache
      })
      .catch((err) => {
        demPromise = null
        throw err
      })
  }
  return demPromise
}

function elevRc(dem: Int16Array, row: number, col: number): number | null {
  if (row < 0 || col < 0 || row >= N || col >= N) return null
  const v = dem[row * N + col]
  if (v === -32768) return null
  return v * SCALE
}

/**
 * Bilinear interpolation on the 950 x 950 south-polar stereographic DEM grid.
 * Returns elevation in meters relative to the 1737.4 km lunar reference sphere.
 */
export function samplePolarDem(
  dem: Int16Array,
  lat: number,
  lon: number,
): number | null {
  let colat = lat + 90.0
  if (colat < 0) colat = 0
  const r = 2.0 * R * Math.tan((colat * DEG) / 2.0)
  const x = r * Math.sin(lon * DEG)
  const y = r * Math.cos(lon * DEG)
  const row = OFF - y / PIX
  const col = OFF + x / PIX
  const r0 = Math.floor(row)
  const c0 = Math.floor(col)
  const fr = row - r0
  const fc = col - c0
  const v00 = elevRc(dem, r0, c0)
  if (v00 === null) return null
  const v01 = elevRc(dem, r0, c0 + 1)
  if (v01 === null) return null
  const v10 = elevRc(dem, r0 + 1, c0)
  if (v10 === null) return null
  const v11 = elevRc(dem, r0 + 1, c0 + 1)
  if (v11 === null) return null
  return (
    v00 * (1 - fr) * (1 - fc) +
    v01 * (1 - fr) * fc +
    v10 * fr * (1 - fc) +
    v11 * fr * fc
  )
}

/**
 * Spherical destination on the lunar reference sphere:
 * surface distance s (meters) at azimuth az (degrees clockwise from north).
 */
function dest(
  lat: number,
  lon: number,
  az: number,
  s: number,
): [number, number] {
  const d = s / R
  const slat = lat * DEG
  const slon = lon * DEG
  const saz = az * DEG
  const sd = Math.sin(d)
  const cd = Math.cos(d)
  let s2 = Math.sin(slat) * cd + Math.cos(slat) * sd * Math.cos(saz)
  if (s2 > 1) s2 = 1
  if (s2 < -1) s2 = -1
  const la = Math.asin(s2)
  const lo =
    slon + Math.atan2(Math.sin(saz) * sd * Math.cos(slat), cd - Math.sin(slat) * s2)
  const lat2 = la / DEG
  const lon2 = ((((lo / DEG + 540.0) % 360.0) + 360.0) % 360.0) - 180.0
  return [lat2, lon2]
}

/**
 * Exact elevation angle (degrees) of a target at surface distance s (meters)
 * with observer elevation h0 and target elevation h above the reference sphere.
 */
function elAngle(h0: number, h: number, s: number): number {
  const r0 = R + h0
  const r1 = R + h
  const phi = s / R
  const up = r1 * Math.cos(phi) - r0
  const horiz = r1 * Math.sin(phi)
  return Math.atan2(up, horiz) / DEG
}

/**
 * Plane fit over 8 azimuths x 2 radii (500 m, 1000 m), matching slope_at in horizon.c.
 */
function slopeAt(
  dem: Int16Array,
  lat: number,
  lon: number,
  h0: number,
): { slopeDeg: number; aspectDeg: number } {
  let sa = 0
  let sb = 0
  let saa = 0
  let sbb = 0
  const radii = [500.0, 1000.0]
  for (let i = 0; i < 8; i++) {
    const az = i * 45.0
    for (let k = 0; k < 2; k++) {
      const radius = radii[k]
      const [la, lo] = dest(lat, lon, az, radius)
      const h = samplePolarDem(dem, la, lo)
      if (h === null) continue
      const e = radius * Math.sin(az * DEG)
      const n = radius * Math.cos(az * DEG)
      const dz = h - h0
      sa += e * dz
      sb += n * dz
      saa += e * e
      sbb += n * n
    }
  }
  const a = saa > 0 ? sa / saa : 0
  const b = sbb > 0 ? sb / sbb : 0
  const aspectDeg = (((Math.atan2(-a, -b) / DEG) % 360.0) + 360.0) % 360.0
  const slopeDeg = Math.atan(Math.hypot(a, b)) / DEG
  return { slopeDeg, aspectDeg }
}

function classifyTerrain(h0: number, slopeDeg: number): TerrainClass {
  if (h0 < -2200) return 'psr'
  if (h0 > 3000) return 'massif'
  if (slopeDeg < 2.2 && Math.abs(h0) < 1200) return 'plain'
  if (h0 > 1200) return 'ridge'
  return 'rim'
}

/**
 * Ray-marches a 360° horizon profile and 12 km hillshade tile directly in the
 * browser from the 640 m LOLA south-polar DEM grid for any user-selected coordinate.
 */
export async function extractCustomSite(
  lat: number,
  lon: number,
  customIndex = 1,
  customName?: string,
): Promise<Site> {
  const clampedLat = Math.max(-89.99, Math.min(-80.2, lat))
  const normLon = ((((lon + 180) % 360) + 360) % 360) - 180

  const dem = await ensurePolarDem()
  const h0 = samplePolarDem(dem, clampedLat, normLon) ?? 0
  const { slopeDeg, aspectDeg } = slopeAt(dem, clampedLat, normLon, h0)

  const horizonDeg = new Array<number>(NBINS)
  const horizonDistKm = new Array<number>(NBINS)
  let openSkySum = 0
  let minHz = Infinity
  let maxHz = -Infinity
  let sumHz = 0

  for (let b = 0; b < NBINS; b++) {
    const az = b * (360.0 / NBINS)
    let best = -90.0
    let bestd = 0.0
    for (let d = 640.0; d <= 220000.0; ) {
      const stepm = d < 30000.0 ? 480.0 : d < 90000.0 ? 960.0 : 1600.0
      const [la, lo] = dest(clampedLat, normLon, az, d)
      const h = samplePolarDem(dem, la, lo)
      if (h !== null) {
        const el = elAngle(h0, h, d)
        if (el > best) {
          best = el
          bestd = d
        }
      }
      d += stepm
    }
    openSkySum += 1.0 - Math.sin(best * DEG)
    const hzVal = round(best, 2)
    const hdVal = round(bestd / 1000.0, 1)
    horizonDeg[b] = hzVal
    horizonDistKm[b] = hdVal
    if (hzVal < minHz) minHz = hzVal
    if (hzVal > maxHz) maxHz = hzVal
    sumHz += hzVal
  }

  const openSkyFrac = round(openSkySum / (NBINS * 2.0), 4)
  const horizonMinDeg = round(minHz, 2)
  const horizonMaxDeg = round(maxHz, 2)
  const horizonMeanDeg = round(sumHz / NBINS, 2)

  // 200 x 200 local terrain tile, 60 m / px, north-up, 12 km span
  const TS = 200
  const tsp = 60.0
  const th = new Float64Array(TS * TS)
  let tmin = 1e9
  let tmax = -1e9
  for (let y = 0; y < TS; y++) {
    const dy = ((TS - 1) / 2.0 - y) * tsp
    for (let x = 0; x < TS; x++) {
      const dx = (x - (TS - 1) / 2.0) * tsp
      const d = Math.hypot(dx, dy)
      const az = Math.atan2(dx, dy) / DEG
      const [la, lo] = dest(clampedLat, normLon, az, d)
      const sampled = samplePolarDem(dem, la, lo)
      const h = sampled !== null ? sampled : h0
      th[y * TS + x] = h
      if (h < tmin) tmin = h
      if (h > tmax) tmax = h
    }
  }

  const q = new Uint8Array(TS * TS)
  const span = Math.max(1, tmax - tmin)
  for (let i = 0; i < TS * TS; i++) {
    const v = ((th[i] - tmin) / span) * 255.0
    q[i] = v < 0 ? 0 : v > 255 ? 255 : Math.floor(v)
  }

  const tile: SiteTile = {
    size: TS,
    pixelM: tsp,
    minM: round(tmin, 1),
    maxM: round(tmax, 1),
    base64: encodeBase64(q),
  }

  const reliefM = Math.round(tmax - tmin)
  const terrainClass = classifyTerrain(h0, slopeDeg)
  const color =
    CUSTOM_PALETTE[(Math.max(1, Math.floor(customIndex)) - 1) % CUSTOM_PALETTE.length]

  const trimmedName = customName?.trim()
  const latLabel = `${Math.abs(clampedLat).toFixed(2)}°S`
  const lonHemisphere = normLon >= 0 ? 'E' : 'W'
  const lonLabel = `${Math.abs(normLon).toFixed(2)}°${lonHemisphere}`
  const elevKmLabel = `${(h0 / 1000).toFixed(2)} km`

  return {
    id: `custom-${clampedLat.toFixed(3)}-${normLon.toFixed(3)}`,
    name: trimmedName || `Custom Pin #${customIndex} (${latLabel}, ${lonLabel})`,
    shortName: trimmedName || `Pin #${customIndex} (${Math.abs(clampedLat).toFixed(1)}°S)`,
    region: 'User custom coordinate',
    kind: 'reference',
    terrainClass,
    lat: round(clampedLat, 5),
    lon: round(normLon, 5),
    elevationM: round(h0, 1),
    slopeDeg: round(slopeDeg, 2),
    aspectDeg: round(aspectDeg, 1),
    openSkyFrac,
    horizonMinDeg,
    horizonMaxDeg,
    horizonMeanDeg,
    reliefM,
    horizonDeg,
    horizonDistKm,
    tile,
    color,
    tags: ['Custom coordinate', 'LOLA 640 m grid', elevKmLabel],
    summary: `User-placed coordinate at ${latLabel}, ${lonLabel} (${elevKmLabel} elevation, ${slopeDeg.toFixed(1)}° local slope), sampled and ray-marched live in the browser across 1,440 azimuths out to 220 km from the 640 m/px LOLA south-polar DEM grid.`,
    source:
      'Live browser ray-march · NASA LOLA 640 m/px south-polar DEM (ldem_80s_80m 8× downsample)',
    sourceUrl:
      'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/',
  }
}
