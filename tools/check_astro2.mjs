import { dateToJD, skyState } from '../src/lib/astro.ts';
const site={lat:-89.67,lon:129.78,elevKm:0};
for (const iso of ['2026-11-14T12:00:00Z','2027-03-21T00:00:00Z','2027-08-09T06:00:00Z']) {
  const s=skyState(site,dateToJD(new Date(iso)));
  console.log(iso,'sun',s.sunAz.toFixed(3),s.sunEl.toFixed(3),'earth',s.earthAz.toFixed(3),s.earthEl.toFixed(3),'earth diam',(s.earthAngRadius*2*3600).toFixed(1));
}
