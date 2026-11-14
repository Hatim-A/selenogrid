import { dateToJD, sunPosition, moonPosition, moonOrientation, bodyToInertialMatrix, moonVectorJ2000, unit, apply, transpose, RAD } from '../src/lib/astro.ts';
const jd0 = dateToJD(new Date('2026-11-14T12:00:00Z'));
for (let k=0;k<=2;k++){
  const jd=jd0+k;
  const s=sunPosition(jd), m=moonPosition(jd);
  console.log('day',k,'sunlon',s.lon.toFixed(2),'moonlon',m.lon.toFixed(2),'diff',((s.lon-m.lon+360)%360).toFixed(2),'moonlat',m.lat.toFixed(2),'dist',m.distKm.toFixed(0));
}
// body-fixed longitude of a fixed inertial direction over 1 day
const R0=bodyToInertialMatrix(jd0);
const dirI=[1,0,0];
const b0=apply(transpose(R0),dirI);
console.log('body dir at t0', b0.map(x=>x.toFixed(4)), 'lon', (Math.atan2(b0[1],b0[0])*RAD).toFixed(2));
const R1=bodyToInertialMatrix(jd0+1);
const b1=apply(transpose(R1),dirI);
console.log('body dir at t+1', b1.map(x=>x.toFixed(4)), 'lon', (Math.atan2(b1[1],b1[0])*RAD).toFixed(2));
console.log('W rate', (moonOrientation(jd0+1).W - moonOrientation(jd0).W + 360)%360);
