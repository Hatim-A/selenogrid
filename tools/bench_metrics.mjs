import { createServer } from 'vite'
import { readFileSync } from 'node:fs'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const m = await server.ssrLoadModule('/src/lib/metrics.ts')
  const data = JSON.parse(readFileSync('public/data/sites.json', 'utf8'))
  for (const cfg of [
    { startIso: '2026-11-14T12:00:00.000Z', days: 180, stepHours: 3 },
    { startIso: '2026-11-14T12:00:00.000Z', days: 365, stepHours: 1 },
  ]) {
    const t0 = performance.now()
    const list = m.computeSiteMetrics(data.sites, cfg)
    const ms = performance.now() - t0
    console.log(cfg.days + 'd/' + cfg.stepHours + 'h ->', ms.toFixed(0) + 'ms')
    for (const id of ['mons-mouton','malapert-massif','nobile-rim-2','haworth-rim','shackleton-floor']) {
      const r = list.find(x=>x.siteId===id)
      console.log(id, 'sun', r.sunlightPct.toFixed(1), 'earth', r.earthPct.toFixed(1), 'flux', (r.fluxMean*100).toFixed(1), 'sunset', r.nextSunset && ((r.nextSunset-r.start)/86400000).toFixed(1)+'d', 'sunrise', r.nextSunrise && ((r.nextSunrise-r.start)/86400000).toFixed(1)+'d')
    }
    // inspect first samples of mons
    const s = list.find(x=>x.siteId==='mons-mouton')
    for (let i=0;i<6;i++) {
      const x=s.samples[i*240]
      console.log(new Date(x.t).toISOString().slice(0,10), 'el',x.sunEl.toFixed(2),'az',x.sunAz.toFixed(0),'clear',x.sunClearance.toFixed(2),'vis',x.sunVisible)
    }
  }
} finally { await server.close() }
