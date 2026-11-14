/**
 * SelenoGrid lunar astronomy engine.
 *
 * Geocentric Sun and Moon positions: Meeus, Astronomical Algorithms (2nd ed.),
 * chapters 25 and 47 (truncated ELP-2000/82). Lunar orientation: IAU 2009
 * mean-Earth/polar-axis model. All vectors are J2000 equatorial kilometres.
 *
 * Accuracy target: < 0.02 deg for Sun/Earth directions at the lunar south pole,
 * validated against JPL Horizons (see tools/validate_horizons.mjs).
 */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const MOON_RADIUS_KM = 1737.4;
export const EARTH_RADIUS_KM = 6371.0;
export const SUN_RADIUS_KM = 696000.0;
export const AU_KM = 149597870.7;
export const OBLIQUITY_J2000 = 23.4392911 * DEG;

export type Vec3 = [number, number, number];

export function dateToJD(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

function norm360(x: number): number {
  x %= 360;
  return x < 0 ? x + 360 : x;
}

// ---------------------------------------------------------------------------
// Sun (Meeus ch. 25, low precision ~0.01 deg)
// ---------------------------------------------------------------------------

export interface SunPos {
  lon: number; // deg, apparent, ecliptic of date
  lat: number; // deg
  distKm: number;
}

export function sunPosition(jd: number): SunPos {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const Mr = M * DEG;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const trueLong = L0 + C;
  const v = M + C;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(v * DEG));
  const omega = (125.04 - 1934.136 * T) * DEG;
  const lon = trueLong - 0.00569 - 0.00478 * Math.sin(omega);
  return { lon: norm360(lon), lat: 0, distKm: R * AU_KM };
}

// ---------------------------------------------------------------------------
// Moon (Meeus ch. 47)
// ---------------------------------------------------------------------------

type Term = [number, number, number, number, number, number];

const TERMS_LR: Term[] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

const TERMS_B: Term[] = [
  [0, 0, 0, 1, 5128122, 0],
  [0, 0, 1, 1, 280602, 0],
  [0, 0, 1, -1, 277693, 0],
  [2, 0, 0, -1, 173237, 0],
  [2, 0, -1, 1, 55413, 0],
  [2, 0, -1, -1, 46271, 0],
  [2, 0, 0, 1, 32573, 0],
  [0, 0, 2, 1, 17198, 0],
  [2, 0, 1, -1, 9266, 0],
  [0, 0, 2, -1, 8822, 0],
  [2, -1, 0, -1, 8216, 0],
  [2, 0, -2, -1, 4324, 0],
  [2, 0, 1, 1, 4200, 0],
  [2, 1, 0, -1, -3359, 0],
  [2, -1, -1, 1, 2463, 0],
  [2, -1, 0, 1, 2211, 0],
  [2, -1, -1, -1, 2065, 0],
  [0, 1, -1, -1, -1870, 0],
  [4, 0, -1, -1, 1828, 0],
  [0, 1, 0, 1, -1794, 0],
  [0, 0, 0, 3, -1749, 0],
  [0, 1, -1, 1, -1565, 0],
  [1, 0, 0, 1, -1491, 0],
  [0, 1, 1, 1, -1475, 0],
  [0, 1, 1, -1, -1410, 0],
  [0, 1, 0, -1, -1344, 0],
  [1, 0, 0, -1, -1335, 0],
  [0, 0, 3, 1, 1107, 0],
  [4, 0, 0, -1, 1021, 0],
  [4, 0, -1, 1, 833, 0],
  [0, 0, 1, -3, 777, 0],
  [4, 0, -2, 1, 671, 0],
  [2, 0, 0, -3, 607, 0],
  [2, 0, 2, -1, 596, 0],
  [2, -1, 1, -1, 491, 0],
  [2, 0, -2, 1, -451, 0],
  [0, 0, 3, -1, 439, 0],
  [2, 0, 2, 1, 422, 0],
  [2, 0, -3, -1, 421, 0],
  [2, 1, -1, 1, -366, 0],
  [2, 1, 0, 1, -351, 0],
  [4, 0, 0, 1, 331, 0],
  [2, -1, 1, 1, 315, 0],
  [2, -2, 0, -1, 302, 0],
  [0, 0, 1, 3, -283, 0],
  [2, 1, 1, -1, -229, 0],
  [1, 1, 0, -1, 223, 0],
  [1, 1, 0, 1, 223, 0],
  [0, 1, -2, -1, -220, 0],
  [2, 1, -1, -1, -220, 0],
  [1, 0, 1, 1, -185, 0],
  [2, -1, -2, -1, 181, 0],
  [0, 1, 2, 1, -177, 0],
  [4, 0, -2, -1, 176, 0],
  [4, -1, -1, -1, 166, 0],
  [1, 0, 1, -1, -164, 0],
  [4, 0, 1, -1, 132, 0],
  [1, 0, -1, -1, -119, 0],
  [4, -1, 0, -1, 115, 0],
  [2, -2, 0, 1, 107, 0],
];

export interface MoonPos {
  lon: number; // deg, ecliptic of date
  lat: number; // deg
  distKm: number;
}

export function moonPosition(jd: number): MoonPos {
  const T = (jd - 2451545.0) / 36525.0;
  const Lp = norm360(
    218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841 - (T * T * T * T) / 65194000
  );
  const D = norm360(
    297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868 - (T * T * T * T) / 113065000
  );
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000);
  const Mp = norm360(
    134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699 - (T * T * T * T) / 14712000
  );
  const F = norm360(
    93.272095 + 483202.0175233 * T - 0.0036539 * T * T - (T * T * T) / 3526000 + (T * T * T * T) / 863310000
  );
  const A1 = norm360(119.75 + 131.849 * T);
  const A2 = norm360(53.09 + 479264.29 * T);
  const A3 = norm360(313.45 + 481266.484 * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  let sumL = 0;
  let sumR = 0;
  for (const [d, m, mp, f, cl, cr] of TERMS_LR) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG;
    const eFactor = m === 0 ? 1 : m === 1 || m === -1 ? E : E * E;
    sumL += cl * eFactor * Math.sin(arg);
    sumR += cr * eFactor * Math.cos(arg);
  }
  let sumB = 0;
  for (const [d, m, mp, f, cb] of TERMS_B) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG;
    const eFactor = m === 0 ? 1 : m === 1 || m === -1 ? E : E * E;
    sumB += cb * eFactor * Math.sin(arg);
  }

  sumL += 3958 * Math.sin(A1 * DEG) + 1962 * Math.sin((Lp - F) * DEG) + 318 * Math.sin(A2 * DEG);
  sumB +=
    -2235 * Math.sin(Lp * DEG) +
    382 * Math.sin(A3 * DEG) +
    175 * Math.sin((A1 - F) * DEG) +
    175 * Math.sin((A1 + F) * DEG) +
    127 * Math.sin((Lp - Mp) * DEG) -
    115 * Math.sin((Lp + Mp) * DEG);

  return {
    lon: norm360(Lp + sumL / 1e6),
    lat: sumB / 1e6,
    distKm: 385000.56 + sumR / 1000,
  };
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

function eclipticToEquatorial(lonDeg: number, latDeg: number, dist: number): Vec3 {
  const l = lonDeg * DEG;
  const b = latDeg * DEG;
  const x = dist * Math.cos(b) * Math.cos(l);
  const y = dist * Math.cos(b) * Math.sin(l);
  const z = dist * Math.sin(b);
  const c = Math.cos(OBLIQUITY_J2000);
  const s = Math.sin(OBLIQUITY_J2000);
  return [x, y * c - z * s, y * s + z * c];
}

/** General precession in ecliptic longitude from J2000 to jd, in degrees. */
function precessionDeg(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const p = 5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T; // arcsec
  return p / 3600;
}

export function sunVectorJ2000(jd: number): Vec3 {
  const s = sunPosition(jd);
  return eclipticToEquatorial(s.lon - precessionDeg(jd), s.lat, s.distKm);
}

export function moonVectorJ2000(jd: number): Vec3 {
  const m = moonPosition(jd);
  return eclipticToEquatorial(m.lon - precessionDeg(jd), m.lat, m.distKm);
}

/**
 * IAU 2009 lunar orientation (mean-Earth/polar-axis frame), including the
 * 18.6-year precession of the pole. Without the periodic terms the mean pole
 * sits on the ecliptic pole; the 1.543 deg tilt is carried entirely by them.
 */
export function moonOrientation(jd: number): { alpha0: number; delta0: number; W: number } {
  const T = (jd - 2451545.0) / 36525.0;
  const d = jd - 2451545.0;

  const E = [
    125.045 - 0.0529921 * d,
    250.089 - 0.1059842 * d,
    260.008 + 13.0120009 * d,
    176.625 + 13.3407154 * d,
    357.529 + 0.9856003 * d,
    311.589 + 26.4057084 * d,
    134.963 + 13.064993 * d,
    276.617 + 0.3287146 * d,
    34.226 + 1.7484877 * d,
    15.134 - 0.1589763 * d,
    119.743 + 0.0036096 * d,
    239.961 + 0.1643573 * d,
    25.053 + 12.9590088 * d,
  ].map((e) => e * DEG);

  const raTerms = [-3.8787, -0.1204, 0.07, -0.0172, 0, 0.0072, 0, 0, 0, -0.0052, 0, 0, 0.0043];
  const decTerms = [1.5419, 0.0239, -0.0278, 0.0068, 0, -0.0029, 0.0009, 0, 0, 0.0008, 0, 0, -0.0009];
  const pmTerms = [3.561, 0.1208, -0.0642, 0.0158, 0.0252, -0.0066, -0.0047, -0.0046, 0.0028, 0.0052, 0.004, 0.0019, -0.0044];

  let raN = 0;
  let decN = 0;
  let pmN = 0;
  for (let i = 0; i < 13; i++) {
    raN += raTerms[i] * Math.sin(E[i]);
    decN += decTerms[i] * Math.cos(E[i]);
    pmN += pmTerms[i] * Math.sin(E[i]);
  }

  const alpha0 = 269.9949 + 0.0031 * T - 0.0028 * T * T + raN;
  const delta0 = 66.5392 + 0.013 * T - 0.0017 * T * T + decN;
  const W = norm360(38.3213 + 13.17635815 * d - 1.4e-12 * d * d + pmN);
  return { alpha0, delta0, W };
}

function matMul(a: number[][], b: number[][]): number[][] {
  return a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
}

function rotZ(angleDeg: number): number[][] {
  const a = angleDeg * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}

function rotX(angleDeg: number): number[][] {
  const a = angleDeg * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
}

export type Mat3 = number[][];

/** Body-fixed -> J2000 equatorial. */
export function bodyToInertialMatrix(jd: number): Mat3 {
  const { alpha0, delta0, W } = moonOrientation(jd);
  return matMul(matMul(rotZ(alpha0 + 90), rotX(90 - delta0)), rotZ(W));
}

export function transpose(m: Mat3): Mat3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

export function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

export function unit(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export interface SelenoPoint {
  lat: number; // deg
  lon: number; // deg east
  elevKm: number;
}

export function siteVectorBody(site: SelenoPoint): Vec3 {
  const r = MOON_RADIUS_KM + site.elevKm;
  const p = site.lat * DEG;
  const l = site.lon * DEG;
  return [r * Math.cos(p) * Math.cos(l), r * Math.cos(p) * Math.sin(l), r * Math.sin(p)];
}

export function localBasis(lat: number, lon: number): { up: Vec3; east: Vec3; north: Vec3 } {
  const p = lat * DEG;
  const l = lon * DEG;
  return {
    up: [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)],
    east: [-Math.sin(l), Math.cos(l), 0],
    north: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)],
  };
}

export function bodyDirectionToAzEl(d: Vec3, lat: number, lon: number): { az: number; el: number } {
  const { up, east, north } = localBasis(lat, lon);
  const u = unit(d);
  const el = Math.asin(Math.max(-1, Math.min(1, dot(u, up)))) * RAD;
  const az = norm360(Math.atan2(dot(u, east), dot(u, north)) * RAD);
  return { az, el };
}

export interface SkyState {
  sunAz: number;
  sunEl: number;
  sunDistKm: number;
  sunAngRadius: number;
  earthAz: number;
  earthEl: number;
  earthDistKm: number;
  earthAngRadius: number;
  subsolarLat: number;
  subsolarLon: number;
}

/** Sun and Earth directions from a lunar surface site, in the site's local horizon frame. */
export function skyState(site: SelenoPoint, jd: number): SkyState {
  const R = bodyToInertialMatrix(jd);
  const Rt = transpose(R);
  const moonI = moonVectorJ2000(jd);
  const sunI = sunVectorJ2000(jd);
  const pBody = siteVectorBody(site);

  // Moon-fixed site position (km)
  const sunVecBody = apply(Rt, [sunI[0] - moonI[0], sunI[1] - moonI[1], sunI[2] - moonI[2]]);
  sunVecBody[0] -= pBody[0];
  sunVecBody[1] -= pBody[1];
  sunVecBody[2] -= pBody[2];

  // Earth centre is the geocentric origin. Convert Moon centre + site offset to
  // the body frame before taking the negative.
  const moonBody = apply(Rt, moonI);
  const earthVecBody: Vec3 = [
    -(moonBody[0] + pBody[0]),
    -(moonBody[1] + pBody[1]),
    -(moonBody[2] + pBody[2]),
  ];

  const sunDir = unit(sunVecBody);
  const earthDir = unit(earthVecBody);
  const sun = bodyDirectionToAzEl(sunDir, site.lat, site.lon);
  const earth = bodyDirectionToAzEl(earthDir, site.lat, site.lon);
  const sunDistKm = Math.hypot(sunVecBody[0], sunVecBody[1], sunVecBody[2]);
  const earthDistKm = Math.hypot(earthVecBody[0], earthVecBody[1], earthVecBody[2]);

  return {
    sunAz: sun.az,
    sunEl: sun.el,
    sunDistKm,
    sunAngRadius: Math.asin(SUN_RADIUS_KM / sunDistKm) * RAD,
    earthAz: earth.az,
    earthEl: earth.el,
    earthDistKm,
    earthAngRadius: Math.asin(EARTH_RADIUS_KM / earthDistKm) * RAD,
    subsolarLat: Math.asin(sunDir[2]) * RAD,
    subsolarLon: norm360(Math.atan2(sunDir[1], sunDir[0]) * RAD),
  };
}
