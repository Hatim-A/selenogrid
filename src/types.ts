export type TerrainClass = 'massif' | 'rim' | 'ridge' | 'plain' | 'psr'

export interface SiteTile {
  size: number
  pixelM: number
  minM: number
  maxM: number
  base64: string
}

export interface Site {
  id: string
  name: string
  shortName: string
  region: string
  kind: 'nasa' | 'reference'
  terrainClass: TerrainClass
  lat: number
  lon: number
  elevationM: number
  slopeDeg: number
  aspectDeg: number
  openSkyFrac: number
  horizonMinDeg: number
  horizonMaxDeg: number
  horizonMeanDeg: number
  reliefM: number
  horizonDeg: number[]
  horizonDistKm: number[]
  tile: SiteTile
  color: string
  tags: string[]
  summary: string
  source: string
  sourceUrl?: string
}

export interface SiteDataset {
  generatedAt: string
  dem: {
    product: string
    resolutionM: number
    size: number
    source: string
    sourceUrl: string
    verticalDatum: string
  }
  sites: Site[]
}

export interface Scenario {
  /** ISO instant; the UI treats this as UTC. */
  startIso: string
  days: number
  stepHours: number
}

export interface SiteSample {
  t: number
  sunAz: number
  sunEl: number
  earthAz: number
  earthEl: number
  sunVisible: boolean
  earthVisible: boolean
  sunClearance: number
  earthClearance: number
  flux: number
}

export interface Window {
  start: number
  end: number
  /** True when the window is cut by the scenario boundary. */
  clipped: boolean
}

export interface DaySummary {
  t: number
  sunHours: number
  earthHours: number
  flux: number
}

export interface SiteMetrics {
  siteId: string
  start: number
  end: number
  stepMs: number
  samples: SiteSample[]
  days: DaySummary[]
  sunlightPct: number
  earthPct: number
  fluxMean: number
  meanSunEl: number
  meanEarthEl: number
  maxSunEl: number
  maxEarthEl: number
  longestSunHours: number
  longestEarthHours: number
  sunWindows: Window[]
  earthWindows: Window[]
  nextSunset: number | null
  nextSunrise: number | null
  nextEarthset: number | null
  nextEarthrise: number | null
  startSunVisible: boolean
  startEarthVisible: boolean
  startSunEl: number
  startEarthEl: number
  startSunAz: number
  startEarthAz: number
}

export type Weights = {
  sunlight: number
  comm: number
  flux: number
  slope: number
}

export type WeightKey = keyof Weights

export interface RankedSite {
  site: Site
  metrics: SiteMetrics
  score: number
  rank: number
  criteria: {
    sunlight: number
    comm: number
    flux: number
    slope: number
  }
  idealDistance: number
  worstDistance: number
}

export interface ParetoPoint {
  site: Site
  metrics: SiteMetrics
  onFrontier: boolean
}
