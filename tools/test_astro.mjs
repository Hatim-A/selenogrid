import { dateToJD, skyState, moonOrientation, bodyToInertialMatrix, moonVectorJ2000, apply, transpose, unit, RAD, DEG } from '../src/lib/astro.ts';

const site = { lat: -89.67, lon: 129.78, elevKm: 0 };
for (const iso of ['2026-11-14T12:00:00Z','2027-01-01T00:00:00Z','2028-06-15T00:00:00Z','2029-12-21T00:00:00Z']) {
  const jd = dateToJD(new Date(iso));
  const s = skyState(site, jd);
  console.log(iso, 'sun az/el', s.sunAz.toFixed(2), s.sunEl.toFixed(2), 'earth', s.earthAz.toFixed(2), s.earthEl.toFixed(2), 'subsolar', s.subsolarLat.toFixed(2), s.subsolarLon.toFixed(2));
}

// sub-Earth point (libration): Earth direction in body frame
for (const iso of ['2026-11-14T12:00:00Z','2027-02-01T00:00:00Z','2028-01-01T00:00:00Z']) {
  const jd = dateToJD(new Date(iso));
  const R = transpose(bodyToInertialMatrix(jd));
  const m = moonVectorJ2000(jd);
  const b = apply(R, [-m[0],-m[1],-m[2]]);
  const u = unit(b);
  console.log(iso, 'sub-Earth lat/lon', (Math.asin(u[2])*RAD).toFixed(3), (Math.atan2(u[1],u[0])*RAD).toFixed(3), 'dist', Math.hypot(...b).toFixed(0));
}
